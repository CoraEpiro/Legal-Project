import os
from flask import Flask
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("FLASK_SECRET_KEY", "devkey")
app.config.update(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_MODEL = "gpt-4o-mini"