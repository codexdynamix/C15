import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ROLE } from '../shared';
import {
  adminLogout,
  getAdminToken,
  getAdminUnreadMessageCounts,
  getAdminNotificationsUnread,
  markAllAdminNotificationsRead,
  markAllAdminMessagesRead,
  updateStaffApi,
  getAdminPendingCounts,
} from '../adminApi';
import { usePlatformSettings } from '../../platformDefaults';

const POLL_INTERVAL_MS = 30_000;

function useAdminUnreadCounts(enabled) {
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const msgUserIds  = useRef([]);
  const prevTotal   = useRef(0);
  const [ring, setRing]       = useState(false);
  const [clearing, setClearing] = useState(false);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [msg, notif] = await Promise.all([
        getAdminUnreadMessageCounts(),
        getAdminNotificationsUnread(),
      ]);
      const messages      = msg.total || 0;
      const notifications = notif.unreadCount || 0;
      const total         = messages + notifications;

      msgUserIds.current = Object.keys(msg.counts || {}).filter(
        (uid) => (msg.counts[uid] || 0) > 0
      );

      setCounts({ messages, notifications });

      if (total > prevTotal.current && prevTotal.current >= 0) {
        setRing(true);
        setTimeout(() => setRing(false), 1200);
      }
      prevTotal.current = total;
    } catch (_) {}
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  const markAllRead = useCallback(async () => {
    if (clearing) return;
    setClearing(true);
    setCounts({ messages: 0, notifications: 0 });
    prevTotal.current = 0;
    try {
      await Promise.allSettled([
        markAllAdminNotificationsRead(),
        markAllAdminMessagesRead(msgUserIds.current),
      ]);
    } finally {
      setClearing(false);
      poll();
    }
  }, [clearing, poll]);

  return { counts, ring, marking: clearing, markAllRead };
}

const ROLE_LOGIN_PATH = {
  [ROLE.SUPER_ADMIN]: '/admin/login/super-admin',
  [ROLE.OFFICE_MANAGER]: '/admin/login/office-manager',
  [ROLE.TEAM_LEADER]: '/admin/login/team-leader',
  [ROLE.AGENT]: '/admin/login/agent',
};

const ICON_PROPS = {
  width: 12,
  height: 12,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
function CopyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg {...ICON_PROPS}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 4.22-5.22" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function LogoutIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="crm-logout-svg"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function BellIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const ROLE_TAB_MAP = {
  'Super Admin':    { alerts: 'Notifications', messages: 'Client Management' },
  'Agent':          { alerts: 'notifications', messages: 'leads' },
  'Team Leader':    { alerts: 'notifications', messages: 'leads' },
  'Office Manager': { alerts: 'notifications', messages: 'leads' },
};

