from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from pathlib import Path
import bcrypt
from langdetect import detect

USERS_FILE = Path("users.json")
CONVO_FILE = Path("conversations.json")

import requests

def search_trusted_sources(query):
    api_key = os.getenv("GOOGLE_CSE_API_KEY")
    engine_id = os.getenv("GOOGLE_CSE_ENGINE_ID")
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "q": query,
        "cx": engine_id,
        "key": api_key,
        "num": 3
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        items = data.get("items", [])

        print("🔍 [Search Used] ✅")
        print(f"🔑 Query: {query}")
        for item in items:
            print(f"- {item['title']} → {item['link']}")

        if not items:
            return "Üzr istəyirik, uyğun rəsmi hüquqi mənbə tapılmadı. https://e-qanun.az saytında əl ilə axtarış edə bilərsiniz."
        
        result = "Sualınıza uyğun ola biləcək rəsmi hüquqi mənbələr:\n\n"
        for item in items:
            result += f"- {item['title']}\n  {item['link']}\n\n"
        return result.strip()
    except Exception as e:
        print("❌ Google Search Error:", e)
        return "Axtarış zamanı xəta baş verdi. Zəhmət olmasa bir qədər sonra yenidən cəhd edin."


TRUSTED_SOURCES = {
    "az": "https://e-qanun.az",
    "en": "https://www.law.cornell.edu/",
    "de": "https://www.gesetze-im-internet.de/",
    "ru": "http://www.consultant.ru/"
}


app = Flask(__name__, static_folder='static')
app.secret_key = "secret123"
app.debug = True

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_MODEL = "gpt-4o-mini"

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
    conversations.setdefault(uid, {}).setdefault(cid, []).append({
        "role": role,
        "content": content
    })
    save_conversations(conversations)

def list_user_chats(user_id):
    conversations = load_conversations()
    return [
    {"id": cid, "name": chat_data.get("name", cid)}
    for cid, chat_data in conversations.get(str(user_id), {}).items()
]

def get_chat_messages(user_id, chat_id):
    conversations = load_conversations()
    return conversations.get(str(user_id), {}).get(chat_id, [])


users = load_users()

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

    # Handle both old and new formats
    if isinstance(chat_data, list):
        return jsonify({"messages": chat_data})
    else:
        return jsonify({"messages": chat_data.get("messages", [])})


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

    if uid not in conversations:
        conversations[uid] = {}

    conversations[uid][chat_id] = {
        "name": name,
        "messages": messages
    }

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
        if language == "az":
            answer = search_trusted_sources(user_question)
        else:
            language = detect(user_question)
            print("🔤 Detected language:", language)

            if language in TRUSTED_SOURCES:
                source = TRUSTED_SOURCES[language]
                answer = (
                    f"Bu hüquqi məsələ ilə bağlı dəqiq məlumat üçün rəsmi mənbəyə baxın: {source}"
                    if language == "az" else
                    f"Please consult the official legal source for accurate information: {source}"
                )
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

    user_id, user_data = next(
        ((uid, u) for uid, u in users.items() if u.get("email") == email),
        (None, None)
    )

    if not user_data:
        errors["email"] = "Email not found"
    elif not bcrypt.checkpw(password.encode('utf-8'), user_data["password"].encode('utf-8')):
        errors["password"] = "Incorrect password"

    if errors:
        return jsonify(success=False, errors=errors)

    session.clear()
    session.permanent = data.get("remember", False)  # <- this line is new
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

if __name__ == "__main__":
    app.run(debug=True)
