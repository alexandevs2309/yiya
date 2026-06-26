from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from unittest.mock import patch
from apps.accounts.models import User, Role
from apps.tables.models import Table, Zone
from apps.orders.models import Order, OrderItem
from apps.billing.models import ECFDocument, ECFType, ECFStatus
from decimal import Decimal

class OrdersTests(APITestCase):
    def setUp(self):
        self.waitress_user = User.objects.create_user(
            username="waitress_orders",
            password="password123",
            role=Role.WAITRESS
        )
        self.client.force_authenticate(user=self.waitress_user)
        self.zone = Zone.objects.create(name="Orders Zone")
        self.table = Table.objects.create(number=2, zone=self.zone, capacity=4)

    @patch("django.db.transaction.on_commit")
    def test_create_and_close_order_with_rnc(self, mock_on_commit):
        # 1. Create order
        url_create = reverse("order-list")
        create_data = {
            "table": str(self.table.id),
            "waitress": str(self.waitress_user.id),
            "diners": 2,
            "items": [
                {
                    "name": "Pescado Frito",
                    "unit_price": 500.00,
                    "quantity": 2,
                    "modifiers": ["Con tostones"]
                }
            ]
        }
        response = self.client.post(url_create, create_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data["id"]
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, "occupied")

        # 2. Close order with RNC (Tipo 01 - Crédito Fiscal)
        url_close = reverse("order-close", kwargs={"pk": order_id})
        close_data = {
            "payment_method": "cash",
            "subtotal": 847.46,
            "itbis": 152.54,
            "total": 1000.00,
            "rnc": "131711019",
            "whatsapp": "8095551234"
        }
        
        close_response = self.client.post(url_close, close_data, format="json")
        self.assertEqual(close_response.status_code, status.HTTP_200_OK)
        
        # Verify order state is paid and table is freed
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.rnc, "131711019")
        self.assertEqual(order.whatsapp, "8095551234")
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, "free")
        
        # Verify ECFDocument created correctly with Type 01 (Crédito Fiscal)
        ecf = ECFDocument.objects.get(order=order)
        self.assertEqual(ecf.ecf_type, ECFType.CREDITO_FISCAL)
        self.assertEqual(ecf.rnc, "131711019")
        self.assertEqual(ecf.status, ECFStatus.PENDING)
        
        # Verify transaction.on_commit was called to schedule the celery task
        self.assertTrue(mock_on_commit.called)

    @patch("django.db.transaction.on_commit")
    def test_close_order_without_rnc(self, mock_on_commit):
        # Create an order
        order = Order.objects.create(
            table=self.table,
            waitress=self.waitress_user,
            diners=1
        )
        OrderItem.objects.create(
            order=order,
            name="Mofongo",
            unit_price=Decimal("400.00"),
            quantity=1
        )
        
        # Close order without RNC (Tipo 02 - Consumidor Final)
        url_close = reverse("order-close", kwargs={"pk": order.id})
        close_data = {
            "payment_method": "card",
            "subtotal": 338.98,
            "itbis": 61.02,
            "total": 400.00
        }
        
        response = self.client.post(url_close, close_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.rnc, "")
        
        # Verify ECFDocument created correctly with Type 02 (Consumidor Final)
        ecf = ECFDocument.objects.get(order=order)
        self.assertEqual(ecf.ecf_type, ECFType.CONSUMIDOR_FINAL)
        self.assertEqual(ecf.rnc, "")
        self.assertEqual(ecf.status, ECFStatus.PENDING)
        self.assertTrue(mock_on_commit.called)
