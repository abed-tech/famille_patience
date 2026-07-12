from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "time", "location", "status", "created_by")
    list_filter = ("status", "date")
    search_fields = ("name", "location")
    date_hierarchy = "date"
