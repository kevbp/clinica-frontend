import { useState } from 'react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { KcContext } from '../KcContext';
import type { I18n } from '../i18n';

type LoginKcContext = Extract<KcContext, { pageId: 'login.ftl' }>;

export default function Login({ kcContext }: PageProps<LoginKcContext, I18n>) {
  const { url, realm, login, message, usernameHidden } = kcContext;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hasError = message?.type === 'error';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        html, body, #root {
          height: 100%;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sgc-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .sgc-field:focus-within {
          border-color: #0F6E56 !important;
          box-shadow: 0 0 0 3px rgba(15,110,86,0.14) !important;
          background: #ffffff !important;
        }
        .sgc-field:focus-within .sgc-icon {
          stroke: #0F6E56;
        }

        .sgc-btn {
          transition: background 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
        }
        .sgc-btn:hover {
          background: #0A5A44 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15,110,86,0.38) !important;
        }
        .sgc-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(15,110,86,0.22) !important;
        }
        .sgc-btn:focus-visible {
          outline: 3px solid rgba(15,110,86,0.5);
          outline-offset: 2px;
        }

        .sgc-link { transition: color 0.15s ease; }
        .sgc-link:hover { color: #0A5A44 !important; text-decoration: underline; }
        .sgc-link:focus-visible { outline: 2px solid #0F6E56; outline-offset: 2px; border-radius: 3px; }

        .sgc-eye:hover { background: #F1F5F9; color: #0F6E56; }
        .sgc-eye:focus-visible { outline: 2px solid #0F6E56; outline-offset: 2px; }

        @keyframes sgc-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sgc-card { animation: sgc-rise 0.3s cubic-bezier(0.22, 0.68, 0, 1.1) both; }

        @media (max-width: 820px) {
          .sgc-left  { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sgc-card { animation: none !important; }
          .sgc-btn  { transition: none !important; }
        }
      `}</style>

      <div className="sgc-root" style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}>

        {/* ─── Panel izquierdo ─── */}
        <aside className="sgc-left" aria-hidden="true" style={{
          width: '44%',
          flexShrink: 0,
          background: 'linear-gradient(150deg, #0D1F35 0%, #0A3528 55%, #092E24 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem 2rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Grid overlay */}
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}
            viewBox="0 0 440 800" preserveAspectRatio="none" fill="none">
            <defs>
              <pattern id="g" x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M44 0H0V44" fill="none" stroke="white" strokeWidth="0.6"/>
              </pattern>
            </defs>
            <rect width="440" height="800" fill="url(#g)"/>
          </svg>

          {/* Glows */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '28%', right: '-80px', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,110,86,0.42) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', bottom: '10%', left: '-60px', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,0.28) 0%, transparent 70%)', filter: 'blur(35px)', pointerEvents: 'none' }} />

          {/* Logo — flex-shrink: 0 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginBottom: '1.25rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              Sistema de Gestión Clínico
            </span>
          </div>

          {/* Ilustración — flex: 1, escala con el espacio disponible */}
          <div style={{
            flex: 1,
            minHeight: 0,
            background: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '0.875rem',
            marginBottom: '1.125rem',
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 300 228" xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%', display: 'block' }}
              preserveAspectRatio="xMidYMid meet">
              {/* Top bar */}
              <rect width="300" height="26" fill="rgba(255,255,255,0.04)"/>
              <circle cx="12" cy="13" r="4.5" fill="rgba(255,255,255,0.18)"/>
              <circle cx="24" cy="13" r="4.5" fill="rgba(255,255,255,0.1)"/>
              <circle cx="36" cy="13" r="4.5" fill="rgba(255,255,255,0.06)"/>
              <rect x="95" y="8" width="110" height="10" rx="5" fill="rgba(255,255,255,0.07)"/>
              <rect x="260" y="8" width="30" height="10" rx="5" fill="rgba(255,255,255,0.07)"/>
              {/* KPI cards */}
              <rect x="6"   y="36" width="84" height="54" rx="7" fill="rgba(255,255,255,0.065)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75"/>
              <rect x="14"  y="44" width="36" height="5"  rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="14"  y="54" width="24" height="14" rx="3"   fill="rgba(16,185,129,0.55)"/>
              <rect x="14"  y="73" width="50" height="4.5" rx="2" fill="rgba(255,255,255,0.12)"/>
              <circle cx="74" cy="57" r="10" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)" strokeWidth="1"/>
              <path d="M70 57c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="rgba(16,185,129,0.8)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <rect x="98"  y="36" width="98" height="54" rx="7" fill="rgba(255,255,255,0.065)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75"/>
              <rect x="106" y="44" width="36" height="5"  rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="106" y="54" width="24" height="14" rx="3"   fill="rgba(8,145,178,0.6)"/>
              <rect x="106" y="73" width="55" height="4.5" rx="2" fill="rgba(255,255,255,0.12)"/>
              <circle cx="176" cy="57" r="10" fill="rgba(8,145,178,0.12)" stroke="rgba(8,145,178,0.4)" strokeWidth="1"/>
              <path d="M172 57h8M176 53v8" stroke="rgba(8,145,178,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="204" y="36" width="90" height="54" rx="7" fill="rgba(255,255,255,0.065)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75"/>
              <rect x="212" y="44" width="36" height="5"  rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="212" y="54" width="24" height="14" rx="3"   fill="rgba(245,158,11,0.55)"/>
              <rect x="212" y="73" width="50" height="4.5" rx="2" fill="rgba(255,255,255,0.12)"/>
              <circle cx="278" cy="57" r="10" fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.4)" strokeWidth="1"/>
              <path d="M278 53v5l3 2" stroke="rgba(245,158,11,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* ECG chart */}
              <rect x="6" y="100" width="288" height="70" rx="7" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.075)" strokeWidth="0.75"/>
              <rect x="14" y="108" width="65" height="5.5" rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="14" y="117" width="42" height="4"   rx="2"   fill="rgba(255,255,255,0.1)"/>
              <line x1="14" y1="152" x2="286" y2="152" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
              <line x1="14" y1="142" x2="286" y2="142" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
              <line x1="14" y1="162" x2="286" y2="162" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
              <polyline
                points="14,152 38,152 46,128 52,170 58,128 64,152 90,152 100,138 106,166 112,138 118,152 152,152 160,134 164,168 168,130 176,152 218,152 228,140 234,164 240,136 248,152 286,152"
                fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="286" cy="152" r="3.5" fill="rgba(16,185,129,1)">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
              </circle>
              <circle cx="286" cy="152" r="7" fill="rgba(16,185,129,0.2)">
                <animate attributeName="r" values="3.5;9;3.5" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite"/>
              </circle>
              {/* Patient list */}
              <rect x="6" y="180" width="288" height="42" rx="7" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.075)" strokeWidth="0.75"/>
              <rect x="14" y="188" width="75" height="5.5" rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <line x1="14" y1="199" x2="286" y2="199" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
              <circle cx="21" cy="208" r="5" fill="rgba(255,255,255,0.12)"/>
              <rect x="30" y="205" width="75" height="5" rx="2" fill="rgba(255,255,255,0.18)"/>
              <rect x="118" y="205" width="50" height="5" rx="2" fill="rgba(255,255,255,0.1)"/>
              <rect x="220" y="204" width="40" height="6" rx="3" fill="rgba(16,185,129,0.4)"/>
              <rect x="268" y="204" width="18" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
            </svg>
          </div>

          {/* Headline + features — flex-shrink: 0 */}
          <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
              Gestión clínica integral
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, lineHeight: 1.6, marginBottom: '1rem' }}>
              Historias clínicas, farmacia, laboratorio y agenda médica en una sola plataforma segura.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {([
                { label: 'Historia clínica electrónica', color: '#10B981', path: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4' },
                { label: 'Farmacia e inventario',         color: '#0891B2', path: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18' },
                { label: 'Laboratorio y exámenes',        color: '#8B5CF6', path: 'M19.428 15.428a2 2 0 0 0-1.022-.547l-2.387-.477a6 6 0 0 0-3.86.517l-.318.158a6 6 0 0 1-3.86.517L6.05 15.21a2 2 0 0 0-1.806.547M8 4h8l-1 1v5.172a2 2 0 0 0 .586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 0 0 9 10.172V5L8 4z' },
                { label: 'Agenda y citas médicas',        color: '#F59E0B', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
              ] as const).map(({ label, color, path }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 7px', borderRadius: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: `${color}1A`, border: `1px solid ${color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={path}/>
                    </svg>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer style={{
            flexShrink: 0,
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 7,
            marginTop: '1rem',
            paddingTop: '0.875rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>
              © {new Date().getFullYear()} Sistema de Gestión Clínico · Acceso protegido · TLS 1.3
            </p>
          </footer>
        </aside>

        {/* ─── Panel derecho ─── */}
        <main style={{
          flex: 1,
          background: '#F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          overflow: 'hidden',
        }}>
          <div className="sgc-card" style={{
            width: '100%',
            maxWidth: 400,
            background: '#ffffff',
            borderRadius: 20,
            padding: '2.25rem 2.25rem 2rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06), 0 20px 56px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.055)',
          }}>

            {/* Encabezado */}
            <header style={{ marginBottom: '1.75rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#F0FDF9',
                border: '1px solid rgba(15,110,86,0.22)',
                borderRadius: 8,
                padding: '4px 10px',
                marginBottom: '1rem',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="#0F6E56" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', letterSpacing: '0.04em' }}>
                  Sistema de Gestión Clínico
                </span>
              </div>

              <h1 style={{ fontSize: 23, fontWeight: 700, color: '#0F172A', marginBottom: '0.3rem', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                Bienvenido
              </h1>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>
                Accede con tus credenciales institucionales
              </p>
            </header>

            {/* Error */}
            {hasError && (
              <div role="alert" style={{
                background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 10,
                padding: '10px 14px', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <svg aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#E11D48"/>
                </svg>
                <span style={{ fontSize: 13, color: '#9F1239', lineHeight: 1.5 }}>{message.summary}</span>
              </div>
            )}

            {/* Formulario */}
            <form action={url.loginAction} method="post" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {!usernameHidden && (
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="username" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
                    {realm.loginWithEmailAllowed ? 'Usuario o correo electrónico' : 'Usuario'}
                  </label>
                  <div className="sgc-field" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: '1.5px solid #E2E8F0', borderRadius: 10,
                    padding: '0 14px', background: '#F8FAFC', height: 44,
                    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
                  }}>
                    <svg className="sgc-icon" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'stroke 0.18s ease' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      id="username" name="username" type="text" autoComplete="username"
                      defaultValue={login.username ?? ''} autoFocus={!login.username}
                      placeholder="tu.usuario o correo@hospital.com"
                      style={{ border: 'none', background: 'transparent', fontSize: 14, width: '100%', outline: 'none', color: '#0F172A', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Contraseña</label>
                  {realm.resetPasswordAllowed && (
                    <a href={url.loginResetCredentialsUrl} className="sgc-link" style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none', fontWeight: 500 }}>
                      ¿Olvidaste tu contraseña?
                    </a>
                  )}
                </div>
                <div className="sgc-field" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '0 10px 0 14px', background: '#F8FAFC', height: 44,
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
                }}>
                  <svg className="sgc-icon" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'stroke 0.18s ease' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="password" name="password" type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password" autoFocus={!!login.username}
                    placeholder="••••••••••"
                    style={{ border: 'none', background: 'transparent', fontSize: 14, width: '100%', outline: 'none', color: '#0F172A', fontFamily: 'inherit', flex: 1 }}
                  />
                  <button
                    type="button" onClick={() => setPasswordVisible(v => !v)}
                    className="sgc-eye"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', display: 'flex', alignItems: 'center', borderRadius: 5, flexShrink: 0, color: '#94A3B8', transition: 'background 0.15s ease, color 0.15s ease' }}
                    aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {passwordVisible ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <input type="hidden" name="credentialId" value={kcContext.auth.selectedCredential ?? ''}/>

              <button type="submit" className="sgc-btn" style={{
                width: '100%', height: 44, background: '#0F6E56', border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '0.01em', fontFamily: 'inherit',
              }}>
                Iniciar sesión
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            {/* Pie */}
            <footer style={{
              marginTop: '1.5rem', paddingTop: '1.125rem', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>
                Acceso protegido ·{' '}
                <a href="mailto:soporte@clinica.com" className="sgc-link" style={{ color: '#0F6E56', textDecoration: 'none', fontWeight: 500 }}>
                  soporte@clinica.com
                </a>
              </p>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
