import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { Spin } from 'antd';
import AppShell from '../components/layout/AppShell';
import ComingSoonPage from '../pages/ComingSoonPage';

const DashboardPage   = lazy(() => import('../pages/DashboardPage'));
const PersonalPage    = lazy(() => import('../pages/personal/PersonalPage'));
const PacientesPage   = lazy(() => import('../pages/pacientes/PacientesPage'));
const HorariosPage    = lazy(() => import('../pages/horarios/HorariosPage'));
const CitasPage       = lazy(() => import('../pages/citas/CitasPage'));
const ConfiguracionPage = lazy(() => import('../pages/configuracion/ConfiguracionPage'));
const PagosPage       = lazy(() => import('../pages/caja/PagosPage'));
const ComprobantesPage = lazy(() => import('../pages/caja/ComprobantesPage'));
const AtencionMedicaPage = lazy(() => import('../pages/atencion/AtencionMedicaPage'));
const HistoriasPage      = lazy(() => import('../pages/historias/HistoriasPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Spin size="large" />
    </div>
  );
}

function ProtectedLayout() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!keycloak.authenticated) {
    keycloak.login();
    return null;
  }

  return <AppShell />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          } />
          <Route path="/personal" element={
            <Suspense fallback={<PageLoader />}><PersonalPage /></Suspense>
          } />
          <Route path="/pacientes" element={
            <Suspense fallback={<PageLoader />}><PacientesPage /></Suspense>
          } />
          <Route path="/citas" element={
            <Suspense fallback={<PageLoader />}><CitasPage /></Suspense>
          } />
          <Route path="/atencion" element={
            <Suspense fallback={<PageLoader />}><AtencionMedicaPage /></Suspense>
          } />
          <Route path="/historias" element={
            <Suspense fallback={<PageLoader />}><HistoriasPage /></Suspense>
          } />
          <Route path="/horarios" element={
            <Suspense fallback={<PageLoader />}><HorariosPage /></Suspense>
          } />
          <Route path="/farmacia"          element={<ComingSoonPage title="Farmacia" />} />
          <Route path="/laboratorio"       element={<ComingSoonPage title="Laboratorio" />} />
          <Route path="/caja/pagos" element={
            <Suspense fallback={<PageLoader />}><PagosPage /></Suspense>
          } />
          <Route path="/caja/proformas"    element={<ComingSoonPage title="Proformas" />} />
          <Route path="/caja/comprobantes" element={
            <Suspense fallback={<PageLoader />}><ComprobantesPage /></Suspense>
          } />
          <Route path="/configuracion" element={
            <Suspense fallback={<PageLoader />}><ConfiguracionPage /></Suspense>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
