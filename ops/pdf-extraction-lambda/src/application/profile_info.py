"""Evidence-bound profile transcription. Unknown facts remain null."""
import json
import re
import unicodedata

FACTS = ("birthDate", "age", "height", "education")
CAREER_FIELDS = ("title", "venue", "part", "genre", "period", "company")


def profile_schema():
    string = {"type": ["string", "null"]}
    fact = {"type": "object", "additionalProperties": False,
            "properties": {"value": string, "evidence": string}, "required": ["value", "evidence"]}
    career = {"type": "object", "additionalProperties": False,
              "properties": {**{key: string for key in CAREER_FIELDS}, "evidence": {"type": "string"}},
              "required": [*CAREER_FIELDS, "evidence"]}
    return {"type": ["object", "null"], "additionalProperties": False,
            "properties": {**{key: fact for key in FACTS},
                           "careers": {"type": "array", "maxItems": 50, "items": career}},
            "required": [*FACTS, "careers"]}


def normalized(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def clean_text(value, limit):
    return (isinstance(value, str) and bool(value.strip()) and len(value) <= limit
            and not any(unicodedata.category(c) == "Cc" and c not in "\n\r\t" for c in value))


def validate_profile(profile, text):
    if profile is None:
        return True
    if not isinstance(profile, dict) or set(profile) != {*FACTS, "careers"}:
        return False
    if len(json.dumps(profile, ensure_ascii=False).encode("utf-8")) > 256 * 1024:
        return False
    source = normalized(text)
    for key in FACTS:
        item = profile[key]
        if not isinstance(item, dict) or set(item) != {"value", "evidence"}:
            return False
        value, evidence = item["value"], item["evidence"]
        if value is None:
            if evidence is not None:
                return False
        elif (not clean_text(value, 300) or not clean_text(evidence, 1000)
              or normalized(evidence) not in source or normalized(value) not in normalized(evidence)):
            return False
    careers = profile["careers"]
    if not isinstance(careers, list) or len(careers) > 50:
        return False
    for career in careers:
        if not isinstance(career, dict) or set(career) != {*CAREER_FIELDS, "evidence"}:
            return False
        evidence = career["evidence"]
        if not clean_text(evidence, 1000) or normalized(evidence) not in source:
            return False
        # A row without a known work title is not a structured career.
        if career["title"] is None:
            return False
        for key in CAREER_FIELDS:
            value = career[key]
            if value is not None and (not clean_text(value, 300) or normalized(value) not in normalized(evidence)):
                return False
    return True
