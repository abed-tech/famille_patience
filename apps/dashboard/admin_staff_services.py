"""Services admin — profils référents et conseillers."""
from apps.accounts.models import User
from apps.members.models import Member

from .staff_services import serialize_member_brief


def _staff_photo_url(request, user):
    if user.avatar:
        return request.build_absolute_uri(user.avatar.url)
    try:
        mp = user.member_profile
        if mp.photo:
            return request.build_absolute_uri(mp.photo.url)
    except Exception:
        pass
    return None


def serialize_staff_profile(request, user):
    """Profil complet d'un référent ou conseiller (données membre incluses)."""
    photo = _staff_photo_url(request, user)
    data = {
        "id": str(user.id),
        "full_name": user.full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "photo": photo,
        "role": user.role,
    }

    try:
        member = user.member_profile
    except Member.DoesNotExist:
        return data

    if member.photo:
        data["photo"] = request.build_absolute_uri(member.photo.url)

    data.update({
        "member_id": str(member.id),
        "middle_name": member.middle_name,
        "gender": member.gender,
        "gender_label": member.get_gender_display() if member.gender else "",
        "date_of_birth": member.date_of_birth.isoformat(),
        "address": member.address,
        "phone_primary": member.phone_primary,
        "phone_secondary": member.phone_secondary,
        "whatsapp": member.whatsapp,
        "member_email": member.email,
        "profession": member.profession or (member.profession_ref.name if member.profession_ref_id else ""),
        "marital_status": member.marital_status,
        "marital_status_label": member.get_marital_status_display(),
        "is_baptized": member.is_baptized,
        "baptism_year": member.baptism_year,
        "icc_modules_completed": member.icc_modules_completed,
        "icc_module_level": member.icc_module_level,
        "serves_in_church": member.serves_in_church,
        "serves_in_family": member.serves_in_family,
        "church_department": member.church_department.name if member.church_department_id else None,
        "interested_church_department": (
            member.interested_church_department.name if member.interested_church_department_id else None
        ),
        "family_pole": member.family_pole.name if member.family_pole_id else None,
        "interested_family_pole": (
            member.interested_family_pole.name if member.interested_family_pole_id else None
        ),
        "qr_code": member.qr_code,
        "member_number": member.member_number,
    })
    return data


def get_admin_referrer_detail(request, referrer_id):
    try:
        referrer = User.objects.get(pk=referrer_id, role="referrer")
    except User.DoesNotExist:
        return None

    members_qs = Member.objects.filter(referrer=referrer).select_related(
        "family_pole", "church_department", "referrer", "counsellor"
    ).order_by("last_name", "first_name")

    profile = serialize_staff_profile(request, referrer)
    profile["members_count"] = members_qs.count()
    profile["active_members"] = members_qs.filter(status="active").count()

    return {
        "referrer": profile,
        "members": [serialize_member_brief(request, m) for m in members_qs],
    }


def get_admin_counsellor_detail(request, counsellor_id):
    try:
        counsellor = User.objects.get(pk=counsellor_id, role="counsellor")
    except User.DoesNotExist:
        return None

    members_qs = Member.objects.filter(counsellor=counsellor)
    referrer_ids = (
        members_qs.filter(referrer__isnull=False)
        .values_list("referrer_id", flat=True)
        .distinct()
    )
    referrers = User.objects.filter(id__in=referrer_ids, role="referrer").order_by("last_name", "first_name")

    referrer_list = []
    for ref in referrers:
        ref_members = members_qs.filter(referrer=ref)
        referrer_list.append({
            "id": str(ref.id),
            "full_name": ref.full_name,
            "photo": _staff_photo_url(request, ref),
            "members_count": ref_members.count(),
        })

    profile = serialize_staff_profile(request, counsellor)
    profile["members_count"] = members_qs.count()
    profile["referrers_count"] = len(referrer_list)

    return {
        "counsellor": profile,
        "referrers": referrer_list,
    }
