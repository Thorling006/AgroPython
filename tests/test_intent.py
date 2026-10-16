from app.services.intent import classify_intent, is_global_cancel, is_thanks


def test_menu_and_options():
    assert classify_intent("Hola") == "menu"
    assert classify_intent("1") == "agriculture"
    assert classify_intent("2") == "create_activity"
    assert classify_intent("3") == "list_activities"
    assert classify_intent("4") == "list_completed"


def test_natural_activity():
    assert classify_intent("Quiero regar maíz mañana") == "create_activity"
    assert is_global_cancel("menú")
    assert is_thanks("Muchas gracias")

