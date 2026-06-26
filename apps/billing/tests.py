from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from apps.accounts.models import User, Role
from apps.tables.models import Table, Zone
from apps.orders.models import Order
from apps.billing.models import ECFDocument, ECFType, ECFStatus
from datetime import datetime, timezone as pytimezone

class BillingTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin_billing_tests",
            password="password123",
            role=Role.ADMIN
        )
        self.client.force_authenticate(user=self.admin_user)
        self.zone = Zone.objects.create(name="Billing Zone")
        self.table = Table.objects.create(number=10, zone=self.zone, capacity=4)

        # Order 1 (May)
        self.order_may = Order.objects.create(
            table=self.table,
            waitress=self.admin_user,
            status="paid"
        )
        # Order 2 (June)
        self.order_june = Order.objects.create(
            table=self.table,
            waitress=self.admin_user,
            status="paid"
        )

        # Create ECF documents
        self.doc_may = ECFDocument.objects.create(
            order=self.order_may,
            ecf_type=ECFType.CONSUMIDOR_FINAL,
            status=ECFStatus.APPROVED,
            provisional_number="PROV-MAY"
        )
        # Manually alter created_at using update to avoid auto_now_add override during save
        ECFDocument.objects.filter(id=self.doc_may.id).update(
            created_at=datetime(2026, 5, 15, 12, 0, 0, tzinfo=pytimezone.utc)
        )

        self.doc_june = ECFDocument.objects.create(
            order=self.order_june,
            ecf_type=ECFType.CREDITO_FISCAL,
            status=ECFStatus.APPROVED,
            provisional_number="PROV-JUNE"
        )
        ECFDocument.objects.filter(id=self.doc_june.id).update(
            created_at=datetime(2026, 6, 15, 12, 0, 0, tzinfo=pytimezone.utc)
        )

    def test_filter_ecf_by_period(self):
        url = reverse("ecfdocument-list")
        
        # Test May filter
        response_may = self.client.get(url, {"year": "2026", "month": "05"})
        self.assertEqual(response_may.status_code, status.HTTP_200_OK)
        # If paginated, results is under "results"
        results_may = response_may.data.get("results", response_may.data)
        self.assertEqual(len(results_may), 1)
        self.assertEqual(results_may[0]["provisional_number"], "PROV-MAY")

        # Test June filter
        response_june = self.client.get(url, {"year": "2026", "month": "06"})
        self.assertEqual(response_june.status_code, status.HTTP_200_OK)
        results_june = response_june.data.get("results", response_june.data)
        self.assertEqual(len(results_june), 1)
        self.assertEqual(results_june[0]["provisional_number"], "PROV-JUNE")

        # Test Non-existent month
        response_empty = self.client.get(url, {"year": "2026", "month": "07"})
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        results_empty = response_empty.data.get("results", response_empty.data)
        self.assertEqual(len(results_empty), 0)
