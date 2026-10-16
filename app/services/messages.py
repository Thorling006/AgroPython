from datetime import datetime


def menu(name: str) -> str:
    return f"""Hola {name} 👋
Soy AgroSmart 🌱

¿Qué deseas hacer?

1. Consultar sobre agricultura
2. Programar una actividad
3. Ver actividades pendientes
4. Ver actividades realizadas

Puedes responder con el número o escribir directamente lo que necesitas."""


def format_activities(rows: list[dict], completed: bool = False) -> str:
    if not rows:
        return "✅ No tienes actividades realizadas todavía." if completed else "📋 No tienes actividades pendientes actualmente."
    title = "✅ Actividades realizadas" if completed else "📋 Tus actividades pendientes"
    blocks = []
    for index, row in enumerate(rows, 1):
        raw_date = row.get("scheduled_date") or row.get("scheduled_at")
        try:
            when = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
            date_label, time_label = when.strftime("%d/%m/%Y"), when.strftime("%I:%M %p").lstrip("0")
        except (ValueError, TypeError):
            date_label, time_label = "Sin fecha", "Sin hora"
        kind = row.get("activity_type") or "Actividad"
        crop = row.get("crop_name") or row.get("description") or "Cultivo"
        blocks.append(f"{index}. {kind} - {crop}\n   📅 {date_label}\n   🕐 {time_label}")
    return title + "\n\n" + "\n\n".join(blocks)

