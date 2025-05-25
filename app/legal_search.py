import requests, re, os
from bs4 import BeautifulSoup
from config import client, _MODEL
from utils import extract_keywords
import fitz  # PyMuPDF
from io import BytesIO

def extract_pdf_text_from_bytes(pdf_bytes):
    try:
        with fitz.open("pdf", pdf_bytes) as doc:
            text = ""
            for page in doc:
                text += page.get_text()
            return text.strip()[:2000]  # trim to avoid GPT overload
    except Exception as e:
        print("❌ PDF parsing failed:", e)
        return ""

def beautify_legal_response(text):
    import re

    # 1. Convert **bold** to <strong>
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)

    # 2. Find and clean numbered lines (e.g., "1. something") and strip their leading numbers
    items = re.findall(r'\d+\.\s+.*?(?=\n\d+\.|\Z)', text, re.DOTALL)
    if len(items) >= 2:
        clean_items = [re.sub(r"^\d+\.\s*", "", item.strip()) for item in items]
        list_html = "<ol>" + "".join(f"<li>{item}</li>" for item in clean_items) + "</ol>"
        for item in items:
            text = text.replace(item, '')  # Remove original numbered block
        text += "<br>" + list_html

    # 3. Add <br> after full stops followed by capital letter
    text = re.sub(r'(?<=\.)\s+(?=[A-ZƏÜİÖĞÇŞ])', '<br>', text)

    return f"<div class='legal-answer'>{text.strip()}</div>"


def detect_language(text):
    response = client.chat.completions.create(
        model=_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a language detector. Only output the ISO 639-1 code (e.g. az, en, ru, de) for the language of the following message."
            },
            {
                "role": "user",
                "content": text
            }
        ],
        temperature=0,
    )
    return response.choices[0].message.content.strip().lower()


def is_azerbaijani_word_wiktionary(word):
    url = "https://az.wiktionary.org/w/api.php"
    params = {
        "action": "query",
        "titles": word.lower(),
        "format": "json"
    }

    try:
        res = requests.get(url, params=params, timeout=5)
        data = res.json()

        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return False

        # If page exists and not missing
        for page in pages.values():
            if "missing" not in page:
                return True
        return False

    except requests.RequestException:
        return False


def detect_language_fallback(text, country=None):
    try:
        # First, try actual language detection
        lang = detect_language(text)

        # If detection gives something valid, trust it
        if lang in {"az", "en", "ru", "de"}:
            return lang

        # Fallback: If detection returns "tl" or something weird, and user is from AZ
        if country == "AZ":
            words = text.strip().lower().split()
            for word in words:
                if is_azerbaijani_word_wiktionary(word):
                    return "az"

        return lang  # fallback to detected lang anyway

    except Exception as e:
        return "az" if country == "AZ" else "en"


def search_trusted_sources(query, original_question):
    engine_id = os.getenv("GOOGLE_CSE_ENGINE_ID")
    api_key = os.getenv("GOOGLE_CSE_API_KEY")
    base_url = "https://www.googleapis.com/customsearch/v1"
    subqueries = break_into_subqueries(query)

    snippets_with_sources = []
    seen = set()

    for q in subqueries:
        r = requests.get(base_url, params={"q": q, "cx": engine_id, "key": api_key})
        for item in r.json().get("items", [])[:2]:
            link = item["link"]
            if link not in seen:
                seen.add(link)
                snippet = fetch_legal_snippets(link)
                if snippet.strip():
                    snippets_with_sources.append((snippet, link))

    return explain_snippets(original_question, snippets_with_sources)

def fetch_legal_snippets(url):
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        content_type = response.headers.get("Content-Type", "")

        # ✅ If it's a PDF, extract text from it
        if "pdf" in content_type:
            print(f"📄 Extracting PDF content from: {url}")
            return extract_pdf_text_from_bytes(response.content)

        # ✅ Otherwise, parse HTML
        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        for tag_id in ["zoomDocumentContainer", "sectonText", "__next"]:
            section = soup.find("div", id=tag_id)
            if section:
                return section.get_text(separator=" ", strip=True)[:2000]

        for tag in ["main", "article"]:
            section = soup.find(tag)
            if section:
                return section.get_text(separator=" ", strip=True)[:2000]

        if soup.body:
            return soup.body.get_text(separator=" ", strip=True)[:2000]

        return ""

    except Exception as e:
        print("❌ Error extracting:", url, str(e))
        return ""


def explain_snippets(question, snippets_with_sources):
    # Create combined content
    sources_text = ""
    for i, (snippet, url) in enumerate(snippets_with_sources, 1):
        sources_text += f"[{i}] {url}\n"

    combined_snippets = "\n\n".join([f"[{i+1}] {s}" for i, (s, _) in enumerate(snippets_with_sources)])

    try:
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": "Use the following legal texts to answer the question. Reference sources like [1], [2] etc. at relevant places."},
                {"role": "user", "content": f"Question: {question}\n\nSources:\n{combined_snippets}"}
            ]
        )
        answer_body = response.choices[0].message.content.strip()
        final = beautify_legal_response(answer_body)

        # Add source list below
        final += "<br><br><div class='legal-sources'><strong>Sources:</strong><ul>"
        for i, (_, url) in enumerate(snippets_with_sources, 1):
            final += f"<li>[{i}] <a href='{url}' target='_blank'>{url}</a></li>"
        final += "</ul></div>"

        return final

    except Exception as e:
        print("GPT explanation failed:", e)
        return "❌ Error creating explanation."

def break_into_subqueries(q):
    queries = []
    if "yaş" in q or "uşaq" in q: queries.append("14 yaşında uşağın əməliyyat qabiliyyəti")
    if "icazə" in q: queries.append("valideyn icazəsi olmadan əqd")
    if "pul" in q: queries.append("azyaşlının hədiyyə ilə telefon alması")
    if "geri qaytar" in q: queries.append("əqdin ləğvi və geri qaytarılması")
    return queries or [extract_keywords(q)]

def is_legal_question(text):
    prompt = f"""
You are a classifier. Your only job is to decide if the following message is a legal question.

Message: "{text}"

If it is about laws, rights, penalties, taxes, courts, or regulations, answer YES.
If it is general chat, opinions, or greetings, answer NO.

Just reply with YES or NO.
"""

    response = client.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    decision = response.choices[0].message.content.strip().lower()
    return decision.startswith("yes")
