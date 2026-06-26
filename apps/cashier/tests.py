from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from apps.accounts.models import User, Role
from apps.cashier.models import CashRegister
from apps.orders.models import Order
from apps.tables.models import Table, Zone
from decimal import Decimal

class CashierTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin_cashier",
            password="password123",
            role=Role.ADMIN
        )
        self.client.force_authenticate(user=self.admin_user)
        self.zone = Zone.objects.create(name="Samana Zone")
        self.table = Table.objects.create(number=1, zone=self.zone, capacity=4)

    def test_open_and_close_register(self):
        # 1. Open register
        url_list = reverse("cashregister-list")
        open_data = {
            "initial_amount": 2000.00
        }
        response = self.client.post(url_list, open_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        register_id = response.data["id"]
        
        register = CashRegister.objects.get(id=register_id)
        self.assertEqual(register.status, "open")
        self.assertEqual(register.opened_by, self.admin_user)
        self.assertEqual(register.initial_amount, Decimal("2000.00"))

        # Create paid orders to test expected cash calculation
        # Order 1: cash, total 1200
        order_cash = Order.objects.create(
            table=self.table,
            waitress=self.admin_user,
            status="paid",
            payment_method="cash",
            subtotal=Decimal("1000.00"),
            itbis=Decimal("180.00"),
            tip=Decimal("20.00"),
            total=Decimal("1200.00"),
            closed_at=timezone.now()
        )

        # Order 2: mixed, total 1500, amount_received=800 in cash
        order_mixed = Order.objects.create(
            table=self.table,
            waitress=self.admin_user,
            status="paid",
            payment_method="mixed",
            subtotal=Decimal("1271.19"),
            itbis=Decimal("228.81"),
            total=Decimal("1500.00"),
            amount_received=Decimal("800.00"), # Cash portion
            closed_at=timezone.now()
        )

        # Order 3: card, total 1000 (not included in cash expected)
        order_card = Order.objects.create(
            table=self.table,
            waitress=self.admin_user,
            status="paid",
            payment_method="card",
            subtotal=Decimal("847.46"),
            itbis=Decimal("152.54"),
            total=Decimal("1000.00"),
            closed_at=timezone.now()
        )

        # 2. Verify current_cash field via serializer / detail view
        url_detail = reverse("cashregister-detail", kwargs={"pk": register_id})
        detail_response = self.client.get(url_detail)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        # expected current_cash = initial_amount (2000) + cash order (1200) + mixed portion (800) = 4000
        self.assertEqual(detail_response.data["current_cash"], 4000.0)

        # 3. Close register
        url_close = reverse("cashregister-close", kwargs={"pk": register_id})
        close_data = {
            "actual_cash": 4100.00,
            "notes": "Closing registers test"
        }
        close_response = self.client.post(url_close, close_data, format="json")
        self.assertEqual(close_response.status_code, status.HTTP_200_OK)
        self.assertEqual(close_response.data["status"], "closed")
        self.assertEqual(float(close_response.data["expected_cash"]), 2000.0)
        self.assertEqual(float(close_response.data["actual_cash"]), 4100.0)
        self.assertEqual(float(close_response.data["difference"]), 2100.0) # wait, difference = actual_cash (4100) - expected_cash (2000) = 2100. Correct!
        # wait! initial_amount is not in expected_cash. expected_cash calculates the sales cash.
        # Let's check view:
        # expected_cash_direct = cash sales (1200)
        # expected_cash_mixed = mixed cash (800)
        # expected_cash = 2000
        # register.difference = actual_cash (4100) - expected_cash (2000) = 2100.
        # Yes, difference is 2100.
        
        # Let's verify updated register DB values
        register.refresh_from_db()
        self.assertEqual(register.status, "closed")
        self.assertEqual(register.closed_by, self.admin_user)
        self.assertEqual(register.difference, Decimal("2100.00"))
