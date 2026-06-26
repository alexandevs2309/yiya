import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class _UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


def _dumps(data):
    return json.dumps(data, cls=_UUIDEncoder)


class KitchenConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return
        self.group_name = "kitchen"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def kitchen_update(self, event):
        await self.send(text_data=_dumps(event["data"]))


class WaitressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return

        self.user_id = self.scope["url_route"]["kwargs"]["user_id"]

        # Verificar que el user_id de la URL coincide con el usuario autenticado
        if str(user.id) != str(self.user_id):
            await self.close()
            return

        self.personal_group = f"waitress_{self.user_id}"
        self.kitchen_group = "kitchen"

        await self.channel_layer.group_add(self.personal_group, self.channel_name)
        await self.channel_layer.group_add(self.kitchen_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        await self.channel_layer.group_discard(self.kitchen_group, self.channel_name)

    async def item_ready(self, event):
        await self.send(text_data=_dumps(event["data"]))

    async def kitchen_update(self, event):
        await self.send(text_data=_dumps(event["data"]))

    async def ecf_approved(self, event):
        await self.send(text_data=_dumps(event["data"]))

