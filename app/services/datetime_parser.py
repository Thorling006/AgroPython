import re
import unicodedata
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta, MO, TU, WE, TH, FR, SA, SU

WEEKDAYS = {"lunes": MO, "martes": TU, "miercoles": WE, "jueves": TH, "viernes": FR, "sabado": SA, "domingo": SU}


def _plain(text: str) -> str:
    value = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def parse_spanish_datetime(text: str, now: datetime | None = None, tz_name: str = "America/El_Salvador") -> datetime | None:
    tz = ZoneInfo(tz_name)
    now = now.astimezone(tz) if now else datetime.now(tz)
    msg = _plain(text)
    base = now.date()
    if "pasado manana" in msg:
        base += timedelta(days=2)
    elif "manana" in msg:
        base += timedelta(days=1)
    elif "hoy" in msg:
        pass
    else:
        found_day = next((name for name in WEEKDAYS if re.search(rf"\b{name}\b", msg)), None)
        if found_day:
            base = (now + relativedelta(weekday=WEEKDAYS[found_day](+1))).date()
        else:
            match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", msg)
            if not match:
                return None
            day, month = int(match.group(1)), int(match.group(2))
            year = int(match.group(3)) if match.group(3) else now.year
            year += 2000 if year < 100 else 0
            try:
                base = datetime(year, month, day).date()
            except ValueError:
                return None

    time_match = re.search(r"\b(?:a\s+las?\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)?\b", msg)
    if not time_match:
        return None
    hour = int(time_match.group(1))
    minute = int(time_match.group(2) or 0)
    marker = (time_match.group(3) or "").replace(".", "").replace(" ", "")
    if marker == "pm" and hour < 12:
        hour += 12
    if marker == "am" and hour == 12:
        hour = 0
    if not marker:
        if "tarde" in msg and hour < 12:
            hour += 12
        elif "noche" in msg and hour < 12:
            hour += 12
    if hour > 23 or minute > 59:
        return None
    result = datetime.combine(base, datetime.min.time(), tzinfo=tz).replace(hour=hour, minute=minute)
    return result if result > now else None

