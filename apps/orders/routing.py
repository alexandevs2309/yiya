from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/kitchen/$", consumers.KitchenConsumer.as_asgi()),
    re_path(r"ws/waitress/(?P<user_id>[0-9a-f-]+)/$", consumers.WaitressConsumer.as_asgi()),
]
