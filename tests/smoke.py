"""Dependency-light smoke checks that can run with `python tests/smoke.py`."""

from datetime import datetime
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.activity_parser import parse_activity
from app.services.datetime_parser import parse_spanish_datetime
from app.services.intent import classify_intent
from app.services.phone import normalize_phone

now = datetime(2026, 8, 28, 15, 0, tzinfo=ZoneInfo("America/El_Salvador"))

assert classify_intent("Hola") == "menu"
assert classify_intent("1") == "agriculture"
assert classify_intent("2") == "create_activity"
assert classify_intent("3") == "list_activities"
assert classify_intent("4") == "list_completed"
assert classify_intent("Ya completé el riego") == "complete_activity"
assert normalize_phone("7360 3690") == "+50373603690"
assert parse_spanish_datetime("mañana a las 7 am", now).isoformat() == "2026-08-29T07:00:00-06:00"
assert parse_spanish_datetime("hoy a las 8 am", now) is None
draft = parse_activity("Quiero regar maíz mañana a las 8 am", now)
assert draft.activity_type == "Riego"
assert draft.crop_name == "Maiz"
assert draft.scheduled_at.hour == 8
assert parse_activity("regar mañana a las 8 pm", now).crop_name is None

print("AgroPython smoke tests: OK")
