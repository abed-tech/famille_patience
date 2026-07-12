import { createApi, extractList } from '../../shared/api.js';

const api = createApi('membre');

export { api, extractList };

export function login(identifier, password) {
    const body = { password };
    if (identifier.includes('@')) {
        body.email = identifier;
    } else {
        body.identifier = identifier;
    }
    return api.request('/auth/login/membre/', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function registerMember(data, photoFile) {
    if (!photoFile) throw new Error('La photo de profil est obligatoire.');
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, v);
    });
    fd.append('photo', photoFile);
    return api.requestMultipart('/members/register/', fd);
}

export function updateMyProfile(data, photoFile) {
    if (photoFile) {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null && v !== undefined) fd.append(k, v);
        });
        fd.append('photo', photoFile);
        return api.requestMultipart('/members/me/', fd, 'PATCH');
    }
    return api.updateMyProfile(data);
}

export function changePassword(oldPassword, newPassword) {
    return api.request('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, new_password_confirm: newPassword }),
    });
}

export function markNotificationRead(id) {
    return api.request(`/notifications/${id}/read/`, { method: 'POST' });
}

// Extend ApiClient with multipart support
api.requestMultipart = async function (endpoint, formData, method = 'POST') {
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let res = await fetch(`/api/v1${endpoint}`, { method, headers, body: formData });
    if (res.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
            headers.Authorization = `Bearer ${this.token}`;
            res = await fetch(`/api/v1${endpoint}`, { method, headers, body: formData });
        }
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.detail || 'Erreur');
    return data;
};

api.getMyDashboard = () => api.request('/members/me/dashboard/');
api.getMyReferrer = () => api.request('/members/me/referrer/');
api.getMyCounsellor = () => api.request('/members/me/counsellor/');
api.getMyEvents = () => api.request('/members/me/events/');
api.getMyEventDetail = (eventId) => api.request(`/members/me/events/${eventId}/`, { cache: false });
api.getReferrerDashboard = () => api.request('/dashboard/referrer/');
api.getCounsellorDashboard = () => api.request('/dashboard/counsellor/');
api.getCounsellorReferrer = (id) => api.request(`/dashboard/counsellor/referrers/${id}/`);
api.getStaffMembers = (q = '') => api.request(`/members/?page_size=200${q ? `&search=${encodeURIComponent(q)}` : ''}`);
api.getStaffMember = (id) => api.request(`/members/${id}/staff/`);
api.getStaffMemberCard = (id) => api.request(`/members/${id}/card/`);
api.getUserRole = () => api.getProfile();
api.markNotificationRead = markNotificationRead;

api.getMyAgentEvents = () => api.request('/attendance/my-events/');
api.getAgentAssignedEvents = () => api.request('/attendance/assigned-events/');
api.getAgentEventDetail = (eventId) => api.request(`/attendance/events/${eventId}/detail/`);
api.getAgentEventDashboard = (eventId) =>
    api.request(`/attendance/events/${eventId}/dashboard/`, { cache: false });
api.searchMembersForPointage = (eventId, q) =>
    api.request(`/attendance/events/${eventId}/search/?q=${encodeURIComponent(q)}`, { cache: false });
api.scanAttendance = (qrCode, eventId, scanMode = 'qr') =>
    api.request('/attendance/scan/', {
        method: 'POST',
        body: JSON.stringify({ qr_code: qrCode, event_id: eventId, scan_mode: scanMode }),
    });

let _agentState = { events: [], hasAccess: false };

export function setAgentFromDashboard(dashboard) {
    _agentState = {
        events: dashboard?.active_agent_events || [],
        hasAccess: !!(dashboard?.has_agent_access || dashboard?.active_agent_events?.length),
    };
}

export async function refreshAgentStatus() {
    const res = await api.request('/members/me/dashboard/', { cache: false });
    setAgentFromDashboard(res.data);
    return _agentState;
}

export function hasAgentAccess() {
    return _agentState.hasAccess;
}

export function getActiveAgentEvents() {
    return _agentState.events;
}

export function getUserRole() {
    return api.getUser()?.role || 'member';
}

export function isReferrer() { return getUserRole() === 'referrer'; }
export function isCounsellor() { return getUserRole() === 'counsellor'; }
export function isStaff() { return isReferrer() || isCounsellor(); }
