from apps.members.models import Member


def user_has_member_profile(user):
    if not user or not user.is_authenticated:
        return False
    try:
        user.member_profile
        return True
    except Member.DoesNotExist:
        return False
