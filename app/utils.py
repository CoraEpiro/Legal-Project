import re

TRUSTED_SOURCES = {
    "az": "https://e-qanun.az",
    "en": "https://www.law.cornell.edu/",
    "de": "https://www.gesetze-im-internet.de/",
    "ru": "http://www.consultant.ru/"
}

def extract_keywords(text):
    words = re.findall(r'\b\w{4,}\b', text.lower())
    blacklist = {"nədir", "olaraq", "buna", "üçün", "kimi", "belə", "amma", "çünki", "var"}
    return " ".join(w for w in words if w not in blacklist)

def validate_email(email):
    return any(email.endswith(d) for d in ["@gmail.com", "@outlook.com", "@ada.edu.az"])

def validate_password(pw):
    return (
        len(pw) >= 8 and any(c.islower() for c in pw)
        and any(c.isupper() for c in pw) and any(c.isdigit() for c in pw)
    )
