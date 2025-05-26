import os, json, bcrypt
from flask import redirect, session, url_for
from flask_dance.contrib.google import make_google_blueprint, google
from conversation import load_users, save_users

google_bp = make_google_blueprint(
    client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirect_to="login_google",
    scope=[
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
    ]
)

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

def google_login():
    print(google_bp.redirect_url)  # Add this temporarily in your code
    if not google.authorized:
        return redirect(url_for("google.login"))
    info = google.get("/oauth2/v2/userinfo").json()
    email = info.get("email")
    name = info.get("name") or email.split("@")[0]
    users = load_users()
    for uid, u in users.items():
        if u["email"] == email:
            session.update({"user_id": uid, "username": u["username"]})
            return redirect(url_for("home"))
    new_id = str(max(map(int, users.keys())) + 1) if users else "1"
    users[new_id] = {"username": name, "name": name, "surname": "", "email": email, "password": ""}
    save_users(users)
    session.update({"user_id": new_id, "username": name})
    return redirect(url_for("home"))
