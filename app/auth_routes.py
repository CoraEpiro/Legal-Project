from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify
from conversation import load_users, save_users
from utils import validate_email, validate_password
import bcrypt

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")

    if request.content_type == "application/json":
        data = request.get_json()
        users = load_users()
        errors = {}

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
        elif any(u["username"] == username for u in users.values()):
            errors["username"] = "Username already taken"
        if not validate_email(email):
            errors["email"] = "Invalid email"
        elif any(u["email"] == email for u in users.values()):
            errors["email"] = "Email already registered"
        if password != repassword:
            errors["repassword"] = "Passwords do not match"
        if not validate_password(password):
            errors["password"] = "Password must be 8+ chars, include uppercase, lowercase and number"

        if errors:
            return jsonify(success=False, errors=errors)

        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
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


@auth_bp.route("/login", methods=["GET", "POST"])
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
    elif not bcrypt.checkpw(password.encode(), user_data["password"].encode()):
        errors["password"] = "Incorrect password"

    if errors:
        return jsonify(success=False, errors=errors)

    session.clear()
    session.permanent = data.get("remember", False)
    session["user_id"] = user_id
    session["username"] = user_data["username"]

    return jsonify(success=True, redirect_url=url_for("home"))