import json
from pathlib import Path

USERS_FILE = Path("users.json")
CONVO_FILE = Path("conversations.json")

def load_users():
    try: return json.load(open(USERS_FILE))
    except: return {}

def save_users(users): json.dump(users, open(USERS_FILE, "w"), indent=2)

def load_conversations():
    try: return json.load(open(CONVO_FILE))
    except: return {}

def save_conversations(data): json.dump(data, open(CONVO_FILE, "w"), indent=2)

def save_message(uid, chat_id, role, content):
    convos = load_conversations()
    uid, cid = str(uid), chat_id or "default"
    convos.setdefault(uid, {})
    if cid in convos[uid] and isinstance(convos[uid][cid], dict):
        convos[uid][cid].setdefault("messages", []).append({"role": role, "content": content})
    else:
        convos[uid].setdefault(cid, []).append({"role": role, "content": content})
    save_conversations(convos)

def list_user_chats(uid):
    chats = []
    for cid, cdata in load_conversations().get(str(uid), {}).items():
        chats.append({"id": cid, "name": cdata.get("name", cid) if isinstance(cdata, dict) else cid})
    return chats
