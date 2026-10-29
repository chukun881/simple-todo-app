from django.contrib import admin

from .models import Category, Todo


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "color", "created_at")
    list_filter = ("user",)
    search_fields = ("name",)


@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "category", "priority", "is_completed", "due_date")
    list_filter = ("is_completed", "priority", "user")
    search_fields = ("title", "description")