function NotificationBell({ user }) {
  const isAuthed = Boolean(user && getAdminToken());
  const isSuperAdmin = user?.role === ROLE.SUPER_ADMIN;
  const { counts, ring, marking, markAllRead } = useAdminUnreadCounts(isAuthed);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const total = counts.messages + counts.notifications;

  useEffect(() => {
    if (!isSuperAdmin || !isAuthed) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isSuperAdmin, isAuthed]);

  const gotoTab = useCallback((kind) => {
    const tabs = ROLE_TAB_MAP[user?.role] || ROLE_TAB_MAP['Agent'];
    const tab  = kind === 'alerts' ? tabs.alerts : tabs.messages;
    window.dispatchEvent(new CustomEvent('admin:goto-tab', { detail: { tab } }));
    setOpen(false);
  }, [user?.role]);

  const settings    = usePlatformSettings();
  const cleanPlatformName = (settings.platformName || 'Codex Dynamics').replace(/\s*\/\s*/g, ' ').replace(/\/+/g, '').trim();
  const baseTitle   = `${cleanPlatformName} Admin`;

  useEffect(() => {
    if (!isAuthed) return;
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    return () => { document.title = baseTitle; };
  }, [total, baseTitle, isAuthed]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!isAuthed) return null;

  return (
    <div className="crm-notif-bell-wrap" ref={ref}>
      <button
        type="button"
        className={`crm-notif-bell-btn${ring ? ' crm-notif-bell-ring' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label={total > 0 ? `${total} unread` : 'Notifications'}
      >
        <BellIcon size={15} />
        {total > 0 && (
          <span className="crm-notif-badge" aria-hidden="true">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="crm-notif-dropdown" role="dialog" aria-label="Notifications summary">
          <div className="crm-notif-dropdown-header">
            <span className="crm-notif-dropdown-title">Activity</span>
            {total > 0 && <span className="crm-notif-dropdown-count">{total} unread</span>}
          </div>
          <div className="crm-notif-dropdown-body">
            <div
              className={`crm-notif-row${counts.messages > 0 ? ' is-unread' : ''}`}
              onClick={() => gotoTab('messages')}
              style={{ cursor: 'pointer' }}
              title="Go to messages"
            >
              <span className="crm-notif-row-icon">💬</span>
              <span className="crm-notif-row-label">Client messages</span>
              <span className="crm-notif-row-val">
                {counts.messages > 0 ? (
                  <span className="crm-notif-pill">{counts.messages}</span>
                ) : (
                  <span className="crm-notif-row-clear">All read</span>
                )}
              </span>
              <span style={{ marginLeft: 6, color: 'var(--crm-text-secondary)', fontSize: 10 }}>›</span>
            </div>
            <div
              className={`crm-notif-row${counts.notifications > 0 ? ' is-unread' : ''}`}
              onClick={() => gotoTab('alerts')}
              style={{ cursor: 'pointer' }}
              title="Go to notifications"
            >
              <span className="crm-notif-row-icon">🔔</span>
              <span className="crm-notif-row-label">System alerts</span>
              <span className="crm-notif-row-val">
                {counts.notifications > 0 ? (
                  <span className="crm-notif-pill">{counts.notifications}</span>
                ) : (
                  <span className="crm-notif-row-clear">All read</span>
                )}
              </span>
              <span style={{ marginLeft: 6, color: 'var(--crm-text-secondary)', fontSize: 10 }}>›</span>
            </div>
          </div>
          <div className="crm-notif-dropdown-footer">
            {total > 0 ? (
              <button
                type="button"
                className="crm-notif-mark-all-btn"
                onClick={markAllRead}
                disabled={marking}
              >
                {marking ? 'Clearing...' : 'Mark all as read'}
              </button>
            ) : (
              <span className="crm-notif-all-clear">All caught up</span>
            )}
            <span className="crm-notif-refresh-hint">Refreshes every 30 s</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  const letters = parts.map((p) => p[0] || '').join('');
  return (letters || name[0] || '?').slice(0, 2).toUpperCase();
}

export function UserChrome({ user, data, setData }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const isSuperAdmin = user?.role === ROLE.SUPER_ADMIN;
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit' | 'all'
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirm, setEditConfirm] = useState('');
  const [editPwShown, setEditPwShown] = useState(false);
  const [editConfirmShown, setEditConfirmShown] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const office = useMemo(
    () => (user?.officeId ? (data?.offices || []).find((o) => o.id === user.officeId) : null),
    [user, data]
  );
  const team = useMemo(
    () => (user?.teamId ? (data?.teams || []).find((t) => t.id === user.teamId) : null),
    [user, data]
  );

  useEffect(() => {
    if (open && isSuperAdmin) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPassword('');
      setEditConfirm('');
      setEditError('');
      setEditSuccess('');
      setEditPwShown(false);
      setEditConfirmShown(false);
    }
  }, [open, isSuperAdmin, user?.id]);

  const saveAccountDetails = async () => {
    setEditError('');
    setEditSuccess('');
    if (!editName.trim()) return setEditError('Name cannot be empty.');
    if (!editEmail.trim()) return setEditError('Email cannot be empty.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(editEmail.trim())) return setEditError('Please enter a valid email address.');
    if (editPassword && editPassword.length < 8)
      return setEditError('Password must be at least 8 characters.');
    if (editPassword && editPassword !== editConfirm)
      return setEditError('Passwords do not match.');

    setEditSaving(true);
    try {
      const updates = { name: editName.trim(), email: editEmail.trim() };
      if (editPassword) updates.password = editPassword;
      const updated = await updateStaffApi(user.id, updates);
      if (setData) {
        setData(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === user.id ? { ...u, ...updated } : u),
        }));
      }
      setEditPassword('');
      setEditConfirm('');
      setEditSuccess('Details saved successfully.');
    } catch (err) {
      setEditError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  if (!user) return null;

  const loginPath = ROLE_LOGIN_PATH[user.role] || '/admin';
  const initials = getInitials(user.name);

  const copy = (text, key) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
    } catch (_) {
      /* clipboard unavailable; ignore */
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1400);
  };

  const closeModal = () => {
    setOpen(false);
    setShowPwd(false);
  };

  // Real logout: tell the backend to clear cookies, wipe the local token +
  // profile, then navigate to the role-specific login page with replace so
  // the panel URL can't be revisited via the browser back button.
  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await adminLogout();
    } finally {
      setOpen(false);
      setShowPwd(false);
      navigate(loginPath, { replace: true });
      setSigningOut(false);
    }
  };

  return (
    <>
      <NotificationBell user={user} />
      <div className="crm-user-chrome">
        <button
          type="button"
          className="crm-user-chip"
          onClick={() => setOpen(true)}
          title="View profile"
        >
          <span className="crm-user-chip-avatar" aria-hidden="true">{initials}</span>
          <span className="crm-user-chip-text">
            <span className="crm-user-chip-name">{user.name}</span>
            <span className="crm-user-chip-role">{user.role}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="crm-logout-btn"
          title="Sign out"
        >
          <span className="crm-logout-icon" aria-hidden="true">
            <LogoutIcon size={14} />
          </span>
          <span className="crm-logout-label">{signingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="crm-admin-app crm-profile-overlay"
          data-crm-mode="dark"
          onClick={closeModal}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", -apple-system, sans-serif',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <div
            className="crm-profile-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${user.name} profile`}
            style={{
              position: 'relative',
              zIndex: 1000000,
              backgroundColor: '#1C1C1E',
              border: '0.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '430px',
              maxHeight: 'min(86vh, 580px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              margin: 'auto',
              color: '#FFFFFF',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div
              className="crm-profile-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px 14px',
                borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                backgroundColor: '#1C1C1E',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="crm-profile-avatar"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: '#0A84FF',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div className="crm-profile-id" style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {user.name}
                </h3>
                <span
                  className="crm-profile-role"
                  style={{
                    display: 'inline-block',
                    marginTop: '3px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    color: '#0A84FF',
                    backgroundColor: 'rgba(10, 132, 255, 0.14)',
                    border: '0.5px solid rgba(10, 132, 255, 0.28)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                  }}
                >
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                className="crm-profile-close"
                onClick={closeModal}
                aria-label="Close profile"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '0.5px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(235, 235, 245, 0.7)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: 'auto',
                  flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Apple Segmented View Switcher (Super Admin only) */}
            {isSuperAdmin && (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(118, 118, 128, 0.18)',
                  padding: '3px',
                  borderRadius: '10px',
                  margin: '12px 18px 0',
                  gap: '3px',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12.5px',
                    fontWeight: activeTab === 'overview' ? 600 : 500,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'overview' ? '#636366' : 'transparent',
                    color: activeTab === 'overview' ? '#FFFFFF' : 'rgba(235, 235, 245, 0.65)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Account Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12.5px',
                    fontWeight: activeTab === 'edit' ? 600 : 500,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'edit' ? '#636366' : 'transparent',
                    color: activeTab === 'edit' ? '#FFFFFF' : 'rgba(235, 235, 245, 0.65)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Edit Account
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12.5px',
                    fontWeight: activeTab === 'all' ? 600 : 500,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'all' ? '#636366' : 'transparent',
                    color: activeTab === 'all' ? '#FFFFFF' : 'rgba(235, 235, 245, 0.65)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  View Both
                </button>
              </div>
            )}

            {/* Scrollable middle container */}
            <div
              className="crm-profile-scroll-area"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: '14px 18px',
                boxSizing: 'border-box',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Profile Details List */}
              {(!isSuperAdmin || activeTab === 'overview' || activeTab === 'all') && (
                <div style={{ marginBottom: activeTab === 'all' && isSuperAdmin ? '16px' : '0' }}>
                  <div
                    className="crm-profile-body"
                    style={{
                      margin: 0,
                      padding: 0,
                      backgroundColor: '#2C2C2E',
                      border: '0.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <ProfileRow label="Email" value={user.email || '-'}>
                      {user.email && (
                        <button
                          type="button"
                          className="crm-profile-copy"
                          onClick={() => copy(user.email, 'email')}
                          title="Copy email"
                          aria-label="Copy email"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'rgba(235, 235, 245, 0.7)',
                            borderRadius: '6px',
                            width: '24px',
                            height: '24px',
                            minWidth: '24px',
                            minHeight: '24px',
                            padding: 0,
                            cursor: 'pointer',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copied === 'email' ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                    </ProfileRow>

                    {office && <ProfileRow label="Office" value={office.name} />}
                    {team && <ProfileRow label="Team" value={team.name} />}

                    <ProfileRow
                      label="Password"
                      value={
                        showPwd
                          ? (user.password || (isSuperAdmin ? 'Managed via Edit Account' : '-'))
                          : '••••••••'
                      }
                      mono
                    >
                      <button
                        type="button"
                        className="crm-profile-copy"
                        onClick={() => setShowPwd((v) => !v)}
                        title={showPwd ? 'Hide password' : 'Show password'}
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: 'rgba(235, 235, 245, 0.7)',
                          borderRadius: '6px',
                          width: '24px',
                          height: '24px',
                          minWidth: '24px',
                          minHeight: '24px',
                          padding: 0,
                          cursor: 'pointer',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                      {user.password && (
                        <button
                          type="button"
                          className="crm-profile-copy"
                          onClick={() => copy(user.password, 'pwd')}
                          title="Copy password"
                          aria-label="Copy password"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'rgba(235, 235, 245, 0.7)',
                            borderRadius: '6px',
                            width: '24px',
                            height: '24px',
                            minWidth: '24px',
                            minHeight: '24px',
                            padding: 0,
                            cursor: 'pointer',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copied === 'pwd' ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      )}
                    </ProfileRow>

                    {user.loginLink && (
                      <ProfileRow label="Login link" value={user.loginLink} mono link>
                        <button
                          type="button"
                          className="crm-profile-copy"
                          onClick={() => copy(user.loginLink, 'link')}
                          title="Copy login link"
                          aria-label="Copy login link"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'rgba(235, 235, 245, 0.7)',
                            borderRadius: '6px',
                            width: '24px',
                            height: '24px',
                            minWidth: '24px',
                            minHeight: '24px',
                            padding: 0,
                            cursor: 'pointer',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copied === 'link' ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </ProfileRow>
                    )}

                    <ProfileRow
                      label="Status"
                      value={
                        <>
                          <span
                            className={
                              'crm-profile-status ' + (user.isLoggedIn ? 'is-online' : 'is-offline')
                            }
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              display: 'inline-block',
                              flexShrink: 0,
                              backgroundColor: user.isLoggedIn ? '#30D158' : '#8E8E93',
                            }}
                          />
                          <span>{user.isLoggedIn ? 'Online' : 'Offline'}</span>
                        </>
                      }
                    />
                  </div>

                  {isSuperAdmin && activeTab === 'overview' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#2C2C2E',
                        border: '0.5px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#0A84FF',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <span>Edit Account Details</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Edit Account Section (Super Admin) */}
              {isSuperAdmin && (activeTab === 'edit' || activeTab === 'all') && (
                <div
                  className="crm-profile-edit-section"
                  style={{
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    className="crm-profile-edit-heading"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'rgba(235, 235, 245, 0.5)',
                      margin: '0 0 8px 4px',
                    }}
                  >
                    Edit Account
                  </div>

                  {editError && (
                    <div
                      className="crm-profile-edit-banner crm-profile-edit-error"
                      style={{
                        fontSize: '12.5px',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        marginBottom: '10px',
                        backgroundColor: 'rgba(255, 69, 58, 0.15)',
                        border: '0.5px solid rgba(255, 69, 58, 0.3)',
                        color: '#FF453A',
                      }}
                    >
                      {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div
                      className="crm-profile-edit-banner crm-profile-edit-success"
                      style={{
                        fontSize: '12.5px',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        marginBottom: '10px',
                        backgroundColor: 'rgba(48, 209, 88, 0.15)',
                        border: '0.5px solid rgba(48, 209, 88, 0.3)',
                        color: '#30D158',
                      }}
                    >
                      {editSuccess}
                    </div>
                  )}

                  {/* Display Name */}
                  <div
                    className="crm-profile-edit-field"
                    style={{
                      backgroundColor: '#2C2C2E',
                      border: '0.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      marginBottom: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <label
                      className="crm-profile-edit-label"
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 500,
                        color: 'rgba(235, 235, 245, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: 0,
                      }}
                    >
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditError(''); setEditSuccess(''); }}
                      placeholder="Your full name"
                      autoComplete="name"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        padding: '2px 0',
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Login Email */}
                  <div
                    className="crm-profile-edit-field"
                    style={{
                      backgroundColor: '#2C2C2E',
                      border: '0.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      marginBottom: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <label
                      className="crm-profile-edit-label"
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 500,
                        color: 'rgba(235, 235, 245, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: 0,
                      }}
                    >
                      Login Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => { setEditEmail(e.target.value); setEditError(''); setEditSuccess(''); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        padding: '2px 0',
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* New Password */}
                  <div
                    className="crm-profile-edit-field"
                    style={{
                      backgroundColor: '#2C2C2E',
                      border: '0.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      marginBottom: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <label
                      className="crm-profile-edit-label"
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 500,
                        color: 'rgba(235, 235, 245, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: 0,
                      }}
                    >
                      New Password <span className="crm-profile-edit-hint" style={{ fontSize: '10px', textTransform: 'none', letterSpacing: 0, color: 'rgba(235, 235, 245, 0.4)', marginLeft: '4px' }}>(leave blank to keep current)</span>
                    </label>
                    <div
                      className="crm-pw-input-wrap"
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <input
                        type={editPwShown ? 'text' : 'password'}
                        value={editPassword}
                        onChange={e => { setEditPassword(e.target.value); setEditError(''); setEditSuccess(''); }}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          padding: '2px 28px 2px 0',
                          fontFamily: 'inherit',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        className="crm-pw-toggle"
                        onClick={() => setEditPwShown(v => !v)}
                        aria-label={editPwShown ? 'Hide password' : 'Show password'}
                        title={editPwShown ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'rgba(235, 235, 245, 0.6)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {editPwShown ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 4.22-5.22" />
                            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19" />
                            <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (if password entered) */}
                  {editPassword && (
                    <div
                      className="crm-profile-edit-field"
                      style={{
                        backgroundColor: '#2C2C2E',
                        border: '0.5px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <label
                        className="crm-profile-edit-label"
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 500,
                          color: 'rgba(235, 235, 245, 0.5)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          margin: 0,
                        }}
                      >
                        Confirm New Password
                      </label>
                      <div
                        className="crm-pw-input-wrap"
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <input
                          type={editConfirmShown ? 'text' : 'password'}
                          value={editConfirm}
                          onChange={e => { setEditConfirm(e.target.value); setEditError(''); setEditSuccess(''); }}
                          placeholder="Repeat new password"
                          autoComplete="new-password"
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            padding: '2px 28px 2px 0',
                            fontFamily: 'inherit',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          className="crm-pw-toggle"
                          onClick={() => setEditConfirmShown(v => !v)}
                          aria-label={editConfirmShown ? 'Hide password' : 'Show password'}
                          title={editConfirmShown ? 'Hide password' : 'Show password'}
                          style={{
                            position: 'absolute',
                            right: 0,
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'rgba(235, 235, 245, 0.6)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {editConfirmShown ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 4.22-5.22" />
                              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19" />
                              <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {editConfirm && editPassword !== editConfirm && (
                        <span
                          className="crm-profile-edit-mismatch"
                          style={{
                            fontSize: '11px',
                            color: '#FF453A',
                            marginTop: '2px',
                          }}
                        >
                          Passwords do not match
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="crm-profile-edit-save"
                    onClick={saveAccountDetails}
                    disabled={editSaving || (editPassword && editPassword !== editConfirm)}
                    style={{
                      backgroundColor: '#0A84FF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: editSaving || (editPassword && editPassword !== editConfirm) ? 'not-allowed' : 'pointer',
                      opacity: editSaving || (editPassword && editPassword !== editConfirm) ? 0.45 : 1,
                      marginTop: '4px',
                      transition: 'all 0.14s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Pinned Footer */}
            <div
              className="crm-profile-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                backgroundColor: '#1C1C1E',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                className="crm-profile-secondary"
                onClick={closeModal}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(120, 120, 128, 0.24)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.14s ease',
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="crm-profile-logout"
                onClick={handleLogout}
                disabled={signingOut}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 69, 58, 0.16)',
                  border: '0.5px solid rgba(255, 69, 58, 0.32)',
                  color: '#FF453A',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: signingOut ? 'not-allowed' : 'pointer',
                  opacity: signingOut ? 0.6 : 1,
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.14s ease',
                }}
              >
                <LogoutIcon size={14} />
                <span>{signingOut ? 'Signing out...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ProfileRow({ label, value, mono, link, children }) {
  return (
    <div
      className="crm-profile-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        minHeight: '40px',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
        gap: '12px',
        boxSizing: 'border-box',
      }}
    >
      <span
        className="crm-profile-label"
        style={{
          fontSize: '13.5px',
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: 'rgba(235, 235, 245, 0.6)',
          textTransform: 'none',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        className="crm-profile-value-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          className={
            'crm-profile-value' +
            (mono ? ' crm-profile-mono' : '') +
            (link ? ' crm-profile-link' : '')
          }
          style={{
            fontSize: '13.5px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: link ? '#0A84FF' : '#FFFFFF',
            fontFamily: mono ? '-apple-system-monospaced, SFMono-Regular, "SF Mono", Menlo, monospace' : 'inherit',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {value}
        </span>
        {children && (
          <div
            className="crm-profile-row-actions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SearchAutocomplete
 * A typeahead-style search input. The parent owns the value (so all existing
 * filtering logic keeps working unchanged); we only add a small floating list
 * of matching suggestions while typing. Picking a suggestion sets the value
 * to its `value` field and closes the dropdown.
 *
 * Props:
 *   value, onChange, placeholder, className, style, autoComplete
 *   buildSuggestions(query) -> Array<{ value, label, meta?, key? }>
 *   fetchSuggestions(query) -> Promise<Array<{ value, label, meta?, key? }>>
 *   onSelect(suggestion) -> optional callback with the selected suggestion
 *   maxSuggestions (default 8)
 *   inputProps (extra props forwarded to the <input>)
 */
export function SearchAutocomplete({
  value,
  onChange,
  placeholder,
  className = 'crm-super-admin-input',
  style,
  autoComplete = 'off',
  buildSuggestions,
  fetchSuggestions,
  onSelect,
  maxSuggestions = 8,
  inputProps = {},
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const wrapRef = useRef(null);
  const requestRef = useRef(0);

  const localSuggestions = useMemo(() => {
    const q = (value || '').trim();
    if (!q || !buildSuggestions) return [];
    let list = [];
    try {
      list = buildSuggestions(q) || [];
    } catch (_) {
      list = [];
    }
    return list.slice(0, maxSuggestions);
  }, [value, buildSuggestions, maxSuggestions]);

  useEffect(() => {
    if (!fetchSuggestions) return undefined;

    const q = (value || '').trim();
    const requestId = ++requestRef.current;
    if (!q) {
      setRemoteSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await fetchSuggestions(q, { limit: maxSuggestions });
        if (!cancelled && requestId === requestRef.current) {
          setRemoteSuggestions(Array.isArray(result) ? result.slice(0, maxSuggestions) : []);
        }
      } catch (_) {
        // The parent search/table remains usable if the typeahead request
        // fails. Never replace newer results with an older failed request.
        if (!cancelled && requestId === requestRef.current) setRemoteSuggestions([]);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, fetchSuggestions, maxSuggestions]);

  const suggestions = fetchSuggestions ? remoteSuggestions : localSuggestions;

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Keep highlight in range when the suggestion list shrinks/grows.
  useEffect(() => {
    if (highlight >= suggestions.length) setHighlight(-1);
  }, [suggestions, highlight]);

  const showDropdown = open && suggestions.length > 0;

  const pick = (s) => {
    if (!s) return;
    onChange(s.value);
    if (onSelect) onSelect(s);
    setOpen(false);
    setHighlight(-1);
  };

  return (
    <div
      ref={wrapRef}
      className="crm-search-autocomplete"
      style={{
        position: 'relative',
        flex: style?.flex,
        minWidth: style?.minWidth,
        maxWidth: style?.maxWidth,
        width: style?.width,
      }}
    >
      <input
        {...inputProps}
        className={className}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && suggestions.length > 0) {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            if (showDropdown && highlight >= 0) {
              e.preventDefault();
              pick(suggestions[highlight]);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
          if (inputProps.onKeyDown) inputProps.onKeyDown(e);
        }}
        style={{ ...style, width: '100%' }}
      />
      {showDropdown && (
        <div className="crm-search-suggest" role="listbox">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.key != null ? s.key : `${s.value}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={
                'crm-search-suggest-item' + (i === highlight ? ' is-active' : '')
              }
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              <span className="crm-search-suggest-label">{s.label}</span>
              {s.meta != null && s.meta !== '' && (
                <span className="crm-search-suggest-meta">{s.meta}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserChrome;
