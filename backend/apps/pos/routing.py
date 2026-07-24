from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/kds/$', consumers.KDSConsumer.as_asgi()),
    re_path(r'ws/orders/(?P<order_id>[^/]+)/$', consumers.OrderConsumer.as_asgi()),
    re_path(r'ws/waiters/$', consumers.WaiterConsumer.as_asgi()),
]
