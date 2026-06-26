from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.cache import cache
from django.test import override_settings
from apps.accounts.models import User, hash_pin, Role

@override_settings(CACHES={
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
})
class AccountsTests(APITestCase):
    def setUp(self):
        # Clear cache to avoid throttling interference from other tests
        cache.clear()
        self.admin_user = User.objects.create_user(
            username="admin_test",
            password="admin_password123",
            role=Role.ADMIN,
            first_name="Admin",
            last_name="Test",
            pin="9999"
        )
        self.waitress_user = User.objects.create_user(
            username="waitress_test",
            password="waitress_password123",
            role=Role.WAITRESS,
            first_name="Waitress",
            last_name="Test",
            pin="1234"
        )

    def test_pin_hashing(self):
        # The PIN on setup should be hashed
        self.assertNotEqual(self.waitress_user.pin, "1234")
        self.assertEqual(self.waitress_user.pin, hash_pin("1234"))

    def test_login_with_password(self):
        url = reverse("auth-login")
        data = {
            "username": "admin_test",
            "password": "admin_password123"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "admin_test")
        self.assertNotIn("pin", response.data["user"]) # write_only

    def test_login_invalid_password(self):
        url = reverse("auth-login")
        data = {
            "username": "admin_test",
            "password": "wrong_password"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Credenciales inválidas")

    def test_login_with_pin(self):
        url = reverse("auth-pin-login")
        data = {
            "pin": "1234"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "waitress_test")

    def test_login_with_invalid_pin(self):
        url = reverse("auth-pin-login")
        data = {
            "pin": "0000"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "PIN inválido")

    def test_auth_throttling(self):
        url = reverse("auth-pin-login")
        data = {"pin": "0000"}
        # Send 5 requests (the limit is 5/min)
        for i in range(5):
            response = self.client.post(url, data, format="json")
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # The 6th request should be throttled
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
