import re


def normalize_phone(value: str, default_country_code: str = "503") -> str:
    digits = re.sub(r"\D", "", value or "")
    if not digits:
        raise ValueError("El teléfono está vacío")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 8:
        digits = f"{default_country_code}{digits}"
    if len(digits) < 10 or len(digits) > 15:
        raise ValueError("El teléfono no tiene un formato internacional válido")
    return f"+{digits}"


def meta_phone(value: str) -> str:
    return normalize_phone(value).lstrip("+")

