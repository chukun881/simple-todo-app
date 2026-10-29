from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Category, Todo

User = get_user_model()


class AuthTests(APITestCase):
    def test_register_returns_token(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "alice", "email": "a@example.com", "password": "Sup3r-secret-pw"},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", res.data)
        self.assertNotIn("password", res.data["user"])

    def test_register_rejects_weak_password(self):
        res = self.client.post("/api/auth/register/", {"username": "bob", "password": "123"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_correct_and_wrong_password(self):
        User.objects.create_user(username="alice", password="Sup3r-secret-pw")
        ok = self.client.post("/api/auth/login/", {"username": "alice", "password": "Sup3r-secret-pw"})
        bad = self.client.post("/api/auth/login/", {"username": "alice", "password": "wrong"})
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertIn("token", ok.data)
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_invalidates_token(self):
        user = User.objects.create_user(username="alice", password="Sup3r-secret-pw")
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)


class TodoApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="pw-alice-123")
        self.bob = User.objects.create_user(username="bob", password="pw-bob-123")
        self.login_as(self.alice)

    def login_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_requires_login(self):
        self.client.credentials()  # remove the token
        self.assertEqual(self.client.get("/api/todos/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_full_crud(self):
        res = self.client.post("/api/todos/", {"title": "Buy milk", "priority": 3})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        todo_id = res.data["id"]
        self.assertEqual(res.data["priority_label"], "High")

        res = self.client.patch(f"/api/todos/{todo_id}/", {"is_completed": True})
        self.assertTrue(res.data["is_completed"])

        self.assertEqual(len(self.client.get("/api/todos/").data), 1)
        self.assertEqual(self.client.delete(f"/api/todos/{todo_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(self.client.get("/api/todos/").data), 0)

    def test_owner_is_taken_from_token_not_body(self):
        res = self.client.post("/api/todos/", {"title": "Sneaky", "user": self.bob.id})
        self.assertEqual(Todo.objects.get(pk=res.data["id"]).user, self.alice)

    def test_users_cannot_see_or_change_each_others_todos(self):
        bobs = Todo.objects.create(user=self.bob, title="Bob's secret")
        self.assertEqual(len(self.client.get("/api/todos/").data), 0)
        self.assertEqual(self.client.get(f"/api/todos/{bobs.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(f"/api/todos/{bobs.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Todo.objects.filter(pk=bobs.id).exists())

    def test_cannot_use_another_users_category(self):
        bobs_cat = Category.objects.create(user=self.bob, name="Bob stuff")
        res = self.client.post("/api/todos/", {"title": "x", "category": bobs_cat.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filters(self):
        work = Category.objects.create(user=self.alice, name="Work")
        Todo.objects.create(user=self.alice, title="a", is_completed=True, category=work)
        Todo.objects.create(user=self.alice, title="b")
        self.assertEqual(len(self.client.get("/api/todos/?completed=true").data), 1)
        self.assertEqual(len(self.client.get(f"/api/todos/?category={work.id}").data), 1)

    def test_deleting_category_keeps_todos(self):
        work = Category.objects.create(user=self.alice, name="Work")
        todo = Todo.objects.create(user=self.alice, title="a", category=work)
        self.client.delete(f"/api/categories/{work.id}/")
        todo.refresh_from_db()
        self.assertIsNone(todo.category)  # SET_NULL in action

    def test_duplicate_category_name_is_friendly_400(self):
        Category.objects.create(user=self.alice, name="Work")
        res = self.client.post("/api/categories/", {"name": "work"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # ...but Bob may have his own "Work"
        self.login_as(self.bob)
        self.assertEqual(self.client.post("/api/categories/", {"name": "Work"}).status_code, status.HTTP_201_CREATED)
