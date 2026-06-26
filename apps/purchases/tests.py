from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, Role
from apps.purchases.models import Purchase
from datetime import date

class PurchasesTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin_purchases_tests",
            password="password123",
            role=Role.ADMIN
        )
        self.client.force_authenticate(user=self.admin_user)

        self.purchase_may = Purchase.objects.create(
            supplier_rnc="101012345",
            supplier_name="Mariscos Samaná",
            date=date(2026, 5, 10),
            ncf="B0100000001",
            subtotal=1000.00,
            itbis=180.00,
            total=1180.00
        )

        self.purchase_june = Purchase.objects.create(
            supplier_rnc="130987654",
            supplier_name="Supermercado Nordeste",
            date=date(2026, 6, 10),
            ncf="B0100000002",
            subtotal=2000.00,
            itbis=360.00,
            total=2360.00
        )

    def test_filter_purchases_by_period(self):
        url = reverse("purchase-list")
        
        # Test May filter
        response_may = self.client.get(url, {"year": "2026", "month": "05"})
        self.assertEqual(response_may.status_code, status.HTTP_200_OK)
        results_may = response_may.data.get("results", response_may.data)
        self.assertEqual(len(results_may), 1)
        self.assertEqual(results_may[0]["ncf"], "B0100000001")

        # Test June filter
        response_june = self.client.get(url, {"year": "2026", "month": "06"})
        self.assertEqual(response_june.status_code, status.HTTP_200_OK)
        results_june = response_june.data.get("results", response_june.data)
        self.assertEqual(len(results_june), 1)
        self.assertEqual(results_june[0]["ncf"], "B0100000002")

        # Test Non-existent month
        response_empty = self.client.get(url, {"year": "2026", "month": "07"})
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        results_empty = response_empty.data.get("results", response_empty.data)
        self.assertEqual(len(results_empty), 0)
