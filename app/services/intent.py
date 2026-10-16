import re
import unicodedata


def normalized(text: str) -> str:
    value = unicodedata.normalize("NFD", text.lower().strip())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", value)


def classify_intent(text: str) -> str:
    msg = normalized(text)
    if re.fullmatch(r"hola|buenas|buenos dias|buenas tardes|buenas noches|menu|inicio", msg):
        return "menu"
    if msg == "1" or re.search(r"\b(agricultura|agricola|plaga|enfermedad|cultivar|plantar|sembrar)\b", msg):
        return "agriculture"
    if re.search(r"\b(ya|complete|completado|realice|realizado|termine|hecho|listo)\b.*\b(regue|riego|abone|abonado|fertilice|pode|fumigue|coseche|actividad)\b", msg):
        return "complete_activity"
    if msg == "2" or re.search(r"\b(programar|agendar|crear)\b.*\b(actividad|riego|abono|fumigacion|cosecha)\b", msg):
        return "create_activity"
    if msg == "3" or re.search(r"\b(ver|listar|consultar|mis)\b.*\b(actividad|pendiente)", msg):
        return "list_activities"
    if msg == "4" or re.search(r"\b(realizadas?|completadas?|terminadas?)\b", msg):
        return "list_completed"
    if re.search(r"\b(regar|abonar|fertilizar|podar|fumigar|cosechar)\b", msg):
        return "create_activity"
    return "menu"


def is_global_cancel(text: str) -> bool:
    return normalized(text) in {"cancelar", "salir", "menu", "inicio"}


def is_thanks(text: str) -> bool:
    return bool(re.fullmatch(r"(ok )?(muchas )?gracias( por (la )?ayuda)?[.!]?", normalized(text)))

