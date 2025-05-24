from flask import Flask, render_template, session, redirect, url_for, request, jsonify
from config import app, client, _MODEL
from auth import google_login, google_bp, load_users
from conversation import save_message, list_user_chats, load_conversations, load_users, save_conversations
from legal_search import detect_language_fallback, search_trusted_sources
from utils import TRUSTED_SOURCES
from auth_routes import auth_bp  # adjust path as needed


app.register_blueprint(google_bp, url_prefix="/login")
app.register_blueprint(auth_bp)

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

@app.route("/google")
def login_google(): return google_login()

@app.route("/api/chats")
def get_chats():
    uid = session.get("user_id")
    return jsonify({"chats": list_user_chats(uid)})

@app.route("/api/chat/<chat_id>")
def get_chat(chat_id):
    uid = session.get("user_id")
    convos = load_conversations()
    messages = convos.get(str(uid), {}).get(chat_id, [])
    return jsonify({"messages": messages if isinstance(messages, list) else messages.get("messages", [])})

@app.route("/api/delete_chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    uid = session.get("user_id")
    convos = load_conversations()
    convos.get(str(uid), {}).pop(chat_id, None)
    save_conversations(convos)
    return jsonify(success=True)

@app.route("/api/save_chat", methods=["POST"])
def save_chat():
    data = request.get_json()
    uid = str(session["user_id"])
    chat_id = data["chat_id"]
    name = data["name"]
    messages = data["messages"]
    convos = load_conversations()
    convos.setdefault(uid, {})[chat_id] = {"name": name, "messages": messages}
    save_conversations(convos)
    return jsonify(success=True)

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    user_question = data["question"]
    chat_id = data.get("chat_id", "default")
    uid = session.get("user_id")
    lang = detect_language_fallback(user_question)
    if lang == "az":
        answer = search_trusted_sources(user_question, user_question)
    elif lang in TRUSTED_SOURCES:
        answer = f"Please consult the official legal source: {TRUSTED_SOURCES[lang]}"
    else:
        answer = "Sorry, only Azerbaijani, English, German, and Russian are supported."
    save_message(uid, chat_id, "user", user_question)
    save_message(uid, chat_id, "bot", answer)
    return jsonify({"answer": answer})

if __name__ == "__main__":
    app.run(debug=True, port=5050)