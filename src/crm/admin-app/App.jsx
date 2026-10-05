import React, { useState, useEffect, useCallback } from 'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import './admin.css';
import { usePlatformSettings } from '../platformDefaults';
import StaffLogin from './components/Login/StaffLogin.jsx';
import RoleLogin from './components/Login/RoleLogin.jsx';
import {
  getAdminToken,
  getStoredAdminProfile,
  mapAdminToUser,
  fetchAdminMe,
  createOffice,
  createTeam,
  createAgentApi,
  createStaffApi,
  assignOfficeManagerApi,
  blockStaffApi,
  unblockStaffApi,
  listOffices,
  listTeams,
  fetchAllLeads,
  fetchLeadById,
  listStaff,
  updateLeadApi,
  assignLeadApi,
  createLeadApi,
  sendHeartbeat,
} from './adminApi';

import {
  ROLE,
  ErrorBoundary,
  makeLoginLink,
  initialData,
  getOfficeName,
  getTeamName,
  getUserName,
  getTeamAgentCount,
  normalizeLeadAssignment,
} from './shared';

import SuperAdminPanel from './panels/SuperAdminPanel.jsx';
import OfficeManagerPanel from './panels/OfficeManagerPanel.jsx';
import TeamLeaderPanel from './panels/TeamLeaderPanel.jsx';
import AgentPanel, { LeadProfilePage } from './panels/AgentPanel.jsx';
import StaffProfilePage from './components/StaffProfilePage.jsx';
import { UserChrome } from './components/UserChrome.jsx';
import ReactCapabilityWorkspace from './components/ReactCapabilityWorkspace.jsx';
import { Crown, Building2, Users, UserCheck, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react';
import { applyCrmThemeToDom, loadCrmThemeFromServer } from './components/CrmSettings/crmThemeState';

const CRM_ICON_TOKENS = {
  office: '🏢',
  users: '👥',
  agents: '👥',
  agent: '👤',
  user: '👤',
  money: '💰',
  card: '💳',
  list: '☷',
  search: '⌕',
  upload: '↥',
  file: '▤',
  chart: '▥',
  status: '●',
  trend: '↗',
  top: '★',
  pending: '◷',
  deposit: '💰',
  security: '🔒',
  reload: '↻',
  close: '×',
  unknown: '?',
};

const WINDOWS_1252_BYTES = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85,
  '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c,
  'ž': 0x9e, 'Ÿ': 0x9f,
};

function repairLegacyUtf8(value) {
  if (!/[ðâÃ]/.test(value)) return value;
  const bytes = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0xff) bytes.push(codePoint);
    else if (WINDOWS_1252_BYTES[character] !== undefined) bytes.push(WINDOWS_1252_BYTES[character]);
    else return value;
  }
  try {
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return repaired.includes('�') ? value : repaired;
  } catch (_) {
    return value;
  }
}

function normalizeCrmText(value) {
  const repaired = repairLegacyUtf8(value).replace(/\[([a-z][a-z -]{1,40})\]/gi, (token, name) => (
    CRM_ICON_TOKENS[name.toLowerCase()] || token
  ));
  return repaired.replace(/ðŸ¢/g, '🏢');
}

function useCrmTextNormalization() {
  useEffect(() => {
    let scheduled = false;

    const normalize = () => {
      const root = document.querySelector('.crm-admin-app');
      if (!root) return;

      observer?.disconnect();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node = walker.nextNode();
      while (node) {
        if (!node.parentElement?.closest('script, style')) textNodes.push(node);
        node = walker.nextNode();
      }
      textNodes.forEach((textNode) => {
        const nextValue = normalizeCrmText(textNode.nodeValue || '');
        if (nextValue !== textNode.nodeValue) textNode.nodeValue = nextValue;
      });

      root.querySelectorAll('[placeholder], [title], [aria-label], optgroup[label]').forEach((element) => {
        ['placeholder', 'title', 'aria-label', 'label'].forEach((attribute) => {
          if (!element.hasAttribute(attribute)) return;
          const currentValue = element.getAttribute(attribute);
          const nextValue = normalizeCrmText(currentValue || '');
          if (nextValue !== currentValue) element.setAttribute(attribute, nextValue);
        });
      });

      observer?.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'label'],
      });
    };

    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        normalize();
      });
    });
    normalize();
    return () => observer.disconnect();
  }, []);
}

// Re-export shared symbols that admin sub-components still import from `../../App`.
// Keeping this barrel export prevents a sweeping import-path rewrite across
// every component file just to support the panel split.
export { DataContext, NotificationContext, LEAD_STATUSES } from './shared';

// Live-updating brand mark: reads platformAbbreviation from the backend-driven
// module singleton. Re-renders instantly whenever settings are saved via the
// admin Settings page - no localStorage involved.
function useBrandIdentity() {
  const s = usePlatformSettings();
  return { abbreviation: s.platformAbbreviation, name: s.platformName };
}

function AdminBrand() {
  const { abbreviation, name } = useBrandIdentity();
  const [first, ...rest] = (name || 'Codex Dynamics').split(/[- / \s]+/);
  const second = rest.join(' ') || 'Dynamics';
  return (
    <div className="crm-brand">
      <span className="crm-brand-mark">{abbreviation || 'CD'}</span>
      <span className="crm-brand-text">{first} {second}<span className="crm-brand-tag">CRM</span></span>
    </div>
  );
}

