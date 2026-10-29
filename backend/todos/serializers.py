from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Category, Todo

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)  # accepted on input, never sent back

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")

    def validate_password(self, value):
        validate_password(value)  # Django's rules: length, not too common, not all digits
        return value

    def create(self, validated_data):
        # create_user hashes the password; never store it in plain text
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "color", "created_at")
        read_only_fields = ("created_at",)

    def validate_name(self, value):
        # The DB constraint would also catch duplicates, but with an ugly 500 error.
        # Checking here returns a friendly 400 instead.
        user = self.context["request"].user
        duplicates = Category.objects.filter(user=user, name__iexact=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("You already have a category with this name.")
        return value


class TodoSerializer(serializers.ModelSerializer):
    # Extra read-only fields so the frontend does not need a second request
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Todo
        fields = (
            "id", "title", "description", "is_completed",
            "priority", "priority_label", "due_date",
            "category", "category_name",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate_category(self, category):
        # Security: without this check a user could attach someone else's category id.
        if category and category.user != self.context["request"].user:
            raise serializers.ValidationError("Category not found.")
        return category
