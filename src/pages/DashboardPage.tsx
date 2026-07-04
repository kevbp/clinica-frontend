import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { Alert, Spin, Tag, Button } from 'antd';
import {
  UserOutlined, IdcardOutlined, PhoneOutlined, MailOutlined,
  CalendarOutlined, TeamOutlined, MedicineBoxOutlined, DollarOutlined,
  FileTextOutlined, ScheduleOutlined, ExperimentOutlined, SettingOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePerfilPropio } from '../hooks/usePerfilPropio';
import { useListaCitas } from '../hooks/useCitas';
import type { CitaMedicaResponseDTO, EstadoCita } from '../types/citas';

/* ── Paleta ─────────────────────────────────────────────────────────────── */
const C = {
  verde:       '#0F6E56',
  verdeClaro:  '#E1F5EE',
  verdeBorde:  '#9FE1CB',
  verdeDark:   '#085041',
  blanco:      '#FFFFFF',
  borde:       '#E5E7EB',
  texto:       '#111827',
  muted:       '#6B7280',
  hint:        '#9CA3AF',
  azul:        '#1677ff',
  azulClaro:   '#EFF6FF',
  azulBorde:   '#BFDBFE',
  naranja:     '#f97316',
  naranjaClaro:'#FFF7ED',
  naranjaBorde:'#FED7AA',
  rojo:        '#ef4444',
  rojoClaro:   '#FEF2F2',
  rojoBorde:   '#FECACA',
  purpura:     '#7C3AED',
  purpuraClaro:'#F5F3FF',
  purpuraBorde:'#DDD6FE',
};

function formatDiaHoy() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ── Conteo de citas por estado ─────────────────────────────────────────── */
function contarPorEstado(citas: CitaMedicaResponseDTO[]) {
  const acc: Record<EstadoCita, number> = {
    PENDIENTE_PAGO: 0, CONFIRMADA: 0, ATENDIDA: 0, CANCELADA: 0,
  };
  for (const c of citas) acc[c.estado] = (acc[c.estado] ?? 0) + 1;
  return acc;
}

/* ── KPI card ────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, color, borderColor, textColor, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon?: React.ReactNode; color: string; borderColor: string; textColor: string;
  loading?: boolean;
}) {
  return (
    <div style={{ background: color, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon && <span style={{ color: textColor, opacity: 0.7, fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: 12, color: textColor, opacity: 0.75 }}>{label}</span>
      </div>
      {loading
        ? <Spin size="small" />
        : <p style={{ margin: '0 0 2px', fontSize: 28, fontWeight: 600, color: textColor, lineHeight: 1 }}>{value}</p>
      }
      {sub && <p style={{ margin: 0, fontSize: 11, color: textColor, opacity: 0.55 }}>{sub}</p>}
    </div>
  );
}

/* ── Acceso rápido ───────────────────────────────────────────────────────── */
function AccesoRapido({ label, path, icon, color }: { label: string; path: string; icon: React.ReactNode; color: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 10,
        padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borde; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <span style={{ fontSize: 18, color }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.texto }}>{label}</span>
    </button>
  );
}

/* ── Row de perfil ───────────────────────────────────────────────────────── */
function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0, color: C.hint, display: 'flex', justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12, color: C.hint, width: 68, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.texto, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

