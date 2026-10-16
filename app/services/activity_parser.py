import re

from app.models import ActivityDraft
from app.services.datetime_parser import parse_spanish_datetime
from app.services.intent import normalized

ACTIVITY_TYPES = {
    "Riego": r"\b(regar|riego)\b",
    "Abonado": r"\b(abonar|abono|echarle abono)\b",
    "Fertilización": r"\b(fertilizar|fertilizacion)\b",
    "Poda": r"\b(podar|poda)\b",
    "Fumigación": r"\b(fumigar|fumigacion)\b",
    "Cosecha": r"\b(cosechar|cosecha)\b",
}
KNOWN_CROPS = ["maiz", "frijol", "tomate", "tomates", "cafe", "arroz", "fresa", "fresas", "papa", "papas", "chile", "cebolla", "lechuga", "pepino", "sorgo", "caña", "cana"]


def parse_activity(text: str, now=None) -> ActivityDraft:
    msg = normalized(text)
    activity_type = next((name for name, pattern in ACTIVITY_TYPES.items() if re.search(pattern, msg)), None)
    crop = next((crop for crop in KNOWN_CROPS if re.search(rf"\b{re.escape(crop)}\b", msg)), None)
    scheduled_at = parse_spanish_datetime(text, now=now)
    clean = re.sub(r"\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b", "", msg)
    clean = re.sub(r"\b(a las?|de la (manana|tarde|noche))\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip(" ,.-")
    return ActivityDraft(activity_type=activity_type, crop_name=crop.title() if crop else None, description=clean or None, scheduled_at=scheduled_at)