function RolePage({ data, dataLoading, role, setLeadAssignment, assignOfficeManager, createOfficeWithManager, createStandaloneOfficeManager, assignTeamLeader, createTeamLeader, createStandaloneTeamLeader, createAgent, assignAgent, toggleStaffBlocked, setData, setUserLoginState, updateLead, createLead, showNotification }) {
  const { userId } = useParams();
  const user = data.users.find((u) => u.id === userId);
  const [canCreateAgent, setCanCreateAgent] = useState(false);

  useEffect(() => {
    if (role !== ROLE.TEAM_LEADER || !user?.id) {
      setCanCreateAgent(false);
      return;
    }
    // Agents created by a Team Leader join that leader's team.
    setCanCreateAgent(Boolean(user?.teamId));
  }, [role, user?.id, user?.teamId]);

  if (!user) {
    if (dataLoading) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--crm-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crm-text-secondary)', fontSize: 14 }}>
          Loading...
        </div>
      );
    }
    return <Navigate to="/admin" replace />;
  }
  if (user.role !== role) {
    return (
      <div className="crm-app-shell">
        <header className="crm-topbar">
          <AdminBrand />
          <div className="crm-top-actions">Role mismatch</div>
        </header>
        <div className="crm-body-grid">
          <aside className="crm-sidebar">
            <h2>Dashboard</h2>
            <Link className="crm-nav-link" to="">Home</Link>
          </aside>
          <main className="crm-main-content">
            <div className="crm-card"><h3>Access Denied</h3><p>Client role mismatch for this route.</p><Link className="crm-link-item" to="">Back Home</Link></div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-app-shell">
      <header className="crm-topbar">
        <AdminBrand />
        <div className="crm-top-actions">
          <UserChrome user={user} data={data} setData={setData} />
        </div>
      </header>

      <div className={`crm-body-grid ${user.role === ROLE.AGENT ? 'crm-agent-view' : ''} ${user.role === ROLE.TEAM_LEADER ? 'crm-no-sidebar' : ''} ${user.role === ROLE.OFFICE_MANAGER ? 'crm-no-sidebar' : ''} ${user.role === ROLE.SUPER_ADMIN ? 'crm-no-sidebar' : ''}`}>
        {user.role === ROLE.SUPER_ADMIN && (
          <aside className="crm-sidebar">
            <h2>Menu</h2>
            <Link className="crm-nav-link" to="/admin">Home</Link>
            <Link className="crm-nav-link" to={`/admin/super-admin/${user.id}`}>Workspace</Link>

            <div className="crm-sidebar-subhead">Office Managers</div>
            {data.users.filter((u) => u.role === ROLE.OFFICE_MANAGER).map((mgr) => (
              <Link key={mgr.id} className="crm-nav-link" to={`/admin/office-manager/${mgr.id}`}>{mgr.name}</Link>
            ))}

            <div className="crm-sidebar-note">
              <strong>Current</strong>
              <div>{user.name}</div>
              <div>Office: {getOfficeName(user.officeId, data.offices)}</div>
              <div>Team: {getTeamName(user.teamId, data.teams)}</div>
            </div>
          </aside>
        )}

        <main className="crm-main-content">
          <Routes>
            <Route
              path="lead/:leadId"
              element={<LeadProfilePage role={role} viewingUser={user} data={data} setData={setData} updateLead={updateLead} showNotification={showNotification} />}
            />
            <Route
              path="staff/:staffId"
              element={<StaffProfilePage role={role} viewingUser={user} data={data} setData={setData} toggleStaffBlocked={toggleStaffBlocked} setUserLoginState={setUserLoginState} updateLead={updateLead} showNotification={showNotification} />}
            />
            <Route
              path=""
              element={(
                <>
                  {role === ROLE.SUPER_ADMIN && <SuperAdminPanel data={data} currentUser={user} setData={setData} assignOfficeManager={assignOfficeManager} createOfficeWithManager={createOfficeWithManager} createStandaloneOfficeManager={createStandaloneOfficeManager} createTeamLeader={createTeamLeader} createStandaloneTeamLeader={createStandaloneTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} setLeadAssignment={setLeadAssignment} setUserLoginState={setUserLoginState} createLead={createLead} showNotification={showNotification} />}
                  {role === ROLE.OFFICE_MANAGER && <OfficeManagerPanel data={data} setData={setData} currentUser={user} assignTeamLeader={assignTeamLeader} createTeamLeader={createTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} setLeadAssignment={setLeadAssignment} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />}
                  {role === ROLE.TEAM_LEADER && <TeamLeaderPanel data={data} setData={setData} currentUser={user} createAgent={createAgent} canCreateAgent={canCreateAgent} toggleStaffBlocked={toggleStaffBlocked} setLeadAssignment={setLeadAssignment} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />}
                  {role === ROLE.AGENT && <AgentPanel data={data} currentUser={user} setData={setData} setUserLoginState={setUserLoginState} createLead={createLead} showNotification={showNotification} />}
                </>
              )}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function BackofficeLanding() {
  const navigate = useNavigate();
  const { abbreviation, name } = useBrandIdentity();
  const [first, ...rest] = (name || 'Codex Dynamics').split(/[- / \s]+/);
  const second = rest.join(' ') || 'Dynamics';
  const initial = (abbreviation || 'C').charAt(0).toUpperCase();

  const portals = [
    { to: '/admin/login/super-admin',    icon: Crown, title: 'Super Admin',    desc: 'Full system governance: offices, teams, staff & leads', accent: '#FF9F0A', gradient: 'linear-gradient(135deg, #FF9F0A, #FF375F)' },
    { to: '/admin/login/office-manager', icon: Building2, title: 'Office Manager', desc: 'Oversee your office branch, teams, agents and pipeline',  accent: '#0A84FF', gradient: 'linear-gradient(135deg, #0A84FF, #5E5CE6)' },
    { to: '/admin/login/team-leader',    icon: Users, title: 'Team Leader',    desc: 'Coach your unit: monitor agents, calls & active leads',     accent: '#5E5CE6', gradient: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' },
    { to: '/admin/login/agent',          icon: UserCheck, title: 'Sales Agent', desc: 'Work assigned leads, log touchpoints & record deposits', accent: '#30D158', gradient: 'linear-gradient(135deg, #30D158, #64D2FF)' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 15%, rgba(10, 132, 255, 0.12) 0%, rgba(0, 0, 0, 0.98) 65%, #000000 100%)',
      color: '#F5F5F7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
      WebkitFontSmoothing: 'antialiased',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(10, 132, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{initial}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            {first} {second}
          </div>
        </div>
        <div style={{ fontSize: 16, color: '#8E8E93', fontWeight: 500, letterSpacing: '-0.01em' }}>Apple iOS Inspired Backoffice Suite</div>
        <div style={{ fontSize: 13, color: '#636366', marginTop: 4, letterSpacing: '-0.005em' }}>Select a role workspace to launch an instant authenticated session.</div>
      </div>

      {/* Role Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 18,
        width: '100%',
        maxWidth: 1040,
        marginBottom: 28,
        position: 'relative',
        zIndex: 1,
      }}>
        {portals.map((p) => {
          const IconComp = p.icon;
          return (
            <div
              key={p.to}
              onClick={() => navigate(p.to)}
              style={{
                background: 'rgba(28, 28, 32, 0.72)',
                backdropFilter: 'blur(30px) saturate(190%)',
                WebkitBackdropFilter: 'blur(30px) saturate(190%)',
                border: '0.5px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '24px',
                padding: '28px 22px',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.015)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.boxShadow = `inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 16px 42px rgba(0,0,0,0.5), 0 0 0 1px ${p.accent}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                e.currentTarget.style.boxShadow = 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.35)';
              }}
            >
              <div style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: p.gradient,
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: `0 8px 20px ${p.accent}40, inset 0 1px 0 rgba(255, 255, 255, 0.35)`,
              }}>
                <IconComp size={24} strokeWidth={2.2} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16.5, marginBottom: 8, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{p.title}</div>
              <div style={{ color: '#8E8E93', fontSize: 12.5, lineHeight: 1.5, letterSpacing: '-0.01em' }}>{p.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Client Portal Link */}
      <div
        onClick={() => {
          if (typeof window !== 'undefined' && typeof window.cdxNavigate === 'function') {
            window.cdxNavigate('/login');
          } else {
            window.location.assign('/login');
          }
        }}
        style={{
          background: 'rgba(28, 28, 32, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '0.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 999,
          padding: '10px 22px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          position: 'relative',
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(10,132,255,0.2)',
          color: '#0A84FF',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Briefcase size={14} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF', letterSpacing: '-0.01em' }}>Client Workspace Portal</div>
        </div>
        <ArrowRight size={14} style={{ color: '#8E8E93', marginLeft: 4 }} />
      </div>
    </div>
  );
}

/**
 * Injects a real admin user (from the backend) into a user list,
 * replacing any existing entry with the same id so there are no duplicates.
 */
function injectAdminUser(users, adminUser) {
  const filtered = users.filter((u) => u.id !== adminUser.id);
  return [...filtered, adminUser];
}

// The admin app is backend-driven: offices, teams, leads, and staff users
// hydrate via `loadBackendAdminData()` and the per-panel APIs. Earlier
// localStorage snapshots that cached the entire `data` object client-side
// are removed on mount so lead history and assignments stay consistent across
// sessions and admins. Only the admin's own profile is rehydrated synchronously
// (via `getStoredAdminProfile`) so panel routes can find the user in
// `data.users` before the network returns.
const LEGACY_ADMIN_CACHE_KEYS = ['codex_admin_data_legacy'];

function App() {
  useCrmTextNormalization();

  useEffect(() => {
    applyCrmThemeToDom();
    loadCrmThemeFromServer().catch(() => {});
    const handleThemeChange = () => applyCrmThemeToDom();
    window.addEventListener('cdx:crm-theme-changed', handleThemeChange);
    return () => window.removeEventListener('cdx:crm-theme-changed', handleThemeChange);
  }, []);

  const [data, setData] = useState(() => {
    try {
      // Best-effort: clear any legacy data caches so stale lead snapshots
      // never resurface from a previous session.
      LEGACY_ADMIN_CACHE_KEYS.forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      // Synchronously restore the real admin profile so panel routes can find
      // the user in data.users immediately on mount (before any async effect).
      const storedProfile = getStoredAdminProfile();
      if (storedProfile) {
        return {
          ...initialData,
          users: injectAdminUser(initialData.users, mapAdminToUser(storedProfile)),
        };
      }
    } catch (_) {}
    return initialData;
  });
  const [notification, setNotification] = useState('');
  const [appLoaded, setAppLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const loadBackendAdminData = useCallback(async () => {
    try {
      const [offices, teams, liveResult, deletedResult, staffRows, deletedOffices, deletedTeams, deletedStaff] = await Promise.all([
        listOffices(),
        listTeams(),
        fetchAllLeads(),
        fetchAllLeads({ includeDeleted: 'only' }).catch(() => ({ leads: [] })),
        listStaff(),
        listOffices({ includeDeleted: 'only' }).catch(() => []),
        listTeams({ includeDeleted: 'only' }).catch(() => []),
        listStaff({ includeDeleted: 'only' }).catch(() => []),
      ]);

      const recycleBin = [
        ...(deletedOffices || []).map((o) => ({
          id: o.id,
          type: 'office',
          item: o,
          deletedAt: o.deletedAt || new Date().toISOString(),
        })),
        ...(deletedTeams || []).map((t) => ({
          id: t.id,
          type: 'team',
          item: t,
          deletedAt: t.deletedAt || new Date().toISOString(),
        })),
        ...(deletedStaff || []).map((s) => ({
          id: s.id,
          type: 'user',
          item: s,
          deletedAt: s.deletedAt || new Date().toISOString(),
        })),
      ];

      setData((prev) => {
        const storedProfile = getStoredAdminProfile();
        const sessionAdmin = storedProfile
          ? prev.users.find((u) => u.id === storedProfile.id)
          : null;

        let mergedUsers = staffRows;
        if (sessionAdmin && !mergedUsers.some((u) => u.id === sessionAdmin.id)) {
          mergedUsers = [...mergedUsers, sessionAdmin];
        }

        const normalizedLeads = (liveResult.leads || []).map((lead) =>
          normalizeLeadAssignment(lead, mergedUsers, teams)
        );

        const deletedLeads = (deletedResult.leads || []).map((lead) =>
          normalizeLeadAssignment(lead, mergedUsers, teams)
        );

        return {
          ...prev,
          offices,
          teams,
          leads: normalizedLeads,
          deletedLeads,
          recycleBin,
          users: mergedUsers,
        };
      });
    } catch (error) {
      console.error('[App] failed to load admin backend data', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    setAppLoaded(true);

    window.onerror = (message, source, lineno, colno, error) => {
      console.error('[App] Error:', message, source, lineno, colno, error);
      return true;
    };

    const initSession = async () => {
      try {
        const freshAdmin = await fetchAdminMe();
        const adminUser  = mapAdminToUser(freshAdmin);
        setData((prev) => ({
          ...prev,
          users: injectAdminUser(prev.users, adminUser),
        }));
        await loadBackendAdminData();
      } catch (_) {
        // Token missing or invalid. Do not request protected CRM data before
        // sign-in; addAdminToData loads it after a successful login.
        setDataLoading(false);
      }
    };
    initSession();

    // Keep all role panels fresh while they are open. Search typeahead is
    // server-backed for immediate results; this interval keeps the tables and
    // local selectors in sync too, including leads created by another user.
    const leadRefreshId = setInterval(async () => {
      if (!getAdminToken()) return;
      try {
        const liveResult = await fetchAllLeads();
        setData((prev) => {
          const storedProfile = getStoredAdminProfile();
          const sessionAdmin = storedProfile
            ? prev.users.find((u) => u.id === storedProfile.id)
            : null;
          const normalizedLeads = (liveResult.leads || []).map((lead) =>
            normalizeLeadAssignment(lead, prev.users, prev.teams)
          );
          return {
            ...prev,
            leads: normalizedLeads,
            users: sessionAdmin && !prev.users.some((u) => u.id === sessionAdmin.id)
              ? [...prev.users, sessionAdmin]
              : prev.users,
          };
        });
      } catch (error) {
        console.warn('[App] background lead refresh failed', error);
      }
    }, 15000);

    const refreshStaffPresence = () => {
      if (!getAdminToken()) return;
      sendHeartbeat(undefined, window.location.pathname).catch((error) => {
        console.warn('[App] staff presence heartbeat failed', error);
      });
    };
    refreshStaffPresence();
    const staffHeartbeatId = setInterval(refreshStaffPresence, 30000);

    const handleInquirySync = () => {
      loadBackendAdminData();
    };
    window.addEventListener('storage', handleInquirySync);
    window.addEventListener('codex_inquiry_added', handleInquirySync);

    window.onunhandledrejection = (event) => {
      console.error('[App] Unhandled promise rejection:', event.reason);
      return true;
    };
    return () => {
      clearInterval(leadRefreshId);
      clearInterval(staffHeartbeatId);
      window.removeEventListener('storage', handleInquirySync);
      window.removeEventListener('codex_inquiry_added', handleInquirySync);
    };
  }, []);

  if (!appLoaded) {
    return (
      <div className="crm-admin-app" style={{ padding: 30, minHeight: '100vh' }}>
        <h1>Loading application...</h1>
      </div>
    );
  }

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  /**
   * Called by a login component after a successful real-backend auth.
   * Injects (or replaces) the admin's record in data.users so the panel
   * route can find it via data.users.find(u => u.id === userId).
   */
  const addAdminToData = (adminUser) => {
    setData((prev) => ({
      ...prev,
      users: injectAdminUser(prev.users, adminUser),
    }));
    loadBackendAdminData();
  };

  const setLeadAssignment = ({ leadId, officeId, teamId, teamLeaderId, agentId }) => {
    const lead = data.leads.find((item) => item.id === leadId);
    if (!lead) {
      showNotification(`Lead ${leadId} not found`);
      return;
    }

    const agent = agentId ? data.users.find((u) => u.id === agentId) : null;
    if (agentId && !agent) {
      showNotification(`Agent ${agentId} not found`);
      return;
    }

    // When an agent is explicitly specified, derive office/team from the agent record
    // to maintain hierarchy integrity. Otherwise use the explicit values provided.
    // Use explicit null to clear a level; use undefined to keep existing value.
    let targetAgent = agent ? agent.id : (agentId !== undefined ? (agentId || null) : lead.assignedToAgent);
    let targetTeam = agent ? agent.teamId : (teamId !== undefined ? (teamId || null) : lead.assignedToTeam);
    let targetOffice = agent ? agent.officeId : (officeId !== undefined ? (officeId || null) : lead.assignedToOffice);
    const targetTeamLeader = agent
      ? null
      : (teamLeaderId !== undefined ? (teamLeaderId || null) : lead.assignedToTeamLeader);

    // If team changed but agent not explicitly changed, clear agent
    if (!agent && teamId !== undefined && teamId !== lead.assignedToTeam && agentId === undefined) {
      targetAgent = null;
    }
    // If office changed but team not explicitly changed, clear team and agent
    if (!agent && officeId !== undefined && officeId !== lead.assignedToOffice && teamId === undefined) {
      targetTeam = null;
      targetAgent = null;
    }
    // Derive office from team when team is explicitly set but office is not
    if (targetTeam && !targetOffice) {
      const teamObj = data.teams.find(t => t.id === targetTeam);
      if (teamObj) targetOffice = teamObj.officeId;
    }

    const payload = {
      ...lead,
      assignedToOffice: targetOffice,
      assignedToTeam: targetTeam,
      assignedToTeamLeader: targetTeamLeader,
      assignedToAgent: targetAgent,
    };

    // Optimistic update keeps the panel snappy; the canonical row from the
    // server replaces it once the assign call returns (so updated_at,
    // assigned_by and any derived names match what the backend stored).
    setData((prev) => ({
      ...prev,
      leads: prev.leads.map((item) =>
        item.id === leadId
          ? {
              ...item,
              assignedToOffice: payload.assignedToOffice,
              assignedToTeam: payload.assignedToTeam,
              assignedToTeamLeader: payload.assignedToTeamLeader,
              assignedToAgent: payload.assignedToAgent,
            }
          : item
      ),
    }));

    assignLeadApi(leadId, {
      officeId: payload.assignedToOffice,
      teamId:   payload.assignedToTeam,
      teamLeaderId: payload.assignedToTeamLeader,
      agentId:  payload.assignedToAgent,
    }).then((serverLead) => {
      if (!serverLead || !serverLead.id) return;
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((item) => (item.id === leadId ? { ...item, ...serverLead } : item)),
      }));
    }).catch(async (error) => {
      console.error('[App] failed to persist lead assignment', error);
      let canonicalLead = lead;
      try {
        canonicalLead = (await fetchLeadById(leadId)) || lead;
      } catch (_) {}
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((item) =>
          item.id === leadId ? { ...item, ...canonicalLead } : item
        ),
      }));
      showNotification(error?.message || 'Could not persist lead assignment to backend.');
    });
  };

  /**
   * Create an Office + (optional) Office Manager in a single backend call.
   *
   * The backend assigns canonical ULIDs and is the source of truth - we do
   * NOT fabricate IDs locally any more, otherwise subsequent updates would
   * target rows that don't exist on the server.
   */
  const createOfficeWithManager = async (newOfficeName, newManagerName, newManagerPassword) => {
    try {
      const { office, manager } = await createOffice({
        name:            newOfficeName,
        managerName:     newManagerName || undefined,
        managerPassword: newManagerPassword || undefined,
      });

      const newManager = manager
        ? {
            id:          manager.id,
            name:        manager.name,
            email:       manager.email,
            role:        ROLE.OFFICE_MANAGER,
            officeId:    manager.officeId,
            password:    newManagerPassword || null,
            loginLink:   makeLoginLink(manager.id, ROLE.OFFICE_MANAGER),
            isLoggedIn:  false,
            lastLoginAt: null,
          }
        : null;

      setData((prev) => ({
        ...prev,
        offices: [
          ...prev.offices,
          { id: office.id, name: office.name, managerId: manager ? manager.id : null },
        ],
        users: newManager ? [...prev.users, newManager] : prev.users,
      }));

      return newManager;
    } catch (error) {
      console.error('[App] createOfficeWithManager failed', error);
      showNotification(error.message || 'Could not create office.');
      return undefined;
    }
  };

  const assignOfficeManager = async (officeId, managerId) => {
    // Optimistic UI update first - keeps the panel snappy. On error we'll
    // surface a notification and reload-on-next-mount will reconcile.
    setData((prev) => ({
      ...prev,
      offices: prev.offices.map((office) =>
        office.id === officeId ? { ...office, managerId } : office
      ),
      users: prev.users.map((u) => (u.id === managerId ? { ...u, officeId } : u)),
    }));
    try {
      await assignOfficeManagerApi(officeId, managerId);
    } catch (error) {
      console.error('[App] assignOfficeManager failed', error);
      showNotification(error.message || 'Could not assign office manager.');
    }
  };

  const assignTeamLeader = (teamId, leaderId) => {
    setData((prev) => ({
      ...prev,
      teams: prev.teams.map((team) => (team.id === teamId ? { ...team, leaderId } : team)),
      users: prev.users.map((u) =>
        u.id === leaderId
          ? { ...u, teamId, officeId: prev.teams.find((t) => t.id === teamId)?.officeId || u.officeId }
          : u
      ),
    }));
  };

  /**
   * Create a Team + (optional) Team Leader. Server assigns IDs.
   */
  const createTeamLeader = async (officeId, teamName, leaderName, leaderPassword, teamSize) => {
    try {
      const { team, leader } = await createTeam({
        officeId,
        name:           teamName,
        maxSize:        Number(teamSize) || 8,
        leaderName:     leaderName || undefined,
        leaderPassword: leaderPassword || undefined,
      });

      const newLeader = leader
        ? {
            id:          leader.id,
            name:        leader.name,
            email:       leader.email,
            role:        ROLE.TEAM_LEADER,
            officeId:    leader.officeId,
            teamId:      leader.teamId,
            password:    leaderPassword || null,
            loginLink:   makeLoginLink(leader.id, ROLE.TEAM_LEADER),
            isLoggedIn:  false,
            lastLoginAt: null,
          }
        : null;

      setData((prev) => ({
        ...prev,
        teams: [
          ...prev.teams,
          {
            id:       team.id,
            name:     team.name,
            officeId: team.officeId,
            leaderId: leader ? leader.id : null,
            maxSize:  team.maxSize,
          },
        ],
        users: newLeader ? [...prev.users, newLeader] : prev.users,
      }));

      return newLeader;
    } catch (error) {
      console.error('[App] createTeamLeader failed', error);
      showNotification(error.message || 'Could not create team.');
      return undefined;
    }
  };

  const createStandaloneOfficeManager = async (managerName, managerPassword) => {
    try {
      const created = await createStaffApi({
        role: ROLE.OFFICE_MANAGER,
        officeId: null,
        teamId: null,
        name: managerName,
        password: managerPassword,
      });
      const manager = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: ROLE.OFFICE_MANAGER,
        officeId: null,
        teamId: null,
        password: managerPassword || null,
        loginLink: makeLoginLink(created.id, ROLE.OFFICE_MANAGER),
        isLoggedIn: false,
        lastLoginAt: null,
      };
      setData((prev) => ({ ...prev, users: [...prev.users, manager] }));
      return manager;
    } catch (error) {
      console.error('[App] createStandaloneOfficeManager failed', error);
      showNotification(error.message || 'Could not create office manager.');
      return null;
    }
  };

  const createStandaloneTeamLeader = async (officeId, leaderName, leaderPassword) => {
    try {
      const created = await createStaffApi({
        role: ROLE.TEAM_LEADER,
        officeId: officeId || null,
        teamId: null,
        name: leaderName,
        password: leaderPassword,
      });
      const leader = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: ROLE.TEAM_LEADER,
        officeId: created.officeId,
        teamId: null,
        password: leaderPassword || null,
        loginLink: makeLoginLink(created.id, ROLE.TEAM_LEADER),
        isLoggedIn: false,
        lastLoginAt: null,
      };
      setData((prev) => ({ ...prev, users: [...prev.users, leader] }));
      return leader;
    } catch (error) {
      console.error('[App] createStandaloneTeamLeader failed', error);
      showNotification(error.message || 'Could not create team leader.');
      return null;
    }
  };

  /**
   * Create an Agent inside a team. Server enforces team capacity (409 if
   * full); we mirror that check client-side for instant feedback but the
   * backend is the source of truth.
   */
  const createAgent = async (teamId, agentName, agentPassword, officeId = null) => {
    const team = teamId ? data.teams.find((t) => t.id === teamId) : null;
    if (teamId && !team) return null;
    const currentCount = team ? getTeamAgentCount(teamId, data.users) : 0;
    if (team && team.maxSize != null && currentCount >= team.maxSize) {
      showNotification(`Team ${team.name} is at capacity.`);
      return null;
    }

    try {
      const created = await createAgentApi({
        teamId: team?.id || null,
        officeId: team ? team.officeId : officeId,
        name:     agentName,
        password: agentPassword,
      });

      const newAgent = {
        id:          created.id,
        name:        created.name,
        email:       created.email,
        role:        ROLE.AGENT,
        officeId:    created.officeId,
        teamId:      created.teamId,
        password:    agentPassword || null,
        loginLink:   makeLoginLink(created.id, ROLE.AGENT),
        isLoggedIn:  false,
        lastLoginAt: null,
      };

      setData((prev) => ({
        ...prev,
        users: [...prev.users, newAgent],
      }));

      return newAgent;
    } catch (error) {
      console.error('[App] createAgent failed', error);
      showNotification(error.message || 'Could not create agent.');
      return null;
    }
  };

  /**
   * Toggle a staff account's Suspended/Active status. Used by the staff
   * tables in SuperAdminPanel + role panels. The argument shape is
   * (staffId, isCurrentlyBlocked) so the panels don't need to know about
   * the API verb.
   */
  const toggleStaffBlocked = async (staffId, currentlyBlocked) => {
    try {
      const fn = currentlyBlocked ? unblockStaffApi : blockStaffApi;
      const updated = await fn(staffId);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === staffId ? { ...u, status: updated.status } : u
        ),
      }));
      return updated;
    } catch (error) {
      console.error('[App] toggleStaffBlocked failed', error);
      showNotification(error.message || 'Could not update staff status.');
      return null;
    }
  };

  const assignAgent = (agentId, teamId) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === agentId
          ? { ...u, teamId, officeId: prev.teams.find((t) => t.id === teamId)?.officeId || u.officeId }
          : u
      ),
    }));
  };

  const setUserLoginState = (userId, isLoggedIn) => {
    const now = new Date().toISOString();
    setData((prev) => {
      const targetUser = prev.users.find(u => u.id === userId);
      const lastLoginAt = isLoggedIn ? now : (targetUser?.lastLoginAt || null);
      const updatedUsers = prev.users.map((u) => {
        if (u.id !== userId) return u;
        const sessions = Array.isArray(u.loginSessions) ? [...u.loginSessions] : [];
        if (isLoggedIn) {
          sessions.push({ loginAt: now, logoutAt: null, durationMs: 0 });
        } else {
          for (let i = sessions.length - 1; i >= 0; i -= 1) {
            if (!sessions[i].logoutAt) {
              const loginAt = new Date(sessions[i].loginAt).getTime();
              const logoutAt = new Date(now).getTime();
              sessions[i] = { ...sessions[i], logoutAt: now, durationMs: Math.max(0, logoutAt - loginAt) };
              break;
            }
          }
        }
        return { ...u, isLoggedIn, lastLoginAt, loginSessions: sessions.slice(-50) };
      });

      return { ...prev, users: updatedUsers };
    });

  };

  /**
   * Create a brand-new lead via the live backend.
   *
   * The backend assigns a canonical ULID, auto-defaults office/team to the
   * caller's scope when omitted (so OM/TL can't accidentally create leads
   * outside their silo), seeds an initial status_history row for the
   * starting stage, and writes an audit_log entry - all in one atomic operation.
   *
   * Returns the canonical server lead (already shape-mapped to camelCase)
   * or null on failure. Surfaces errors via showNotification rather than
   * throwing, so callers can branch on `if (created) ...` cleanly.
   */
  const createLead = async (payload) => {
    try {
      const serverLead = await createLeadApi(payload);
      if (!serverLead || !serverLead.id) {
        showNotification('Lead creation returned no row.');
        return null;
      }
      setData((prev) => {
        const normalized = normalizeLeadAssignment(serverLead, prev.users, prev.teams);
        return { ...prev, leads: [normalized, ...prev.leads] };
      });
      const display = serverLead.name || `${serverLead.firstName || ''} ${serverLead.lastName || ''}`.trim();
      showNotification(`Lead "${display || serverLead.id}" created.`);
      return serverLead;
    } catch (error) {
      console.error('[App] createLead failed', error);
      showNotification(error.message || 'Could not create lead.');
      return null;
    }
  };

  const updateLead = (leadId, updates) => {
    const { _actorName, _actorId, ...rest } = updates;
    const originalLead = data.leads.find((lead) => lead.id === leadId);
    setData((prev) => ({
      ...prev,
      leads: prev.leads.map((lead) => {
        if (lead.id !== leadId) return lead;
        const actorName = _actorName
          || getUserName(_actorId || lead.assignedToAgent, prev.users)
          || 'Unknown';
        // Append comment to history when comment text supplied (not commentHistory directly)
        const nextHistory = Array.isArray(rest.commentHistory)
          ? rest.commentHistory
          : (lead.commentHistory || []).slice();
        if (rest.comment && !Array.isArray(rest.commentHistory)) {
          nextHistory.push({
            text: rest.comment,
            by: actorName,
            date: rest.lastCommentDate || new Date().toISOString().slice(0, 10),
          });
        }
        // Track status changes in statusHistory
        const prevStatusHistory = Array.isArray(lead.statusHistory) ? lead.statusHistory : [];
        let nextStatusHistory = prevStatusHistory;
        if (rest.stage && rest.stage !== lead.stage) {
          nextStatusHistory = [...prevStatusHistory, {
            from: lead.stage || 'New',
            to: rest.stage,
            by: _actorId || lead.assignedToAgent || null,
            byName: actorName,
            at: new Date().toISOString(),
          }].slice(-100);
        }
        return { ...lead, ...rest, commentHistory: nextHistory, statusHistory: nextStatusHistory };
      }),
    }));

    updateLeadApi(leadId, rest).then((serverLead) => {
      // Replace optimistic row with the canonical server row so the
      // commentHistory / statusHistory UI always reflects the source of truth.
      if (!serverLead || !serverLead.id) return;
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((item) => (item.id === leadId ? { ...item, ...serverLead } : item)),
      }));
    }).catch(async (error) => {
      console.error('[App] updateLead failed', error);
      let canonicalLead = originalLead;
      try {
        canonicalLead = (await fetchLeadById(leadId)) || originalLead;
      } catch (_) {}
      if (canonicalLead) {
        setData((prev) => ({
          ...prev,
          leads: prev.leads.map((item) =>
            item.id === leadId ? { ...item, ...canonicalLead } : item
          ),
        }));
      }
      showNotification(error?.message || 'Failed to save lead update to backend.');
    });
  };

  return (
    <div className="crm-admin-app">
      {notification && (
        <div className="crm-toast-notification">
          {notification}
        </div>
      )}
      <ErrorBoundary>
        <Routes>
          <Route path="" element={<BackofficeLanding />} />
          <Route path="admin" element={<BackofficeLanding />} />

          {/* Dedicated, separate login routes per role (button-only login) */}
          <Route path="login" element={<Navigate to="/admin" replace />} />
          <Route path="admin/login" element={<Navigate to="/admin" replace />} />

          <Route path="login/super-admin" element={<RoleLogin role={ROLE.SUPER_ADMIN} onAdminLogin={addAdminToData} />} />
          <Route path="admin/login/super-admin" element={<RoleLogin role={ROLE.SUPER_ADMIN} onAdminLogin={addAdminToData} />} />

          <Route path="login/office-manager" element={<RoleLogin role={ROLE.OFFICE_MANAGER} onAdminLogin={addAdminToData} />} />
          <Route path="admin/login/office-manager" element={<RoleLogin role={ROLE.OFFICE_MANAGER} onAdminLogin={addAdminToData} />} />

          <Route path="login/team-leader" element={<RoleLogin role={ROLE.TEAM_LEADER} onAdminLogin={addAdminToData} />} />
          <Route path="admin/login/team-leader" element={<RoleLogin role={ROLE.TEAM_LEADER} onAdminLogin={addAdminToData} />} />

          <Route path="login/agent" element={<RoleLogin role={ROLE.AGENT} onAdminLogin={addAdminToData} />} />
          <Route path="admin/login/agent" element={<RoleLogin role={ROLE.AGENT} onAdminLogin={addAdminToData} />} />

          {/* Bare role paths redirect to that role's dedicated login */}
          <Route path="super-admin" element={<Navigate to="/admin/login/super-admin" replace />} />
          <Route path="admin/super-admin" element={<Navigate to="/admin/login/super-admin" replace />} />
          <Route path="office-manager" element={<Navigate to="/admin/login/office-manager" replace />} />
          <Route path="admin/office-manager" element={<Navigate to="/admin/login/office-manager" replace />} />
          <Route path="team-leader" element={<Navigate to="/admin/login/team-leader" replace />} />
          <Route path="admin/team-leader" element={<Navigate to="/admin/login/team-leader" replace />} />
          <Route path="agent" element={<Navigate to="/admin/login/agent" replace />} />
          <Route path="admin/agent" element={<Navigate to="/admin/login/agent" replace />} />

          {/* Legacy combined staff login retained for backward compatibility */}
          <Route path="staff-login" element={<StaffLogin onAdminLogin={addAdminToData} />} />
          <Route path="admin/staff-login" element={<StaffLogin onAdminLogin={addAdminToData} />} />

          <Route path="super-admin/:userId/*" element={<RolePage role={ROLE.SUPER_ADMIN} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignOfficeManager={assignOfficeManager} createOfficeWithManager={createOfficeWithManager} createStandaloneOfficeManager={createStandaloneOfficeManager} createTeamLeader={createTeamLeader} createStandaloneTeamLeader={createStandaloneTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} setUserLoginState={setUserLoginState} updateLead={updateLead} createLead={createLead} showNotification={showNotification} />} />
          <Route path="admin/super-admin/:userId/*" element={<RolePage role={ROLE.SUPER_ADMIN} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignOfficeManager={assignOfficeManager} createOfficeWithManager={createOfficeWithManager} createStandaloneOfficeManager={createStandaloneOfficeManager} createTeamLeader={createTeamLeader} createStandaloneTeamLeader={createStandaloneTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} setUserLoginState={setUserLoginState} updateLead={updateLead} createLead={createLead} showNotification={showNotification} />} />

          <Route path="office-manager/:userId/*" element={<RolePage role={ROLE.OFFICE_MANAGER} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignTeamLeader={assignTeamLeader} createTeamLeader={createTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />} />
          <Route path="admin/office-manager/:userId/*" element={<RolePage role={ROLE.OFFICE_MANAGER} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignTeamLeader={assignTeamLeader} createTeamLeader={createTeamLeader} createAgent={createAgent} toggleStaffBlocked={toggleStaffBlocked} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />} />

          <Route path="team-leader/:userId/*" element={<RolePage role={ROLE.TEAM_LEADER} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignAgent={assignAgent} toggleStaffBlocked={toggleStaffBlocked} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />} />
          <Route path="admin/team-leader/:userId/*" element={<RolePage role={ROLE.TEAM_LEADER} data={data} dataLoading={dataLoading} setData={setData} setLeadAssignment={setLeadAssignment} assignAgent={assignAgent} toggleStaffBlocked={toggleStaffBlocked} updateLead={updateLead} createLead={createLead} setUserLoginState={setUserLoginState} showNotification={showNotification} />} />

          <Route path="agent/:userId/*" element={<RolePage role={ROLE.AGENT} data={data} dataLoading={dataLoading} setData={setData} setUserLoginState={setUserLoginState} updateLead={updateLead} createLead={createLead} showNotification={showNotification} />} />
          <Route path="admin/agent/:userId/*" element={<RolePage role={ROLE.AGENT} data={data} dataLoading={dataLoading} setData={setData} setUserLoginState={setUserLoginState} updateLead={updateLead} createLead={createLead} showNotification={showNotification} />} />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
