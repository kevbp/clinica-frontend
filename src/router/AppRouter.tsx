import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { Spin } from 'antd';
import AppShell from '../components/layout/AppShell';

const DashboardPage   = lazy(() => import('../pages/DashboardPage'));
const PersonalPage    = lazy(() => import('../pages/personal/PersonalPage'));
const PacientesPage   = lazy(() => import('../pages/pacientes/PacientesPage'));
const HorariosPage    = lazy(() => import('../pages/horarios/HorariosPage'));
const CitasPage       = lazy(() => import('../pages/citas/CitasPage'));
const ConfiguracionPage = lazy(() => import('../pages/configuracion/ConfiguracionPage'));
const PagosPage       = lazy(() => import('../pages/caja/PagosPage'));
const ComprobantesPage = lazy(() => import('../pages/caja/ComprobantesPage'));
const ProformasPage    = lazy(() => import('../pages/caja/ProformasPage'));
const AtencionMedicaPage = lazy(() => import('../pages/atencion/AtencionMedicaPage'));
const HistoriasPage      = lazy(() => import('../pages/historias/HistoriasPage'));
const FarmaciaPage       = lazy(() => import('../pages/farmacia/FarmaciaPage'));
const LaboratorioPage    = lazy(() => import('../pages/laboratorio/LaboratorioPage'));

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
          <Route path="/personal" element={<Navigate to="/personal/equipo" replace />} />
          <Route path="/personal/equipo" element={
            <Suspense fallback={<PageLoader />}><PersonalPage /></Suspense>
          } />
          <Route path="/personal/especialidades" element={
            <Suspense fallback={<PageLoader />}><PersonalPage /></Suspense>
          } />
          <Route path="/pacientes" element={
            <Suspense fallback={<PageLoader />}><PacientesPage /></Suspense>
          } />
          <Route path="/citas" element={<Navigate to="/citas/listado" replace />} />
          <Route path="/citas/agendar" element={
            <Suspense fallback={<PageLoader />}><CitasPage /></Suspense>
          } />
          <Route path="/citas/listado" element={
            <Suspense fallback={<PageLoader />}><CitasPage /></Suspense>
          } />
          <Route path="/atencion" element={
            <Suspense fallback={<PageLoader />}><AtencionMedicaPage /></Suspense>
          } />
          <Route path="/historias" element={
            <Suspense fallback={<PageLoader />}><HistoriasPage /></Suspense>
          } />
          <Route path="/horarios" element={<Navigate to="/horarios/consultorios" replace />} />
          <Route path="/horarios/consultorios" element={
            <Suspense fallback={<PageLoader />}><HorariosPage /></Suspense>
          } />
          <Route path="/horarios/programacion" element={
            <Suspense fallback={<PageLoader />}><HorariosPage /></Suspense>
          } />
          <Route path="/farmacia" element={<Navigate to="/farmacia/catalogo" replace />} />
          <Route path="/farmacia/catalogo"    element={<FarmaciaPage />} />
          <Route path="/farmacia/stock-bajo"  element={<FarmaciaPage />} />
          <Route path="/farmacia/vencimiento" element={<FarmaciaPage />} />
          <Route path="/farmacia/kardex"      element={<FarmaciaPage />} />
          <Route path="/laboratorio" element={<Navigate to="/laboratorio/catalogo" replace />} />
          <Route path="/laboratorio/catalogo"    element={<LaboratorioPage />} />
          <Route path="/laboratorio/autorizados" element={<LaboratorioPage />} />
          <Route path="/caja/pagos" element={
            <Suspense fallback={<PageLoader />}><PagosPage /></Suspense>
          } />
          <Route path="/caja/proformas" element={
            <Suspense fallback={<PageLoader />}><ProformasPage /></Suspense>
          } />
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
