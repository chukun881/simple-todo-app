from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

# The router writes the CRUD URLs for us:
#   /todos/        GET (list)   POST (create)
#   /todos/<id>/   GET (one)    PATCH/PUT (update)   DELETE
router = DefaultRouter()
router.register("todos", views.TodoViewSet, basename="todo")
router.register("categories", views.CategoryViewSet, basename="category")

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
