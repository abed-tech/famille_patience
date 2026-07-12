from django.contrib import admin

from .models import Attendance, EventAgentAssignment


@admin.register(EventAgentAssignment)
class EventAgentAssignmentAdmin(admin.ModelAdmin):
    list_display = ("event", "agent", "is_active", "assigned_by", "created_at")
    list_filter = ("is_active",)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("member", "event", "is_present", "scanned_by", "scanned_at")
    list_filter = ("is_present", "event")
    search_fields = ("member__first_name", "member__last_name", "member__member_number")
