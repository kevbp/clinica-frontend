import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import {
  DashboardOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  TeamOutlined,
  ScheduleOutlined,
  UserOutlined,
  ExperimentOutlined,
  DollarOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';

const SIDEBAR_W = 240;
const COLLAPSED_W = 64;
const HEADER_H = 48;

interface NavItem {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',    path: '/dashboard',         label: 'Inicio',               icon: <DashboardOutlined />,   roles: [] },
  { key: 'citas',        path: '/citas',             label: 'Citas',                icon: <CalendarOutlined />,    group: 'Clínico',        roles: ['MEDICO', 'RECEPCIONISTA', 'ADMIN'] },
  { key: 'atencion',     path: '/atencion',          label: 'Atención',             icon: <MedicineBoxOutlined />, group: 'Clínico',        roles: ['MEDICO', 'ADMIN'] },
  { key: 'historias',    path: '/historias',         label: 'Historias',            icon: <FileTextOutlined />,    group: 'Clínico',        roles: ['MEDICO', 'TECNICO_LABORATORIO', 'ADMIN'] },
  { key: 'pacientes',    path: '/pacientes',         label: 'Pacientes',            icon: <UserOutlined />,        group: 'Administración', roles: ['RECEPCIONISTA', 'ADMIN', 'ADMINISTRATIVO'] },
  { key: 'personal',     path: '/personal',          label: 'Personal',             icon: <TeamOutlined />,        group: 'Administración', roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { key: 'horarios',     path: '/horarios',          label: 'Horarios',             icon: <ScheduleOutlined />,    group: 'Administración', roles: ['ADMIN', 'ADMINISTRATIVO', 'RECEPCIONISTA'] },
  { key: 'farmacia',     path: '/farmacia',          label: 'Farmacia',             icon: <MedicineBoxOutlined />, group: 'Farmacia & Lab', roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { key: 'laboratorio',  path: '/laboratorio',       label: 'Laboratorio',          icon: <ExperimentOutlined />,  group: 'Farmacia & Lab', roles: ['TECNICO_LABORATORIO', 'ADMIN'] },
  { key: 'pagos',        path: '/caja/pagos',        label: 'Pagos',                icon: <DollarOutlined />,      group: 'Caja',           roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { key: 'proformas',    path: '/caja/proformas',    label: 'Proformas',            icon: <DollarOutlined />,      group: 'Caja',           roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { key: 'comprobantes', path: '/caja/comprobantes', label: 'Comprobantes',         icon: <DollarOutlined />,      group: 'Caja',           roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { key: 'configuracion', path: '/configuracion',    label: 'Configuración',        icon: <SettingOutlined />,     group: 'Sistema',        roles: ['ADMIN'] },
];

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}

export default function AppShell() {
  const { keycloak } = useKeycloak();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];
  const userName: string = (keycloak.tokenParsed?.name as string | undefined) ?? 'Usuario';
  const sidebarW = collapsed ? COLLAPSED_W : SIDEBAR_W;

  const visibleItems = NAV_ITEMS.filter(
    item => item.roles.length === 0 || item.roles.some(r => userRoles.includes(r)),
  );

  // Precompute which items should show their group header
  const itemsWithHeader = visibleItems.reduce<Array<NavItem & { showHeader: boolean }>>(
    (acc, item) => {
      const prev = acc[acc.length - 1];
      const showHeader = Boolean(item.group) && item.group !== prev?.group;
      return [...acc, { ...item, showHeader }];
    },
    [],
  );

  const isActive = (item: NavItem) => {
    if (item.path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(item.path);
  };

  const currentItem = NAV_ITEMS.find(item => isActive(item));

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', left: 0, top: 0,
        width: sidebarW, height: '100vh',
        background: '#0F6E56',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        zIndex: 100,
        overflow: 'hidden',
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{
          height: HEADER_H, display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              Gestión Clínica
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}>
          {itemsWithHeader.map(item => {
            const active = isActive(item);
            return (
              <div key={item.key}>
                {item.showHeader && !collapsed && (
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '12px 16px 4px',
                  }}>
                    {item.group}
                  </div>
                )}
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <div
                    role="button"
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: collapsed ? '10px 0' : '8px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      margin: '1px 6px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      transition: 'background 0.15s, color 0.15s',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Tooltip>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
              }}>
                {initials(userName)}
              </div>
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 500, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {userName}
              </span>
              <button
                onClick={() => keycloak.logout()}
                title="Cerrar sesión"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)', padding: 4, display: 'flex',
                  alignItems: 'center', borderRadius: 4,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <LogoutOutlined style={{ fontSize: 14 }} />
              </button>
            </div>
          )}
          {collapsed && (
            <Tooltip title="Cerrar sesión" placement="right">
              <div
                role="button"
                onClick={() => keycloak.logout()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 0', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <LogoutOutlined style={{ fontSize: 15 }} />
              </div>
            </Tooltip>
          )}
          {/* Toggle */}
          <div
            role="button"
            onClick={toggle}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-end',
              padding: collapsed ? '8px 0' : '8px 14px',
              cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
              fontSize: 14,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{
        marginLeft: sidebarW,
        width: `calc(100% - ${sidebarW}px)`,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.2s ease, width 0.2s ease',
      }}>

        {/* Header */}
        <header style={{
          height: HEADER_H, background: '#fff',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-hint)' }}>Sistema de Gestión Clínica</span>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>
              {currentItem?.label ?? 'Inicio'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          background: 'var(--bg-body)',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
