from django.conf import settings
from django.db import models
from django.db.models import F


class Category(models.Model):
    """A label a user groups todos under, e.g. "Work" or "Groceries"."""

    # Each category belongs to exactly one user. Deleting the user deletes their categories.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#6b7280")  # hex colour for the UI badge
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"
        constraints = [
            # Two users may both have "Work", but one user cannot have "Work" twice.
            models.UniqueConstraint(fields=["user", "name"], name="unique_category_per_user"),
        ]

    def __str__(self):
        return self.name


class Todo(models.Model):
    """One task on a user's list."""

    class Priority(models.IntegerChoices):
        # Stored as numbers so the database can sort by importance (1 < 2 < 3).
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
    )
    # Optional. Deleting a category keeps its todos and just clears the link.
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="todos",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    priority = models.PositiveSmallIntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_completed", F("due_date").asc(nulls_last=True), "-priority", "-created_at"]

    def __str__(self):
        return self.title
