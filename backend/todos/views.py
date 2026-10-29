from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Todo
from .serializers import CategorySerializer, RegisterSerializer, TodoSerializer, UserSerializer


# ---------- Auth ----------

class RegisterView(generics.CreateAPIView):
    """POST username/email/password -> creates the user and returns a token."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]  # you can't be logged in before you sign up

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = Token.objects.create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(ObtainAuthToken):
    """POST username/password -> returns the user's token (creates one if needed)."""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)  # wrong password -> 400
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    """POST -> deletes the token, so it can never be used again."""

    def post(self, request):
        request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveAPIView):
    """GET -> who am I? Used by the frontend to check a saved token is still valid."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# ---------- Todos and categories ----------
# A ModelViewSet gives list/create/retrieve/update/delete in one class.
# The key security line in each is get_queryset(): it only ever looks at
# the logged-in user's rows, so other users' data returns 404.

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)  # owner comes from the token, not the request body


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer

    def get_queryset(self):
        queryset = Todo.objects.filter(user=self.request.user).select_related("category")

        # Optional filters: /api/todos/?completed=true&category=3
        completed = self.request.query_params.get("completed")
        if completed in ("true", "false"):
            queryset = queryset.filter(is_completed=(completed == "true"))
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
