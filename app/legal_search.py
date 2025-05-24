import requests, re, os
from bs4 import BeautifulSoup
from config import client, _MODEL
from utils import extract_keywords

def detect_language_fallback(text):
    from langdetect import detect, LangDetectException
    try:
        if any(c in text.lower() for c in "əğışçöü"):
            return "az"
        return detect(text)
    except LangDetectException:
        return "az"

def search_trusted_sources(query, original_question):
    engine_id = os.getenv("GOOGLE_CSE_ENGINE_ID")
    api_key = os.getenv("GOOGLE_CSE_API_KEY")
    base_url = "https://www.googleapis.com/customsearch/v1"
    subqueries = break_into_subqueries(query)
    snippets, seen = "", set()
    for q in subqueries:
        r = requests.get(base_url, params={"q": q, "cx": engine_id, "key": api_key})
        for item in r.json().get("items", [])[:2]:
            link = item["link"]
            if link not in seen:
                seen.add(link)
                snippets += fetch_legal_snippets(link) + "\n"
    return explain_snippets(original_question, snippets or "e-qanun.az")

def fetch_legal_snippets(url):
    try:
        html = requests.get(url, headers={"User-Agent": "Mozilla"}).text
        soup = BeautifulSoup(html, "html.parser")
        for tag_id in ["zoomDocumentContainer", "sectonText", "__next"]:
            section = soup.find("div", id=tag_id)
            if section:
                return section.get_text(separator=" ", strip=True)[:2000]
        return ""
    except Exception as e:
        print("❌ Error extracting:", url, str(e))
        return ""

def explain_snippets(question, content):
    try:
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[{"role": "system", "content": "Explain only using trusted Azerbaijani legal sources."},
                      {"role": "user", "content": f"Sual: {question}\n\nMənbə:\n{content}"}])
        return response.choices[0].message.content.strip()
    except:
        return "Cavab yaradılarkən xəta baş verdi."

def break_into_subqueries(q):
    queries = []
    if "yaş" in q or "uşaq" in q: queries.append("14 yaşında uşağın əməliyyat qabiliyyəti")
    if "icazə" in q: queries.append("valideyn icazəsi olmadan əqd")
    if "pul" in q: queries.append("azyaşlının hədiyyə ilə telefon alması")
    if "geri qaytar" in q: queries.append("əqdin ləğvi və geri qaytarılması")
    return queries or [extract_keywords(q)]
