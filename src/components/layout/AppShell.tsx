import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  ExperimentOutlined,
  DollarOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ScheduleOutlined,
  ShopOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';

// ── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_EXPANDED = 224;
const SIDEBAR_COLLAPSED = 56;
const HEADER_H = 48;

const C = {
  bg:           '#1A2B3C',
  bgFlyout:     '#1E3448',
  hover:        'rgba(255,255,255,0.07)',
  active:       'rgba(59,140,222,0.20)',
  activeText:   '#6BB8F4',
  text:         'rgba(255,255,255,0.65)',
  textHover:    'rgba(255,255,255,0.92)',
  sectionLabel: 'rgba(255,255,255,0.28)',
  border:       'rgba(255,255,255,0.08)',
  accentBlue:   '#3B8CDE',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

interface NavSubItem {
  key:   string;
  path:  string;
  label: string;
}

interface NavItem {
  key:      string;
  label:    string;
  icon:     React.ReactNode;
  group:    string;
  roles:    string[];
  path?:    string;
  children?: NavSubItem[];
}

// ── Navigation tree ──────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard', label: 'Inicio', icon: <DashboardOutlined />,
    group: '', path: '/dashboard', roles: [],
  },
  {
    key: 'citas', label: 'Citas', icon: <CalendarOutlined />,
    group: 'Clínico', roles: ['MEDICO', 'RECEPCIONISTA', 'ADMIN', 'ADMINISTRATIVO'],
    children: [
      { key: 'citas-agendar',  path: '/citas/agendar',  label: 'Agendar cita' },
      { key: 'citas-listado',  path: '/citas/listado',  label: 'Listado de citas' },
    ],
  },
  {
    key: 'atencion', label: 'Atención médica', icon: <MedicineBoxOutlined />,
    group: 'Clínico', path: '/atencion', roles: ['MEDICO', 'ADMIN'],
  },
  {
    key: 'historias', label: 'Historias clínicas', icon: <FileTextOutlined />,
    group: 'Clínico', path: '/historias', roles: ['MEDICO', 'TECNICO_LABORATORIO', 'ADMIN'],
  },
  {
    key: 'pacientes', label: 'Pacientes', icon: <UserOutlined />,
    group: 'Administración', path: '/pacientes',
    roles: ['RECEPCIONISTA', 'ADMIN', 'ADMINISTRATIVO'],
  },
  {
    key: 'personal', label: 'Personal', icon: <TeamOutlined />,
    group: 'Administración', roles: ['ADMIN', 'ADMINISTRATIVO'],
    children: [
      { key: 'personal-equipo',         path: '/personal/equipo',         label: 'Equipo médico' },
      { key: 'personal-especialidades', path: '/personal/especialidades', label: 'Especialidades' },
    ],
  },
  {
    key: 'horarios', label: 'Horarios', icon: <ScheduleOutlined />,
    group: 'Administración', roles: ['ADMIN', 'ADMINISTRATIVO', 'RECEPCIONISTA'],
    children: [
      { key: 'horarios-consultorios', path: '/horarios/consultorios', label: 'Consultorios' },
      { key: 'horarios-programacion', path: '/horarios/programacion', label: 'Programación' },
    ],
  },
  {
    key: 'caja', label: 'Caja', icon: <DollarOutlined />,
    group: 'Financiero', roles: ['ADMIN', 'ADMINISTRATIVO'],
    children: [
      { key: 'caja-pagos',        path: '/caja/pagos',        label: 'Cobros de consulta' },
      { key: 'caja-proformas',    path: '/caja/proformas',    label: 'Proformas' },
      { key: 'caja-comprobantes', path: '/caja/comprobantes', label: 'Comprobantes' },
    ],
  },
  {
    key: 'farmacia', label: 'Farmacia', icon: <ShopOutlined />,
    group: 'Farmacia & Lab', roles: ['ADMIN', 'ADMINISTRATIVO'],
    children: [
      { key: 'farmacia-catalogo',    path: '/farmacia/catalogo',    label: 'Catálogo e inventario' },
      { key: 'farmacia-stock-bajo',  path: '/farmacia/stock-bajo',  label: 'Stock bajo' },
      { key: 'farmacia-vencimiento', path: '/farmacia/vencimiento', label: 'Próximos a vencer' },
      { key: 'farmacia-kardex',      path: '/farmacia/kardex',      label: 'Kardex' },
    ],
  },
  {
    key: 'laboratorio', label: 'Laboratorio', icon: <ExperimentOutlined />,
    group: 'Farmacia & Lab', roles: ['TECNICO_LABORATORIO', 'ADMIN'],
    children: [
      { key: 'laboratorio-catalogo',   path: '/laboratorio/catalogo',   label: 'Catálogo de exámenes' },
      { key: 'laboratorio-autorizados', path: '/laboratorio/autorizados', label: 'Exámenes autorizados' },
    ],
  },
  {
    key: 'configuracion', label: 'Configuración', icon: <SettingOutlined />,
    group: 'Sistema', path: '/configuracion', roles: ['ADMIN'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}

function useActiveState(location: ReturnType<typeof useLocation>) {
  const isSubActive = (sub: NavSubItem) => location.pathname.startsWith(sub.path);

  const isItemActive = (item: NavItem): boolean => {
    if (item.children) return item.children.some(isSubActive);
    if (item.path === '/dashboard') return location.pathname === '/dashboard';
    return item.path ? location.pathname.startsWith(item.path) : false;
  };

  const activeItem = NAV_ITEMS.find(isItemActive);
  const activeSub  = NAV_ITEMS.flatMap(i => i.children ?? []).find(isSubActive);

  return { isItemActive, isSubActive, activeItem, activeSub };
}

// ── Flyout portal ────────────────────────────────────────────────────────────

interface FlyoutState {
  itemKey: string;
  label:   string;
  subs:    NavSubItem[];
  top:     number;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { keycloak } = useKeycloak();
  const location     = useLocation();
  const navigate     = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebar-collapsed') === 'true',
  );
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [flyout, setFlyout]     = useState<FlyoutState | null>(null);
  const flyoutRef               = useRef<HTMLDivElement>(null);
  const itemRefs                = useRef<Map<string, HTMLElement>>(new Map());

  const userRoles = keycloak.realmAccess?.roles ?? [];
  const userName  = (keycloak.tokenParsed?.name as string | undefined) ?? 'Usuario';

  const { isItemActive, isSubActive, activeItem, activeSub } = useActiveState(location);

  // Auto-open accordion for active parent on mount / route change
  useEffect(() => {
    if (activeItem?.children) {
      setOpenKeys(prev => new Set([...prev, activeItem.key]));
    }
  }, [activeItem?.key]);

  // Close flyout on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close flyout on route change
  useEffect(() => { setFlyout(null); }, [location.pathname]);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      if (next) setFlyout(null);
      return next;
    });
  }, []);

  const visibleItems = NAV_ITEMS.filter(
    item => item.roles.length === 0 || item.roles.some(r => userRoles.includes(r)),
  );

  // Group headers
  const groups = visibleItems.reduce<{ label: string; items: NavItem[] }[]>((acc, item) => {
    const last = acc[acc.length - 1];
    if (!last || last.label !== item.group) {
      acc.push({ label: item.group, items: [item] });
    } else {
      last.items.push(item);
    }
    return acc;
  }, []);

  const handleItemClick = (item: NavItem, el: HTMLElement) => {
    if (item.path) {
      navigate(item.path);
      setFlyout(null);
      return;
    }
    if (!item.children) return;

    if (collapsed) {
      if (flyout?.itemKey === item.key) {
        setFlyout(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setFlyout({ itemKey: item.key, label: item.label, subs: item.children, top: rect.top });
    } else {
      setOpenKeys(prev => {
        const next = new Set(prev);
        if (next.has(item.key)) next.delete(item.key);
        else next.add(item.key);
        return next;
      });
    }
  };

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  // Breadcrumb data
  const breadcrumb = (() => {
    if (!activeItem) return { group: '', item: 'Inicio', sub: '' };
    return {
      group: activeItem.group,
      item:  activeItem.label,
      sub:   activeSub?.label ?? '',
    };
  })();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        position:        'fixed',
        left:            0,
        top:             0,
        width:           sidebarW,
        height:          '100vh',
        background:      C.bg,
        display:         'flex',
        flexDirection:   'column',
        transition:      'width 0.22s cubic-bezier(.4,0,.2,1)',
        zIndex:          200,
        overflow:        'hidden',
        flexShrink:      0,
        userSelect:      'none',
      }}>

        {/* Logo row */}
        <div style={{
          height:       HEADER_H,
          display:      'flex',
          alignItems:   'center',
          padding:      collapsed ? '0 8px' : '0 14px',
          gap:          collapsed ? 0 : 10,
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          {!collapsed && (
            <div style={{
              width:          28, height: 28, borderRadius: 6,
              background:     C.accentBlue,
              display:        'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink:     0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          )}
          {!collapsed && (
            <span style={{
              color: '#fff', fontSize: 13, fontWeight: 500,
              whiteSpace: 'nowrap', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Centro Médico
            </span>
          )}
          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)',
              padding: 6, display: 'flex', alignItems: 'center',
              borderRadius: 6, flexShrink: 0,
              marginLeft: collapsed ? 0 : 'auto',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = C.hover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {collapsed ? <MenuUnfoldOutlined style={{ fontSize: 16 }} /> : <MenuFoldOutlined style={{ fontSize: 15 }} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}
          className="sidebar-nav">
          {groups.map(group => (
            <div key={group.label}>
              {/* Section label */}
              {group.label && !collapsed && (
                <div style={{
                  fontSize:       10,
                  fontWeight:     500,
                  color:          C.sectionLabel,
                  textTransform:  'uppercase',
                  letterSpacing:  '0.08em',
                  padding:        '10px 14px 4px',
                  whiteSpace:     'nowrap',
                }}>
                  {group.label}
                </div>
              )}
              {group.label && collapsed && (
                <div style={{ height: 8 }} />
              )}

              {group.items.map(item => {
                const active  = isItemActive(item);
                const hasChildren = Boolean(item.children?.length);
                const isOpen  = openKeys.has(item.key) && !collapsed;

                return (
                  <div key={item.key}>
                    <Tooltip title={collapsed ? item.label : ''} placement="right">
                      <div
                        ref={el => {
                          if (el) itemRefs.current.set(item.key, el);
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={e => handleItemClick(item, e.currentTarget as HTMLElement)}
                        onKeyDown={e => e.key === 'Enter' && handleItemClick(item, e.currentTarget as HTMLElement)}
                        style={{
                          display:         'flex',
                          alignItems:      'center',
                          gap:             10,
                          padding:         collapsed ? '9px 0' : '9px 12px',
                          justifyContent:  collapsed ? 'center' : 'flex-start',
                          margin:          '1px 6px',
                          borderRadius:    6,
                          cursor:          'pointer',
                          background:      active ? C.active : 'transparent',
                          color:           active ? C.activeText : C.text,
                          fontSize:        13,
                          fontWeight:      active ? 500 : 400,
                          transition:      'background 0.13s, color 0.13s',
                          whiteSpace:      'nowrap',
                          outline:         'none',
                        }}
                        onMouseEnter={e => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = C.hover;
                          if (!active) (e.currentTarget as HTMLElement).style.color = C.textHover;
                        }}
                        onMouseLeave={e => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                          if (!active) (e.currentTarget as HTMLElement).style.color = C.text;
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {hasChildren && (
                              <RightOutlined style={{
                                fontSize:   10,
                                color:      'rgba(255,255,255,0.3)',
                                transition: 'transform 0.2s',
                                transform:  isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                              }} />
                            )}
                          </>
                        )}
                        {/* Dot indicator when collapsed and active */}
                        {collapsed && hasChildren && active && (
                          <span style={{
                            position:     'absolute',
                            right:        6,
                            width:        4,
                            height:       4,
                            borderRadius: '50%',
                            background:   C.activeText,
                          }} />
                        )}
                      </div>
                    </Tooltip>

                    {/* Accordion submenu (expanded mode only) */}
                    {hasChildren && !collapsed && (
                      <div style={{
                        overflow:   'hidden',
                        maxHeight:  isOpen ? `${(item.children!.length) * 36 + 4}px` : '0px',
                        transition: 'max-height 0.22s cubic-bezier(.4,0,.2,1)',
                      }}>
                        {item.children!.map(sub => {
                          const subActive = isSubActive(sub);
                          return (
                            <div
                              key={sub.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(sub.path)}
                              onKeyDown={e => e.key === 'Enter' && navigate(sub.path)}
                              style={{
                                display:     'flex',
                                alignItems:  'center',
                                gap:         8,
                                padding:     '8px 12px 8px 44px',
                                cursor:      'pointer',
                                color:       subActive ? C.activeText : 'rgba(255,255,255,0.45)',
                                fontSize:    12.5,
                                fontWeight:  subActive ? 500 : 400,
                                transition:  'background 0.12s, color 0.12s',
                                borderRadius: 6,
                                margin:      '0 6px',
                                outline:     'none',
                              }}
                              onMouseEnter={e => {
                                if (!subActive) {
                                  (e.currentTarget as HTMLElement).style.background = C.hover;
                                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!subActive) {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                                }
                              }}
                            >
                              <span style={{
                                width:        4,
                                height:       4,
                                borderRadius: '50%',
                                background:   'currentColor',
                                flexShrink:   0,
                                opacity:      0.6,
                              }} />
                              {sub.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {collapsed ? (
            <Tooltip title="Cerrar sesión" placement="right">
              <div
                role="button"
                onClick={() => keycloak.logout()}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  padding:         '12px 0',
                  cursor:          'pointer',
                  color:           'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <LogoutOutlined style={{ fontSize: 15 }} />
              </div>
            </Tooltip>
          ) : (
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width:           30,
                height:          30,
                borderRadius:    '50%',
                background:      C.accentBlue,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        11,
                fontWeight:      500,
                color:           '#fff',
                flexShrink:      0,
              }}>
                {initials(userName)}
              </div>
              <span style={{
                flex:          1,
                fontSize:      12,
                fontWeight:    500,
                color:         '#fff',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                whiteSpace:    'nowrap',
              }}>
                {userName}
              </span>
              <button
                onClick={() => keycloak.logout()}
                title="Cerrar sesión"
                style={{
                  background:  'transparent',
                  border:      'none',
                  cursor:      'pointer',
                  color:       'rgba(255,255,255,0.5)',
                  padding:     4,
                  display:     'flex',
                  alignItems:  'center',
                  borderRadius: 4,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <LogoutOutlined style={{ fontSize: 14 }} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Flyout (collapsed mode) ── */}
      {flyout && collapsed && (
        <div
          ref={flyoutRef}
          style={{
            position:     'fixed',
            left:         SIDEBAR_COLLAPSED,
            top:          flyout.top,
            background:   C.bgFlyout,
            borderRadius: '0 8px 8px 0',
            padding:      '8px 0',
            minWidth:     190,
            zIndex:       300,
            boxShadow:    '4px 0 20px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{
            fontSize:       11,
            fontWeight:     500,
            color:          C.sectionLabel,
            textTransform:  'uppercase',
            letterSpacing:  '0.07em',
            padding:        '4px 14px 10px',
            borderBottom:   `1px solid ${C.border}`,
            marginBottom:   4,
          }}>
            {flyout.label}
          </div>
          {flyout.subs.map(sub => {
            const subActive = location.pathname.startsWith(sub.path);
            return (
              <div
                key={sub.key}
                role="button"
                onClick={() => { navigate(sub.path); setFlyout(null); }}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         8,
                  padding:     '9px 16px',
                  cursor:      'pointer',
                  color:       subActive ? C.activeText : C.text,
                  fontSize:    13,
                  fontWeight:  subActive ? 500 : 400,
                  transition:  'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = C.hover;
                  if (!subActive) (e.currentTarget as HTMLElement).style.color = C.textHover;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  if (!subActive) (e.currentTarget as HTMLElement).style.color = C.text;
                }}
              >
                <span style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'currentColor', flexShrink: 0, opacity: 0.5,
                }} />
                {sub.label}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{
        marginLeft:  sidebarW,
        width:       `calc(100% - ${sidebarW}px)`,
        height:      '100vh',
        display:     'flex',
        flexDirection: 'column',
        transition:  'margin-left 0.22s cubic-bezier(.4,0,.2,1), width 0.22s cubic-bezier(.4,0,.2,1)',
      }}>

        {/* Header */}
        <header style={{
          height:       HEADER_H,
          background:   '#fff',
          borderBottom: '1px solid #E2E8F0',
          display:      'flex',
          alignItems:   'center',
          padding:      '0 24px',
          flexShrink:   0,
          gap:          8,
        }}>
          <nav aria-label="Ruta actual" style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            fontSize:   13,
            color:      '#94A3B8',
          }}>
            {breadcrumb.group && (
              <>
                <span>{breadcrumb.group}</span>
                <span style={{ fontSize: 10, color: '#CBD5E1' }}>›</span>
              </>
            )}
            <span style={{ color: breadcrumb.sub ? '#64748B' : '#1E293B', fontWeight: breadcrumb.sub ? 400 : 500 }}>
              {breadcrumb.item}
            </span>
            {breadcrumb.sub && (
              <>
                <span style={{ fontSize: 10, color: '#CBD5E1' }}>›</span>
                <span style={{ color: '#1E293B', fontWeight: 500 }}>{breadcrumb.sub}</span>
              </>
            )}
          </nav>
        </header>

        {/* Content */}
        <main style={{
          flex:       1,
          overflowY:  'auto',
          padding:    24,
          background: '#F8FAFC',
        }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .sidebar-nav::-webkit-scrollbar { width: 3px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
      `}</style>
    </div>
  );
}
