"""
Middleware de autenticación JWT para Django Channels (WebSocket).

Extrae el token JWT del query string (?token=xxx) y autentica al usuario.
Si el token es inválido o ausente, asigna AnonymousUser.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


@database_sync_to_async
def get_user_from_token(token_str: str):
    """Valida un JWT access token y retorna el usuario correspondiente."""
    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        from apps.accounts.models import User
        return User.objects.get(id=user_id)
    except (TokenError, Exception):
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Middleware que lee ?token=<JWT> del query string y pobla scope["user"].
    
    Uso en asgi.py:
        TokenAuthMiddleware(URLRouter(websocket_urlpatterns))
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
