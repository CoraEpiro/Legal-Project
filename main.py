from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from langdetect import detect, LangDetectException
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from openai import OpenAI
from pathlib import Path
import requests
import bcrypt
import json
import os
import re
from flask_dance.contrib.google import make_google_blueprint, google

def detect_language_fallback(text):
    try:
        special_az_chars = ["ə", "ğ", "ı", "ö", "ç", "ş", "ü"]
        if any(char in text.lower() for char in special_az_chars):
            return "az"
        if len(text.split()) < 6:
            return "az"
        return detect(text)
    except LangDetectException:
        return "az"

USERS_FILE = Path("users.json")
CONVO_FILE = Path("conversations.json")

TRUSTED_SOURCES = {
    "az": "https://e-qanun.az",
    "en": "https://www.law.cornell.edu/",
    "de": "https://www.gesetze-im-internet.de/",
    "ru": "http://www.consultant.ru/"
}

app = Flask(__name__, static_folder='static')
app.secret_key = "secret123"
app.debug = True
app.config["SESSION_COOKIE_SECURE"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Remove in production

google_bp = make_google_blueprint(
    client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirect_to="google_login",
    scope=[
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid"
    ]
)


app.register_blueprint(google_bp, url_prefix="/login")

@app.route("/google")
def google_login():
    if not google.authorized:
        return redirect(url_for("google.login"))
    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        return "Failed to fetch user info", 400
    info = resp.json()
    email = info.get("email")
    username = info.get("name") or email.split("@")[0]

    users = load_users()
    user_id = None
    for uid, data in users.items():
        if data.get("email") == email:
            user_id = uid
            break

    if user_id is None:
        new_id = str(max(map(int, users.keys())) + 1) if users else "1"
        users[new_id] = {
            "username": username,
            "name": username,
            "surname": "",
            "email": email,
            "password": ""
        }
        save_users(users)
        user_id = new_id

    session.clear()
    session["user_id"] = user_id
    session["username"] = username
    return redirect(url_for("home"))

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_MODEL = "gpt-4o-mini"

def search_trusted_sources(question, original_question):
    api_key = os.getenv("GOOGLE_CSE_API_KEY")
    engine_id = os.getenv("GOOGLE_CSE_ENGINE_ID")
    url = "https://www.googleapis.com/customsearch/v1"

    queries = break_into_subqueries(question)
    collected_text = ""
    seen_links = set()

    for subquery in queries:
        params = {"q": subquery, "cx": engine_id, "key": api_key, "num": 2}
        try:
            response = requests.get(url, params=params)
            data = response.json()
            items = data.get("items", [])
            print("🔍 Subquery:", subquery)

            for item in items:
                link = item.get("link")
                if link and link not in seen_links:
                    seen_links.add(link)
                    snippet = fetch_legal_snippets(link)
                    if snippet:
                        collected_text += snippet + "\n"
        except Exception as e:
            print("❌ CSE Error for", subquery, str(e))

    if not collected_text.strip():
        return ("Üzr istəyirik, uyğun rəsmi hüquqi mənbə tapılmadı. "
                "https://e-qanun.az saytında əl ilə axtarış edə bilərsiniz.\n"
                "Əlavə olaraq, Mülki Məcəlləyə baxa bilərsiniz: https://e-qanun.az/framework/8")

    explanation = explain_snippets(original_question, collected_text)
    return explanation


def load_users():
    if USERS_FILE.exists():
        try:
            with open(USERS_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def load_conversations():
    if CONVO_FILE.exists():
        try:
            with open(CONVO_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_conversations(data):
    with open(CONVO_FILE, "w") as f:
        json.dump(data, f, indent=2)

def save_message(user_id, chat_id, role, content):
    conversations = load_conversations()
    uid = str(user_id)
    cid = chat_id or "default"

    # Ensure proper structure
    conversations.setdefault(uid, {})

    # If chat exists and is a dict with 'messages', keep appending there
    if cid in conversations[uid] and isinstance(conversations[uid][cid], dict):
        conversations[uid][cid].setdefault("messages", []).append({
            "role": role,
            "content": content
        })
    else:
        # fallback to legacy list format
        conversations[uid].setdefault(cid, []).append({
            "role": role,
            "content": content
        })

    save_conversations(conversations)


def list_user_chats(user_id):
    conversations = load_conversations()
    chat_dict = conversations.get(str(user_id), {})
    chats = []

    for cid, chat_data in chat_dict.items():
        if isinstance(chat_data, list):
            chats.append({"id": cid, "name": cid})  # fallback name
        elif isinstance(chat_data, dict):
            chats.append({"id": cid, "name": chat_data.get("name", cid)})
        else:
            chats.append({"id": cid, "name": cid})
    
    return chats


def get_chat_messages(user_id, chat_id):
    conversations = load_conversations()
    return conversations.get(str(user_id), {}).get(chat_id, [])

users = load_users()

def break_into_subqueries(question):
    chunks = []
    if "yaş" in question or "uşaq" in question:
        chunks.append("14 yaşında uşağın əməliyyat qabiliyyəti")
    if "icazə" in question or "valideyn" in question:
        chunks.append("valideyn icazəsi olmadan əqd")
    if "telefon" in question or "pul" in question:
        chunks.append("azyaşlının hədiyyə ilə telefon alması")
    if "geri qaytarmaq" in question:
        chunks.append("uşağın etdiyi əqdin ləğvi və geri qaytarılması")
    if not chunks:
        chunks.append(extract_keywords(question))
    return chunks

@app.route("/")
def home():
    user_id = session.get("user_id")
    users = load_users()
    user = users.get(user_id) if user_id else None
    user_messages = []

    if user_id and user:
        conversations = load_conversations()
        chat_dict = conversations.get(str(user_id), {})
        first_chat_id = next(iter(chat_dict), "default")
        user_messages = chat_dict.get(first_chat_id, [])

    return render_template("index.html", user=user, messages=user_messages, username=session.get("username"))

@app.route("/api/chats")
def list_chats():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({"chats": list_user_chats(user_id)})

@app.route("/api/chat/<chat_id>")
def get_chat(chat_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403

    conversations = load_conversations()
    user_chats = conversations.get(str(user_id), {})
    chat_data = user_chats.get(chat_id)
    if not chat_data:
        return jsonify({"messages": []})

    return jsonify({"messages": chat_data if isinstance(chat_data, list) else chat_data.get("messages", [])})

@app.route("/api/delete_chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403
    conversations = load_conversations()
    uid = str(user_id)
    if uid in conversations and chat_id in conversations[uid]:
        del conversations[uid][chat_id]
        save_conversations(conversations)
    return jsonify(success=True)

@app.route("/api/save_chat", methods=["POST"])
def save_chat():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    chat_id = data.get("chat_id")
    name = data.get("name", "").strip()
    messages = data.get("messages", [])

    if not chat_id or not name:
        return jsonify({"error": "Invalid input"}), 400

    conversations = load_conversations()
    uid = str(user_id)
    conversations.setdefault(uid, {})[chat_id] = {"name": name, "messages": messages}
    save_conversations(conversations)
    return jsonify(success=True)

@app.route("/ask", methods=["POST"])
def ask():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    user_question = data.get("question", "")
    chat_id = data.get("chat_id") or "default"

    if not user_question:
        return jsonify({"error": "No question provided"}), 400

    try:
        language = detect_language_fallback(user_question)
        print("🔤 Detected language:", language)

        if language == "az":
            simplified_query = extract_keywords(user_question)
            print("🔎 Simplified Query:", simplified_query)
            answer = search_trusted_sources(simplified_query, user_question)
        elif language in TRUSTED_SOURCES:
            source = TRUSTED_SOURCES[language]
            answer = f"Please consult the official legal source: {source}"
        else:
            answer = "Sorry, I can only handle Azerbaijani, English, German, and Russian legal questions."

        save_message(user_id, chat_id, "user", user_question)
        save_message(user_id, chat_id, "bot", answer)
        return jsonify({"answer": answer})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    errors = {}
    users = load_users()

    user_id, user_data = next(((uid, u) for uid, u in users.items() if u.get("email") == email), (None, None))

    if not user_data:
        errors["email"] = "Email not found"
    elif not bcrypt.checkpw(password.encode('utf-8'), user_data["password"].encode('utf-8')):
        errors["password"] = "Incorrect password"

    if errors:
        return jsonify(success=False, errors=errors)

    session.clear()
    session.permanent = data.get("remember", False)
    session["user_id"] = user_id
    session["username"] = user_data["username"]

    return jsonify(success=True, redirect_url=url_for("home"))

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    if request.content_type == "application/json":
        data = request.get_json()
        errors = {}
        users = load_users()

        name = data.get("name", "").strip()
        surname = data.get("surname", "").strip()
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")
        repassword = data.get("repassword", "")

        if not name:
            errors["name"] = "Required"
        if not surname:
            errors["surname"] = "Required"
        if not username:
            errors["username"] = "Required"
        elif any(u.get("username") == username for u in users.values()):
            errors["username"] = "Username already taken"
        if not validate_email(email):
            errors["email"] = "Invalid email format"
        elif any(u.get("email") == email for u in users.values()):
            errors["email"] = "Email already registered"
        if password != repassword:
            errors["repassword"] = "Passwords do not match"
        if not validate_password(password):
            errors["password"] = "Password too weak (8+ chars, 1 upper, 1 lower, 1 number)"

        if errors:
            return jsonify(success=False, errors=errors)

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_id = str(max(map(int, users.keys())) + 1) if users else "1"

        users[new_id] = {
            "username": username,
            "name": name,
            "surname": surname,
            "email": email,
            "password": hashed_pw
        }

        save_users(users)
        session.clear()
        session["user_id"] = new_id
        session["username"] = username
        return jsonify(success=True, redirect_url=url_for("home"))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

def validate_email(email):
    return email.endswith("@gmail.com") or email.endswith("@outlook.com") or email.endswith("@ada.edu.az")

def validate_password(pw):
    return (
        len(pw) >= 8 and
        any(c.islower() for c in pw) and
        any(c.isupper() for c in pw) and
        any(c.isdigit() for c in pw)
    )

def extract_keywords(text):
    text = text.lower()
    words = re.findall(r'\b\w{4,}\b', text)
    blacklist = {"nədir", "olaraq", "buna", "üçün", "kimi", "belə", "amma", "çünki", "var"}
    return " ".join(w for w in words if w not in blacklist)

def fetch_legal_snippets(url):
    try:
        if "e-qanun.az" in url and "/framework/" in url:
            return fetch_eqanun_framework(url)

        response = requests.get(url, timeout=5)
        soup = BeautifulSoup(response.content, "html.parser")
        paragraphs = soup.find_all(["p", "div", "span"])
        text = "\n".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
        return text[:2000]

    except Exception as e:
        print("⚠️ Failed to extract from:", url, str(e))
        return ""

def explain_snippets(question, extracted_text):
    messages = [
        {"role": "system", "content": "You are a legal assistant. Only explain based on the provided Azerbaijani legal content. Do not invent facts."},
        {"role": "user", "content": f"Sual: {question}\n\nMənbə:\n{extracted_text}"}
    ]
    try:
        response = client.chat.completions.create(model=_MODEL, messages=messages)
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("❌ GPT Error:", e)
        return "Cavab yaradılarkən xəta baş verdi."
    
def fetch_eqanun_framework(url):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/113.0.0.0 Safari/537.36"
        )
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Try various selectors that might contain the content
        possible_ids = ["zoomDocumentContainer", "sectonText", "__next"]
        for pid in possible_ids:
            section = soup.find("div", id=pid)
            if section and section.get_text(strip=True):
                print(f"✅ Found content in div#{pid}")
                return section.get_text(separator=" ", strip=True)[:2000]

        # Fallback: Get all paragraphs with enough length
        paragraphs = soup.find_all(["p", "div", "span"])
        text_chunks = [
            p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50
        ]
        final = "\n".join(text_chunks).strip()

        if final:
            print("✅ Fallback paragraph method worked.")
            return final[:2000]
        else:
            print("❌ No usable text found on page.")
            return ""

    except Exception as e:
        print("❌ Exception while fetching:", e)
        return ""


if __name__ == "__main__":
    app.run(debug=True, port=5050)