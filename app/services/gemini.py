import httpx

from app.config import get_settings

SYSTEM_PROMPT = """Eres AgroSmart, un asistente virtual especializado en agricultura.
Responde en español claro, breve y práctico sobre siembra, riego, fertilización,
plagas, enfermedades, cosecha y manejo de cultivos. No inventes datos. Si falta
información esencial, pide únicamente lo necesario. No muestres el menú ni
modifiques datos."""


class GeminiClient:
    async def answer(self, question: str, context: str = "") -> str:
        cfg = get_settings()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cfg.gemini_model}:generateContent?key={cfg.gemini_api_key}"
        prompt = f"{SYSTEM_PROMPT}\n\nContexto previo:\n{context}\n\nConsulta:\n{question}"
        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.3, "maxOutputTokens": 450}}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    async def chat(self, message: str, history: list[dict[str, str]], mode: str = "agriculture", page_context: str = "") -> str:
        if mode == "jarvis":
            instruction = SYSTEM_PROMPT + """
Actúa como el asistente breve del panel web. Puedes incluir estas etiquetas cuando correspondan:
[NAVIGATE:ruta], [SET_FIELD: id=\"valor\"], [LOCATE_MAP] y [SLEEP].
No inventes capacidades ni afirmes que una acción se completó si solo estás dando instrucciones."""
        else:
            instruction = SYSTEM_PROMPT
        context_lines = []
        for item in history[-10:]:
            role = "Usuario" if item.get("role") == "user" else "AgroSmart"
            content = str(item.get("content", ""))[:1500]
            context_lines.append(f"{role}: {content}")
        context = "\n".join(context_lines)
        if page_context:
            context += f"\nPantalla actual: {page_context}"
        cfg = get_settings()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cfg.gemini_model}:generateContent?key={cfg.gemini_api_key}"
        prompt = f"{instruction}\n\n{context}\nUsuario: {message}"
        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.35, "maxOutputTokens": 700}}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