/* ── Cita próxima (card compacta) ────────────────────────────────────────── */
function CitaCard({ cita, nombrePaciente }: { cita: CitaMedicaResponseDTO; nombrePaciente?: string }) {
  const COLOR: Record<EstadoCita, string> = {
    CONFIRMADA: 'blue', PENDIENTE_PAGO: 'gold', ATENDIDA: 'green', CANCELADA: 'default',
  };
  const LABEL: Record<EstadoCita, string> = {
    CONFIRMADA: 'Confirmada', PENDIENTE_PAGO: 'Pend. pago', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: C.verdeClaro,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <UserOutlined style={{ color: C.verde, fontSize: 15 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombrePaciente ?? `Paciente #${cita.idPaciente}`}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
          {dayjs(cita.fechaHora).format('HH:mm')} · Cons. {cita.idConsultorio}
        </p>
      </div>
      <Tag color={COLOR[cita.estado]} style={{ margin: 0, fontSize: 11 }}>{LABEL[cita.estado]}</Tag>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD MÉDICO
══════════════════════════════════════════════════════════════════════════ */
function DashboardMedico({ perfil, citas, isLoading }: {
  perfil: ReturnType<typeof usePerfilPropio>['data'];
  citas: CitaMedicaResponseDTO[];
  isLoading: boolean;
}) {
  const conteo = useMemo(() => contarPorEstado(citas), [citas]);
  const primerNombre = perfil?.nombres.split(' ')[0] ?? '';
  const hoy = dayjs().format('YYYY-MM-DD');

  // Próximas: confirmadas de hoy ordenadas por hora
  const proximas = useMemo(
    () => citas
      .filter(c => c.estado === 'CONFIRMADA' && dayjs(c.fechaHora).format('YYYY-MM-DD') === hoy)
      .sort((a, b) => dayjs(a.fechaHora).valueOf() - dayjs(b.fechaHora).valueOf())
      .slice(0, 5),
    [citas, hoy],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner */}
      <div style={{ background: C.verde, borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>
            Bienvenido, Dr. {primerNombre}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
        </div>
        {perfil?.medicoInfo && (
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>CMP</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{perfil.medicoInfo.numeroColegiatura}</span>
          </div>
        )}
      </div>

      {/* KPIs de hoy */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <KpiCard label="Citas hoy" value={isLoading ? '…' : citas.length} icon={<CalendarOutlined />} color={C.verdeClaro} borderColor={C.verdeBorde} textColor={C.verdeDark} loading={isLoading} />
        <KpiCard label="Confirmadas" value={isLoading ? '…' : conteo.CONFIRMADA} icon={<CheckCircleOutlined />} color={C.azulClaro} borderColor={C.azulBorde} textColor="#1E40AF" loading={isLoading} />
        <KpiCard label="Atendidas" value={isLoading ? '…' : conteo.ATENDIDA} icon={<RiseOutlined />} color={C.verdeClaro} borderColor={C.verdeBorde} textColor={C.verdeDark} loading={isLoading} />
        <KpiCard label="Pend. pago" value={isLoading ? '…' : conteo.PENDIENTE_PAGO} icon={<ClockCircleOutlined />} color={C.naranjaClaro} borderColor={C.naranjaBorde} textColor="#9A3412" loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Próximas citas del día */}
        <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Próximas citas confirmadas — hoy
          </p>
          {isLoading
            ? <Spin />
            : proximas.length === 0
              ? <p style={{ fontSize: 13, color: C.hint, margin: 0 }}>No hay citas confirmadas para hoy.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {proximas.map(c => <CitaCard key={c.id} cita={c} />)}
                </div>
          }
        </div>

        {/* Perfil + especialidad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mi perfil</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DataRow icon={<IdcardOutlined />} label="Documento" value={perfil?.documentoIdentidad ?? '—'} />
              <DataRow icon={<PhoneOutlined />}  label="Celular"   value={perfil?.celular ?? '—'} />
              <DataRow icon={<MailOutlined />}   label="Correo"    value={perfil?.correo  ?? '—'} />
              <DataRow icon={<CalendarOutlined />} label="Ingreso" value={perfil ? formatFecha(perfil.fechaIngreso) : '—'} />
            </div>
          </div>
          {perfil?.medicoInfo?.especialidad && (
            <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderLeft: `4px solid ${C.verde}`, borderRadius: '0 14px 14px 0', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Especialidad</p>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 500, color: C.texto }}>{perfil.medicoInfo.especialidad.nombre}</p>
              <span style={{ background: C.verdeClaro, color: C.verdeDark, fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>
                {perfil.medicoInfo.numeroColegiatura}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD RECEPCIONISTA
══════════════════════════════════════════════════════════════════════════ */
function DashboardRecepcionista({ perfil, citas, isLoading }: {
  perfil: ReturnType<typeof usePerfilPropio>['data'];
  citas: CitaMedicaResponseDTO[];
  isLoading: boolean;
}) {
  const conteo = useMemo(() => contarPorEstado(citas), [citas]);
  const primerNombre = perfil?.nombres.split(' ')[0] ?? '';

  // Próximas confirmadas de hoy
  const hoy = dayjs().format('YYYY-MM-DD');
  const proximas = useMemo(
    () => citas
      .filter(c => c.estado === 'CONFIRMADA' && dayjs(c.fechaHora).format('YYYY-MM-DD') === hoy)
      .sort((a, b) => dayjs(a.fechaHora).valueOf() - dayjs(b.fechaHora).valueOf())
      .slice(0, 6),
    [citas, hoy],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.verde, borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>Bienvenida, {primerNombre}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
        </div>
        <Tag color="default" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 12 }}>Recepcionista</Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <KpiCard label="Citas hoy" value={isLoading ? '…' : citas.length} icon={<CalendarOutlined />} color={C.verdeClaro} borderColor={C.verdeBorde} textColor={C.verdeDark} loading={isLoading} />
        <KpiCard label="Confirmadas" value={isLoading ? '…' : conteo.CONFIRMADA} icon={<CheckCircleOutlined />} color={C.azulClaro} borderColor={C.azulBorde} textColor="#1E40AF" loading={isLoading} />
        <KpiCard label="Pend. pago" value={isLoading ? '…' : conteo.PENDIENTE_PAGO} icon={<ClockCircleOutlined />} color={C.naranjaClaro} borderColor={C.naranjaBorde} textColor="#9A3412" loading={isLoading} />
        <KpiCard label="Atendidas" value={isLoading ? '…' : conteo.ATENDIDA} icon={<RiseOutlined />} color={C.purpuraClaro} borderColor={C.purpuraBorde} textColor={C.purpura} loading={isLoading} />
        <KpiCard label="Canceladas" value={isLoading ? '…' : conteo.CANCELADA} icon={<CloseCircleOutlined />} color={C.rojoClaro} borderColor={C.rojoBorde} textColor="#991B1B" loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Confirmadas pendientes de atención — hoy
          </p>
          {isLoading
            ? <Spin />
            : proximas.length === 0
              ? <p style={{ fontSize: 13, color: C.hint, margin: 0 }}>No hay citas confirmadas pendientes de atención hoy.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {proximas.map(c => <CitaCard key={c.id} cita={c} />)}
                </div>
          }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Accesos rápidos</p>
          <AccesoRapido label="Agendar cita"  path="/citas"     icon={<CalendarOutlined />}    color={C.verde} />
          <AccesoRapido label="Pacientes"      path="/pacientes" icon={<UserOutlined />}         color={C.azul} />
          <AccesoRapido label="Horarios"       path="/horarios"  icon={<ScheduleOutlined />}     color={C.naranja} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD ADMINISTRATIVO
══════════════════════════════════════════════════════════════════════════ */
function DashboardAdministrativo({ perfil, citas, isLoading }: {
  perfil: ReturnType<typeof usePerfilPropio>['data'];
  citas: CitaMedicaResponseDTO[];
  isLoading: boolean;
}) {
  const conteo = useMemo(() => contarPorEstado(citas), [citas]);
  const primerNombre = perfil?.nombres.split(' ')[0] ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.verde, borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>Bienvenido, {primerNombre}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
        </div>
        <Tag color="default" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 12 }}>Administrativo</Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <KpiCard label="Citas hoy" value={isLoading ? '…' : citas.length} icon={<CalendarOutlined />} color={C.verdeClaro} borderColor={C.verdeBorde} textColor={C.verdeDark} loading={isLoading} />
        <KpiCard label="Confirmadas" value={isLoading ? '…' : conteo.CONFIRMADA} icon={<CheckCircleOutlined />} color={C.azulClaro} borderColor={C.azulBorde} textColor="#1E40AF" loading={isLoading} />
        <KpiCard label="Pend. pago" value={isLoading ? '…' : conteo.PENDIENTE_PAGO} icon={<ClockCircleOutlined />} color={C.naranjaClaro} borderColor={C.naranjaBorde} textColor="#9A3412" loading={isLoading} />
        <KpiCard label="Atendidas" value={isLoading ? '…' : conteo.ATENDIDA} icon={<RiseOutlined />} color={C.purpuraClaro} borderColor={C.purpuraBorde} textColor={C.purpura} loading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mi perfil</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DataRow icon={<UserOutlined />}    label="Tipo"      value={perfil?.tipoPersonal ?? '—'} />
            <DataRow icon={<IdcardOutlined />}  label="Documento" value={perfil?.documentoIdentidad ?? '—'} />
            <DataRow icon={<PhoneOutlined />}   label="Celular"   value={perfil?.celular ?? '—'} />
            <DataRow icon={<MailOutlined />}    label="Correo"    value={perfil?.correo ?? '—'} />
            <DataRow icon={<CalendarOutlined />} label="Ingreso"  value={perfil ? formatFecha(perfil.fechaIngreso) : '—'} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Módulos</p>
          <AccesoRapido label="Personal"      path="/personal"        icon={<TeamOutlined />}         color={C.verde} />
          <AccesoRapido label="Pacientes"     path="/pacientes"       icon={<UserOutlined />}         color={C.azul} />
          <AccesoRapido label="Horarios"      path="/horarios"        icon={<ScheduleOutlined />}     color={C.naranja} />
          <AccesoRapido label="Pagos"         path="/caja/pagos"      icon={<DollarOutlined />}       color={C.purpura} />
          <AccesoRapido label="Comprobantes"  path="/caja/comprobantes" icon={<FileTextOutlined />}   color={C.muted} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD ADMIN
══════════════════════════════════════════════════════════════════════════ */
function DashboardAdmin({ perfil, citas, isLoading }: {
  perfil: ReturnType<typeof usePerfilPropio>['data'];
  citas: CitaMedicaResponseDTO[];
  isLoading: boolean;
}) {
  const conteo = useMemo(() => contarPorEstado(citas), [citas]);
  const primerNombre = perfil?.nombres.split(' ')[0] ?? '';
  const hoy = dayjs().format('YYYY-MM-DD');

  const proximas = useMemo(
    () => citas
      .filter(c => c.estado === 'CONFIRMADA' && dayjs(c.fechaHora).format('YYYY-MM-DD') === hoy)
      .sort((a, b) => dayjs(a.fechaHora).valueOf() - dayjs(b.fechaHora).valueOf())
      .slice(0, 6),
    [citas, hoy],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Banner admin */}
      <div style={{ background: `linear-gradient(135deg, ${C.verde} 0%, #0A5A44 100%)`, borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>Panel de administración</p>
          <p style={{ margin: '0 0 6px', fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>Bienvenido, {primerNombre}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
        </div>
        <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>ADMIN</Tag>
      </div>

      {/* KPIs globales */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Citas de hoy — resumen global</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <KpiCard label="Total hoy" value={isLoading ? '…' : citas.length} icon={<CalendarOutlined />} color={C.verdeClaro} borderColor={C.verdeBorde} textColor={C.verdeDark} loading={isLoading} />
          <KpiCard label="Confirmadas" value={isLoading ? '…' : conteo.CONFIRMADA} icon={<CheckCircleOutlined />} color={C.azulClaro} borderColor={C.azulBorde} textColor="#1E40AF" loading={isLoading} />
          <KpiCard label="Pend. pago" value={isLoading ? '…' : conteo.PENDIENTE_PAGO} icon={<ClockCircleOutlined />} color={C.naranjaClaro} borderColor={C.naranjaBorde} textColor="#9A3412" loading={isLoading} />
          <KpiCard label="Atendidas" value={isLoading ? '…' : conteo.ATENDIDA} icon={<RiseOutlined />} color={C.purpuraClaro} borderColor={C.purpuraBorde} textColor={C.purpura} loading={isLoading} />
          <KpiCard label="Canceladas" value={isLoading ? '…' : conteo.CANCELADA} icon={<CloseCircleOutlined />} color={C.rojoClaro} borderColor={C.rojoBorde} textColor="#991B1B" loading={isLoading} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
        {/* Confirmadas hoy */}
        <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Confirmadas pendientes de atención — hoy
          </p>
          {isLoading
            ? <Spin />
            : proximas.length === 0
              ? <p style={{ fontSize: 13, color: C.hint, margin: 0 }}>Sin citas confirmadas pendientes por atender hoy.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {proximas.map(c => <CitaCard key={c.id} cita={c} />)}
                </div>
          }
        </div>

        {/* Accesos rápidos admin — todos los módulos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Módulos del sistema</p>
          <AccesoRapido label="Citas"          path="/citas"              icon={<CalendarOutlined />}     color={C.verde} />
          <AccesoRapido label="Atención"        path="/atencion"           icon={<MedicineBoxOutlined />}  color={C.verde} />
          <AccesoRapido label="Historias"       path="/historias"          icon={<FileTextOutlined />}     color={C.azul} />
          <AccesoRapido label="Pacientes"       path="/pacientes"          icon={<UserOutlined />}         color={C.azul} />
          <AccesoRapido label="Personal"        path="/personal"           icon={<TeamOutlined />}         color={C.naranja} />
          <AccesoRapido label="Horarios"        path="/horarios"           icon={<ScheduleOutlined />}     color={C.naranja} />
          <AccesoRapido label="Farmacia"        path="/farmacia"           icon={<MedicineBoxOutlined />}  color={C.purpura} />
          <AccesoRapido label="Laboratorio"     path="/laboratorio"        icon={<ExperimentOutlined />}   color={C.purpura} />
          <AccesoRapido label="Pagos"           path="/caja/pagos"         icon={<DollarOutlined />}       color={C.muted} />
          <AccesoRapido label="Comprobantes"    path="/caja/comprobantes"  icon={<FileTextOutlined />}     color={C.muted} />
          <AccesoRapido label="Configuración"   path="/configuracion"      icon={<SettingOutlined />}      color={C.rojo} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD TÉCNICO LABORATORIO
══════════════════════════════════════════════════════════════════════════ */
function DashboardTecnicoLab({ perfil }: { perfil: ReturnType<typeof usePerfilPropio>['data'] }) {
  const primerNombre = perfil?.nombres.split(' ')[0] ?? '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.verde, borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>Bienvenido, {primerNombre}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
        </div>
        <Tag color="default" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 12 }}>Técnico de Laboratorio</Tag>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: C.blanco, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mi perfil</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DataRow icon={<IdcardOutlined />}  label="Documento" value={perfil?.documentoIdentidad ?? '—'} />
            <DataRow icon={<PhoneOutlined />}   label="Celular"   value={perfil?.celular ?? '—'} />
            <DataRow icon={<MailOutlined />}    label="Correo"    value={perfil?.correo ?? '—'} />
            <DataRow icon={<CalendarOutlined />} label="Ingreso"  value={perfil ? formatFecha(perfil.fechaIngreso) : '—'} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Accesos rápidos</p>
          <AccesoRapido label="Laboratorio" path="/laboratorio" icon={<ExperimentOutlined />} color={C.purpura} />
          <AccesoRapido label="Historias"   path="/historias"   icon={<FileTextOutlined />}   color={C.azul} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PÁGINA RAÍZ — detecta rol y delega
══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { keycloak } = useKeycloak();
  const userRoles: string[] = keycloak.realmAccess?.roles ?? [];

  const esAdmin        = userRoles.includes('ADMIN');
  const esMedico       = userRoles.includes('MEDICO')       && !esAdmin;
  const esRecep        = userRoles.includes('RECEPCIONISTA') && !esAdmin;
  const esAdminstrativo = userRoles.includes('ADMINISTRATIVO') && !esAdmin;
  const esTecnicoLab   = userRoles.includes('TECNICO_LABORATORIO') && !esAdmin;

  const { data: perfil, isLoading: loadingPerfil, isError } = usePerfilPropio();

  // Citas de hoy. Para MEDICO esperamos a que perfil cargue para filtrar por su ID.
  // Para otros roles se traen todas las citas del día apenas el componente monta.
  const hoy = dayjs().format('YYYY-MM-DD');
  const filtrosCitas = esMedico
    ? perfil ? { idPersonal: perfil.id, fecha: hoy } : null
    : { fecha: hoy };

  const { data: citas = [], isLoading: isLoadingCitas } = useListaCitas(
    filtrosCitas ?? {},
    filtrosCitas !== null,
  );

  if (loadingPerfil) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert type="error" message="Error al cargar el perfil"
        description="Verifica que ms-personal esté disponible." />
    );
  }

  if (esAdmin)          return <DashboardAdmin           perfil={perfil} citas={citas} isLoading={isLoadingCitas} />;
  if (esMedico)         return <DashboardMedico          perfil={perfil} citas={citas} isLoading={isLoadingCitas} />;
  if (esRecep)          return <DashboardRecepcionista   perfil={perfil} citas={citas} isLoading={isLoadingCitas} />;
  if (esAdminstrativo)  return <DashboardAdministrativo  perfil={perfil} citas={citas} isLoading={isLoadingCitas} />;
  if (esTecnicoLab)     return <DashboardTecnicoLab      perfil={perfil} />;

  // Fallback genérico si el rol no está mapeado
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.verde, borderRadius: 16, padding: '22px 28px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#fff' }}>
          Bienvenido, {perfil?.nombres.split(' ')[0]}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{formatDiaHoy()}</p>
      </div>
      <Button onClick={() => keycloak.logout()}>Cerrar sesión</Button>
    </div>
  );
}
