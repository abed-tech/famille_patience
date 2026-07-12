from django.contrib import admin

from .models import Member, MemberHistory, ChurchPole, ChurchDepartment, FamilyPole


@admin.register(ChurchPole)
class ChurchPoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)


@admin.register(ChurchDepartment)
class ChurchDepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "pole", "is_active")
    list_filter = ("pole",)
    search_fields = ("name",)


@admin.register(FamilyPole)
class FamilyPoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)


class MemberHistoryInline(admin.TabularInline):
    model = MemberHistory
    extra = 0
    readonly_fields = ("action_type", "description", "performed_by", "created_at")
    can_delete = False


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = (
        "member_number",
        "full_name",
        "gender",
        "status",
        "referrer",
        "counsellor",
        "registration_date",
    )
    list_filter = ("status", "gender", "is_baptized", "church_pole", "family_pole")
    search_fields = ("member_number", "first_name", "last_name", "phone_primary", "qr_code")
    readonly_fields = ("member_number", "qr_code", "registration_date")
    inlines = [MemberHistoryInline]

    @admin.display(description="Nom complet")
    def full_name(self, obj):
        return obj.full_name
