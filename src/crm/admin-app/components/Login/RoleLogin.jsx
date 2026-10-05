import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROLE } from '../../shared';
import { adminLogin, mapAdminToUser, fetchAdminMe } from '../../adminApi';
import { usePlatformSettings } from '../../../platformDefaults';

const ROLE_PATH = {
  [ROLE.SUPER_ADMIN]:    'super-admin',
  [ROLE.OFFICE_MANAGER]: 'office-manager',
  [ROLE.TEAM_LEADER]:    'team-leader',
  [ROLE.AGENT]:          'agent',
};

const ROLE_META = {
  [ROLE.SUPER_ADMIN]: {
    icon: '👑',
    accent: '#FF9F0A',
    title: 'Super Admin',
    subtitle: 'Full System Governance & Platform Control',
    defaultEmail: 'admin@codexdynamix.com',
  },
  [ROLE.OFFICE_MANAGER]: {
    icon: '🏢',
    accent: '#0A84FF',
    title: 'Office Manager',
    subtitle: 'Branch Operations & Performance Oversight',
    defaultEmail: 'manager@codexdynamics.com',
  },
  [ROLE.TEAM_LEADER]: {
    icon: '👥',
    accent: '#5E5CE6',
    title: 'Team Leader',
    subtitle: 'Unit Coaching & Active Pipeline Routing',
    defaultEmail: 'leader@codexdynamics.com',
  },
  [ROLE.AGENT]: {
    icon: '⚡',
    accent: '#30D158',
    title: 'Sales Agent',
    subtitle: 'Lead Acceleration & Real-Time Engagement',
    defaultEmail: 'agent@codexdynamics.com',
  },
};

const RoleLogin = ({ role, onAdminLogin }) => {
  const navigate  = useNavigate();
  const meta      = ROLE_META[role] || ROLE_META[ROLE.AGENT];
  const rolePath  = ROLE_PATH[role];
  const platformSettings = usePlatformSettings();
  const cleanBrand = (platformSettings?.platformName || 'Codex Dynamics').replace(/\s*\/\s*/g, ' ').replace(/\/+/g, '').trim();

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
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
      padding: '24px 16px',
      position: 'relative',
    }}>
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Back navigation */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'rgba(235, 235, 245, 0.65)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#1C1C1E',
              border: '0.5px solid rgba(255, 255, 255, 0.12)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = '#2C2C2E'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(235, 235, 245, 0.65)'; e.currentTarget.style.background = '#1C1C1E'; }}
          >
            <span>‹</span>
            <span>All Portals</span>
          </Link>
        </div>

        {/* Apple iOS Inset Grouped Matte Card */}
        <div style={{
          background: '#1C1C1E',
          border: '0.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '22px',
          padding: '36px 30px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
        }}>

          {/* iOS App Icon Squircle */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              margin: '0 auto 16px',
              background: meta.accent || '#0A84FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              color: '#FFFFFF',
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
              {cleanBrand}
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
              background: '#2C2C2E',
              border: '0.5px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              {/* Email row */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
              }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(235, 235, 245, 0.6)',
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
                  color: 'rgba(235, 235, 245, 0.6)',
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
                      color: 'rgba(235, 235, 245, 0.6)',
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
                height: '46px',
                background: loading ? 'rgba(10, 132, 255, 0.5)' : '#0A84FF',
                border: 'none',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 600,
                letterSpacing: '-0.015em',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
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
