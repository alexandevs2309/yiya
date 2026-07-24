from django.test import TestCase
from .models import User


class UserModelTest(TestCase):
    def test_create_user_with_role(self):
        user = User.objects.create_user(
            username='waiter1', password='test123', role='waiter', pin='1234'
        )
        self.assertEqual(user.role, 'waiter')
        self.assertEqual(user.pin, '1234')
