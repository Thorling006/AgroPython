import httpx

from app.config import get_settings
from app.services.phone import meta_phone


class WhatsAppClient:
    async def send_text(self, phone: str, text: str) -> str:
        cfg = get_settings()
        url = f"https://graph.facebook.com/{cfg.meta_graph_version}/{cfg.meta_phone_number_id}/messages"
        payload = {"messaging_product": "whatsapp", "to": meta_phone(phone), "type": "text", "text": {"preview_url": False, "body": text}}
        headers = {"Authorization": f"Bearer {cfg.meta_access_token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()["messages"][0]["id"]

