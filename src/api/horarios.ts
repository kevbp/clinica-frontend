import api from './axios';
import type {
  ConsultorioResponseDTO,
  ConsultorioRequestDTO,
  ConsultorioUpdateRequestDTO,
  ProgramacionHorarioResponseDTO,
  ProgramacionHorarioRequestDTO,
  ProgramacionHorarioUpdateRequestDTO,
} from '../types/horarios';

export const listarConsultorios = (): Promise<ConsultorioResponseDTO[]> =>
  api.get<ConsultorioResponseDTO[]>('/consultorios').then(r => r.data);

export const crearConsultorio = (data: ConsultorioRequestDTO): Promise<ConsultorioResponseDTO> =>
  api.post<ConsultorioResponseDTO>('/consultorios', data).then(r => r.data);

export const actualizarConsultorio = (
  id: number,
  data: ConsultorioUpdateRequestDTO,
): Promise<ConsultorioResponseDTO> =>
  api.patch<ConsultorioResponseDTO>(`/consultorios/${id}`, data).then(r => r.data);

export const eliminarConsultorio = (id: number): Promise<void> =>
  api.delete(`/consultorios/${id}`).then(() => undefined);

export const obtenerTurnosPorPersonal = (
  idPersonal: number,
  desde?: string,
  hasta?: string,
): Promise<ProgramacionHorarioResponseDTO[]> =>
  api.get<ProgramacionHorarioResponseDTO[]>(`/programacion-horarios/personal/${idPersonal}`, {
    params: desde && hasta ? { desde, hasta } : undefined,
  }).then(r => r.data);

export const crearTurno = (data: ProgramacionHorarioRequestDTO): Promise<ProgramacionHorarioResponseDTO> =>
  api.post<ProgramacionHorarioResponseDTO>('/programacion-horarios', data).then(r => r.data);

export const actualizarTurno = (
  id: number,
  data: ProgramacionHorarioUpdateRequestDTO,
): Promise<ProgramacionHorarioResponseDTO> =>
  api.patch<ProgramacionHorarioResponseDTO>(`/programacion-horarios/${id}`, data).then(r => r.data);

export const eliminarTurno = (id: number): Promise<void> =>
  api.delete(`/programacion-horarios/${id}`).then(() => undefined);

// Ping liviano para detectar si ms-horarios está disponible al entrar a la página.
export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/consultorios').then(() => true);
