from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.activity_parser import parse_activity


def test_complete_activity_message():
    now = datetime(2026, 8, 28, 15, 0, tzinfo=ZoneInfo("America/El_Salvador"))
    draft = parse_activity("Quiero regar maíz mañana a las 8 am", now)
    assert draft.activity_type == "Riego"
    assert draft.crop_name == "Maiz"
    assert draft.scheduled_at.hour == 8


def test_requires_crop():
    draft = parse_activity("regar mañana a las 8 pm")
    assert draft.activity_type == "Riego"
    assert draft.crop_name is None

