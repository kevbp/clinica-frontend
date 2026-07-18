import { useState, useEffect, useRef } from 'react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { KcContext } from '../KcContext';
import type { I18n } from '../i18n';

type LoginKcContext = Extract<KcContext, { pageId: 'login.ftl' }>;

export default function Login({ kcContext }: PageProps<LoginKcContext, I18n>) {
  const { url, realm, login, message, usernameHidden } = kcContext;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hasError = message?.type === 'error';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ECG: [number, number][] = [
      [0.00, 0.00], [0.07, 0.00],
      [0.11, 0.12], [0.15, 0.00],
      [0.18, -0.06], [0.22, 1.00],
      [0.25, -0.14], [0.29, 0.00],
      [0.35, 0.24], [0.44, 0.00],
      [1.00, 0.00],
    ];

    function ecgY(p: number): number {
      p = ((p % 1) + 1) % 1;
      for (let i = 0; i < ECG.length - 1; i++) {
        const [t0, v0] = ECG[i], [t1, v1] = ECG[i + 1];
        if (p >= t0 && p < t1) return v0 + (v1 - v0) * (p - t0) / (t1 - t0);
      }
      return 0;
    }

    const TRACES = [
      { yR: 0.22, amp: 50, spd: 0.14, op: 0.22, off: 0.0 },
      { yR: 0.50, amp: 65, spd: 0.20, op: 0.15, off: 0.35 },
      { yR: 0.75, amp: 42, spd: 0.11, op: 0.10, off: 0.65 },
      { yR: 0.90, amp: 28, spd: 0.17, op: 0.07, off: 0.20 },
    ];

    const CYCLE = 260;
    let t = 0;
    let raf: number;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.offsetWidth ?? 0;
      canvas.height = canvas.parentElement?.offsetHeight ?? 0;
    }

    resize();
    window.addEventListener('resize', resize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame() {
      if (!ctx || !canvas) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      TRACES.forEach(tr => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(59,140,222,${tr.op})`;
        ctx.lineWidth = 1.3;
        ctx.lineJoin = 'round';
        const cy = H * tr.yR;
        for (let x = 0; x <= W; x++) {
          const phase = (x / CYCLE + tr.off - t * tr.spd * 0.0025) % 1;
          const y = cy - ecgY(((phase % 1) + 1) % 1) * tr.amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      t++;
      raf = requestAnimationFrame(frame);
    }

    if (!reducedMotion) frame();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

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

        .sgc-input-wrap:focus-within {
          border-color: #3B8CDE !important;
          box-shadow: 0 0 0 3px rgba(59,140,222,0.12) !important;
          background: #ffffff !important;
        }
        .sgc-input-wrap:focus-within .sgc-icon {
          stroke: #3B8CDE;
        }

        .sgc-btn {
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease;
        }
        .sgc-btn:hover {
          background: #2F7AC9 !important;
          box-shadow: 0 4px 14px rgba(59,140,222,0.30) !important;
        }
        .sgc-btn:active { transform: scale(0.99); }
        .sgc-btn:focus-visible {
          outline: 3px solid rgba(59,140,222,0.4);
          outline-offset: 2px;
        }

        .sgc-link { transition: color 0.15s ease; }
        .sgc-link:hover { color: #2F7AC9 !important; }
        .sgc-link:focus-visible {
          outline: 2px solid #3B8CDE;
          outline-offset: 2px;
          border-radius: 3px;
        }

        .sgc-eye:hover { color: #64748B !important; }
        .sgc-eye:focus-visible {
          outline: 2px solid #3B8CDE;
          outline-offset: 2px;
        }

        @keyframes sgc-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sgc-card { animation: sgc-rise 0.28s cubic-bezier(0.22,0.68,0,1.1) both; }

        @media (max-width: 720px) {
          .sgc-left { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sgc-card { animation: none !important; }
          .sgc-btn  { transition: none !important; }
        }
      `}</style>

      <div className="sgc-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── Panel izquierdo ── */}
        <aside className="sgc-left" aria-hidden="true" style={{
          width: '42%',
          flexShrink: 0,
          background: '#1A2B3C',
          display: 'flex',
          flexDirection: 'column',
          padding: '44px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.8 }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Marca */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#3B8CDE',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                Sistema de Gestión Clínica
              </span>
            </div>

            {/* Hero — empuja hacia abajo */}
            <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
              <p style={{
                fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#3B8CDE', marginBottom: 16,
              }}>
                Centro Médico Esperanza Sur
              </p>
              <h2 style={{
                fontSize: 32, fontWeight: 300, lineHeight: 1.25,
                letterSpacing: '-0.02em', color: '#F1F5F9', marginBottom: 20,
              }}>
                Gestión clínica<br /><strong style={{ fontWeight: 600, color: '#fff' }}>integrada</strong>
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.45)', maxWidth: 280 }}>
                Historial electrónico, agendamiento, caja y laboratorio en una sola plataforma.
              </p>
            </div>

          </div>
        </aside>

        {/* ── Panel derecho ── */}
        <main style={{
          flex: 1,
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 48px',
          overflowY: 'auto',
        }}>
          <div className="sgc-card" style={{ width: '100%', maxWidth: 360 }}>

            {/* Encabezado */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: 24, fontWeight: 600, color: '#1E293B',
                letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6,
              }}>
                Bienvenido
              </h1>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.5 }}>
                Ingrese sus credenciales para continuar
              </p>
            </div>

            {/* Card del formulario */}
            <div style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: 28,
              marginBottom: 16,
            }}>

              {/* Error */}
              {hasError && (
                <div role="alert" style={{
                  background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 20,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <svg aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                    <circle cx="12" cy="16" r="0.5" fill="#E11D48" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#9F1239', lineHeight: 1.5 }}>{message.summary}</span>
                </div>
              )}

              <form action={url.loginAction} method="post">

                {!usernameHidden && (
                  <div style={{ marginBottom: 18 }}>
                    <label htmlFor="username" style={{
                      display: 'block', fontSize: 12, fontWeight: 500,
                      color: '#475569', letterSpacing: '0.02em', marginBottom: 6,
                    }}>
                      {realm.loginWithEmailAllowed ? 'Usuario o correo' : 'Usuario'}
                    </label>
                    <div className="sgc-input-wrap" style={{
                      display: 'flex', alignItems: 'center',
                      height: 40, padding: '0 14px',
                      background: '#F8FAFC', border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                    }}>
                      <input
                        id="username" name="username" type="text"
                        autoComplete="username"
                        defaultValue={login.username ?? ''}
                        autoFocus={!login.username}
                        placeholder="usuario o correo@clinica.pe"
                        style={{
                          border: 'none', background: 'transparent',
                          fontSize: 14, width: '100%', outline: 'none',
                          color: '#1E293B', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label htmlFor="password" style={{
                      fontSize: 12, fontWeight: 500,
                      color: '#475569', letterSpacing: '0.02em',
                    }}>
                      Contraseña
                    </label>
                    {realm.resetPasswordAllowed && (
                      <a href={url.loginResetCredentialsUrl} className="sgc-link"
                        style={{ fontSize: 12, color: '#3B8CDE', textDecoration: 'none', fontWeight: 500 }}>
                        ¿Olvidó su contraseña?
                      </a>
                    )}
                  </div>
                  <div className="sgc-input-wrap" style={{
                    display: 'flex', alignItems: 'center',
                    height: 40, padding: '0 4px 0 14px',
                    background: '#F8FAFC', border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                  }}>
                    <input
                      id="password" name="password"
                      type={passwordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      autoFocus={!!login.username}
                      placeholder="••••••••"
                      style={{
                        border: 'none', background: 'transparent',
                        fontSize: 14, flex: 1, outline: 'none',
                        color: '#1E293B', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="button"
                      className="sgc-eye"
                      onClick={() => setPasswordVisible(v => !v)}
                      aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0 8px', display: 'flex', alignItems: 'center',
                        color: '#94A3B8', transition: 'color 0.15s',
                        height: '100%', borderRadius: '0 7px 7px 0',
                      }}
                    >
                      {passwordVisible ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <input type="hidden" name="credentialId" value={kcContext.auth.selectedCredential ?? ''} />

                <button type="submit" className="sgc-btn" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', height: 42,
                  background: '#3B8CDE', border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Iniciar sesión
                </button>

                <div style={{ height: 1, background: '#E2E8F0', margin: '20px -28px 0' }} />
              </form>
            </div>

            {/* Pie */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 11.5, color: '#94A3B8',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Acceso restringido
              </span>
              <span>
                v2.1.0 ·{' '}
                <a href="mailto:soporte@clinica.com" className="sgc-link"
                  style={{ color: '#94A3B8', textDecoration: 'none' }}>
                  Soporte
                </a>
              </span>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
