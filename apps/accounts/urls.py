from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("pin-login/", views.PinLoginView.as_view(), name="auth-pin-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("me/permissions/", views.MyPermissionsView.as_view(), name="auth-me-permissions"),
    path("me/change-pin/", views.ChangePinView.as_view(), name="account-change-pin"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    # Users
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<uuid:pk>/permissions/", views.UserPermissionsView.as_view(), name="user-permissions"),
    path("users/<uuid:pk>/schedule/", views.WorkScheduleView.as_view(), name="user-schedule"),
    # Session management
    path("<uuid:user_id>/invalidate-session/", views.InvalidateSessionView.as_view(), name="account-invalidate-session"),
    path("<uuid:user_id>/unlock/", views.UnlockUserView.as_view(), name="account-unlock"),
]
