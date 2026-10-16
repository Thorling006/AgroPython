from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.datetime_parser import parse_spanish_datetime


def test_tomorrow_el_salvador():
    now = datetime(2026, 8, 28, 15, 0, tzinfo=ZoneInfo("America/El_Salvador"))
    result = parse_spanish_datetime("mañana a las 7 am", now)
    assert result == datetime(2026, 8, 29, 7, 0, tzinfo=ZoneInfo("America/El_Salvador"))


def test_rejects_past_time():
    now = datetime(2026, 8, 28, 15, 0, tzinfo=ZoneInfo("America/El_Salvador"))
    assert parse_spanish_datetime("hoy a las 8 am", now) is None

