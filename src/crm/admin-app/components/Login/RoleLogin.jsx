import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROLE } from '../../shared';
import { adminLogin, mapAdminToUser, fetchAdminMe } from '../../adminApi';

const ROLE_PATH = {
  [ROLE.SUPER_ADMIN]:    'super-admin',
  [ROLE.OFFICE_MANAGER]: 'office-manager',
  [ROLE.TEAM_LEADER]:    'team-leader',
  [ROLE.AGENT]:          'agent',
};

const ROLE_META = {
  [ROLE.SUPER_ADMIN]: {
    icon: '👑',
    gradient: 'linear-gradient(135deg, #FF9F0A 0%, #FF375F 100%)',
    title: 'Super Admin',
    subtitle: 'Full System Governance & Platform Control',
    defaultEmail: 'admin@codexdynamix.com',
  },
  [ROLE.OFFICE_MANAGER]: {
    icon: '🏢',
    gradient: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)',
    title: 'Office Manager',
    subtitle: 'Branch Operations & Performance Oversight',
    defaultEmail: 'manager@codexdynamics.com',
  },
  [ROLE.TEAM_LEADER]: {
    icon: '👥',
    gradient: 'linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 100%)',
    title: 'Team Leader',
    subtitle: 'Unit Coaching & Active Pipeline Routing',
    defaultEmail: 'leader@codexdynamics.com',
  },
  [ROLE.AGENT]: {
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #30D158 0%, #64D2FF 100%)',
    title: 'Sales Agent',
    subtitle: 'Lead Acceleration & Real-Time Engagement',
    defaultEmail: 'agent@codexdynamics.com',
  },
};

const RoleLogin = ({ role, onAdminLogin }) => {
  const navigate  = useNavigate();
  const meta      = ROLE_META[role] || ROLE_META[ROLE.AGENT];
  const rolePath  = ROLE_PATH[role];

  const [email,        setEmail]        = useState(meta.defaultEmail || '');
  const [password,     setPassword]     = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    fetchAdminMe()
      .then((admin) => {
        if (admin?.role === role && admin.id) navigate(`/admin/${rolePath}/${admin.id}`, { replace: true });
      })
      .catch(() => {});
  }, [role, rolePath, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const admin = await adminLogin(email.trim(), password, role);

      if (admin.role !== role) {
        setError(`This account has the ${admin.role} role. Please use the correct login page.`);
        return;
      }

      if (typeof onAdminLogin === 'function') {
        onAdminLogin(mapAdminToUser(admin));
      }

      navigate(`/admin/${rolePath}/${admin.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, rgba(10, 132, 255, 0.12) 0%, rgba(0, 0, 0, 0.96) 65%, #000000 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* iOS Ambient Light Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '440px',
        height: '440px',
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Back navigation */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#8E8E93',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8E8E93'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
          >
            <span>‹</span>
            <span>All Portals</span>
          </Link>
        </div>

        {/* Apple iOS Inset Grouped Frosted Glass Card */}
        <div style={{
          background: 'rgba(28, 28, 32, 0.82)',
          backdropFilter: 'blur(40px) saturate(190%)',
          WebkitBackdropFilter: 'blur(40px) saturate(190%)',
          border: '0.5px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '28px',
          padding: '36px 30px',
          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 32px 84px rgba(0, 0, 0, 0.65)',
        }}>

          {/* iOS App Icon Squircle */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              margin: '0 auto 16px',
              background: meta.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}>
              {meta.icon}
            </div>

            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#0A84FF',
              marginBottom: '6px',
            }}>
              Codex Dynamics
            </div>

            <h1 style={{
              color: '#FFFFFF',
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '0 0 6px',
            }}>
              {meta.title}
            </h1>
            <p style={{
              color: '#8E8E93',
              fontSize: '0.85rem',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              margin: 0,
            }}>
              {meta.subtitle}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(255, 69, 58, 0.14)',
              border: '0.5px solid rgba(255, 69, 58, 0.35)',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ color: '#FF453A', fontSize: '15px' }}>⚠️</span>
              <span style={{ color: '#FF453A', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {error}
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{
              background: 'rgba(118, 118, 128, 0.16)',
              border: '0.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '4px',
              marginBottom: '20px',
            }}>
              {/* Email row */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}>
                <label style={{
                  display: 'block',
                  color: '#8E8E93',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@codexdynamix.com"
                  required
                  autoFocus
                  autoComplete="email"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '0',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    letterSpacing: '-0.015em',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Password row */}
              <div style={{ padding: '10px 14px', position: 'relative' }}>
                <label style={{
                  display: 'block',
                  color: '#8E8E93',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '0',
                      color: '#FFFFFF',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      letterSpacing: '-0.015em',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8E8E93',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s ease',
                    }}
                    tabIndex={-1}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.83 21.83 0 0 1-3.17 4.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Apple iOS System Blue Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                background: loading ? 'rgba(10, 132, 255, 0.5)' : '#0A84FF',
                border: 'none',
                borderRadius: '14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 600,
                letterSpacing: '-0.015em',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(10, 132, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <span>Sign In to {meta.title}</span>
              )}
            </button>
          </form>

          {/* Apple ID style credentials quick tap */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#8E8E93',
          }}>
            <span>Credential preset:</span>
            <button
              type="button"
              onClick={() => {
                setEmail(meta.defaultEmail);
                setPassword('Admin123!');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0A84FF',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              Fill Default
            </button>
          </div>
        </div>

        {/* Security Disclaimers (Apple Footnote) */}
        <p style={{
          color: '#636366',
          fontSize: '0.78rem',
          letterSpacing: '-0.005em',
          margin: '20px 0 0',
          textAlign: 'center',
        }}>
          Protected with hardware-grade JWT encryption & enterprise governance
        </p>

      </div>
    </div>
  );
};

export default RoleLogin;
