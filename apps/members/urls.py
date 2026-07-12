from django.urls import path

from .views import (
    MemberListCreateView,
    MemberDetailView,
    MemberHistoryView,
    MemberCardView,
    ChurchPoleListCreateView,
    ChurchDepartmentListCreateView,
    ChurchDepartmentDetailView,
    FamilyPoleListCreateView,
    FamilyPoleDetailView,
    ProfessionListCreateView,
    ProfessionDetailView,
)
from .staff_views import StaffMemberDetailView, StaffMemberHistoryView
from .member_views import (
    MemberRegistrationView,
    MyProfileView,
    MyCardView,
    MyHistoryView,
    MyAttendancesView,
    MyDashboardView,
    MyReferrerView,
    MyCounsellorView,
    MyEventsView,
    MyEventDetailView,
    PublicChurchPoleListView,
    PublicChurchDepartmentListView,
    PublicFamilyPoleListView,
    PublicProfessionListView,
)

app_name = "members"

urlpatterns = [
    path("register/", MemberRegistrationView.as_view(), name="member_register"),
    path("me/", MyProfileView.as_view(), name="my_profile"),
    path("me/card/", MyCardView.as_view(), name="my_card"),
    path("me/history/", MyHistoryView.as_view(), name="my_history"),
    path("me/attendances/", MyAttendancesView.as_view(), name="my_attendances"),
    path("me/dashboard/", MyDashboardView.as_view(), name="my_dashboard"),
    path("me/referrer/", MyReferrerView.as_view(), name="my_referrer"),
    path("me/counsellor/", MyCounsellorView.as_view(), name="my_counsellor"),
    path("me/events/", MyEventsView.as_view(), name="my_events"),
    path("me/events/<uuid:pk>/", MyEventDetailView.as_view(), name="my_event_detail"),
    path("public/poles/church/", PublicChurchPoleListView.as_view(), name="public_church_poles"),
    path("public/departments/church/", PublicChurchDepartmentListView.as_view(), name="public_church_depts"),
    path("public/poles/family/", PublicFamilyPoleListView.as_view(), name="public_family_poles"),
    path("public/professions/", PublicProfessionListView.as_view(), name="public_professions"),
    path("<uuid:pk>/staff/", StaffMemberDetailView.as_view(), name="staff_member_detail"),
    path("<uuid:pk>/staff/history/", StaffMemberHistoryView.as_view(), name="staff_member_history"),
    path("", MemberListCreateView.as_view(), name="member_list"),
    path("<uuid:pk>/", MemberDetailView.as_view(), name="member_detail"),
    path("<uuid:pk>/history/", MemberHistoryView.as_view(), name="member_history"),
    path("<uuid:pk>/card/", MemberCardView.as_view(), name="member_card"),
    path("poles/church/", ChurchPoleListCreateView.as_view(), name="church_pole_list"),
    path("departments/church/", ChurchDepartmentListCreateView.as_view(), name="church_department_list"),
    path("departments/church/<int:pk>/", ChurchDepartmentDetailView.as_view(), name="church_department_detail"),
    path("poles/family/", FamilyPoleListCreateView.as_view(), name="family_pole_list"),
    path("poles/family/<int:pk>/", FamilyPoleDetailView.as_view(), name="family_pole_detail"),
    path("professions/", ProfessionListCreateView.as_view(), name="profession_list"),
    path("professions/<int:pk>/", ProfessionDetailView.as_view(), name="profession_detail"),
]
