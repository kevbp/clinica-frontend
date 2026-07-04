import api from './axios';

// ── Consulta RENIEC (apisperu.com) ────────────────────────────────────────────

export interface DniReniecDTO {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codVerifica: string;
}

/** Devuelve los datos RENIEC del DNI o null si no se encontró / hubo error. */
export const consultarDni = async (dni: string): Promise<DniReniecDTO | null> => {
  const token = import.meta.env.VITE_DNI_API_TOKEN as string;
  try {
    const res = await fetch(
      `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${token}`
    );
    if (!res.ok) return null;
    const data = await res.json() as DniReniecDTO & { success?: boolean };
    if (data.success === false || !data.nombres) return null;
    return data;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────

import type {
  PacienteResponseDTO,
  PacienteRequestDTO,
  PacienteUpdateRequestDTO,
  AntecedenteClinicoResponseDTO,
  AntecedenteClinicoRequestDTO,
} from '../types/pacientes';

export const buscar = (q: string): Promise<PacienteResponseDTO[]> =>
  api.get<PacienteResponseDTO[]>('/pacientes/buscar', { params: { q } }).then(r => r.data);

// Ping liviano para detectar si ms-pacientes está disponible al entrar a la página.
// Usa /0/existe: 404 confirma que el servicio respondió (id 0 no existe); cualquier
// otro resultado (502/503/timeout) indica que el servicio no está disponible.
export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/pacientes/0/existe')
    .then(() => true)
    .catch(err => {
      if (err?.response?.status === 404) return true;
      throw err;
    });

export const obtenerPorId = (id: number): Promise<PacienteResponseDTO> =>
  api.get<PacienteResponseDTO>(`/pacientes/${id}`).then(r => r.data);

export const crear = (data: PacienteRequestDTO): Promise<PacienteResponseDTO> =>
  api.post<PacienteResponseDTO>('/pacientes', data).then(r => r.data);

export const actualizar = (id: number, data: PacienteUpdateRequestDTO): Promise<PacienteResponseDTO> =>
  api.patch<PacienteResponseDTO>(`/pacientes/${id}`, data).then(r => r.data);

export const habilitar = (id: number): Promise<PacienteResponseDTO> =>
  api.patch<PacienteResponseDTO>(`/pacientes/${id}/habilitar`).then(r => r.data);

export const deshabilitar = (id: number): Promise<PacienteResponseDTO> =>
  api.patch<PacienteResponseDTO>(`/pacientes/${id}/deshabilitar`).then(r => r.data);

export const obtenerAntecedentes = (id: number): Promise<AntecedenteClinicoResponseDTO[]> =>
  api.get<AntecedenteClinicoResponseDTO[]>(`/pacientes/${id}/antecedentes`).then(r => r.data);

export const agregarAntecedente = (
  id: number,
  data: AntecedenteClinicoRequestDTO,
): Promise<AntecedenteClinicoResponseDTO> =>
  api.post<AntecedenteClinicoResponseDTO>(`/pacientes/${id}/antecedentes`, data).then(r => r.data);

export const eliminarAntecedente = (idPaciente: number, idAntecedente: number): Promise<void> =>
  api.delete(`/pacientes/${idPaciente}/antecedentes/${idAntecedente}`).then(() => undefined);
