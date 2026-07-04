import api from './axios';
import type {
  PersonalDTO,
  PersonalRequestDTO,
  PersonalUpdateRequestDTO,
  PersonalMedicoDTO,
  PersonalMedicoRequestDTO,
  EspecialidadDTO,
  EspecialidadRequestDTO,
  PersonalFiltros,
} from '../types/personal';

export const buscarPorKeycloakId = (keycloakUserId: string): Promise<PersonalDTO> =>
  api.get<PersonalDTO>('/personal', { params: { keycloakUserId } }).then(r => r.data);

export const listarTodos = (filtros: PersonalFiltros = {}): Promise<PersonalDTO[]> => {
  const params: Record<string, string | boolean> = {};
  if (filtros.nombre) params.nombre = filtros.nombre;
  if (filtros.tipoPersonal) params.tipoPersonal = filtros.tipoPersonal;
  if (filtros.estadoActivo !== undefined) params.estadoActivo = filtros.estadoActivo;
  return api.get<PersonalDTO[]>('/personal/todos', { params }).then(r => r.data);
};

export const obtenerPorId = (id: number): Promise<PersonalDTO> =>
  api.get<PersonalDTO>(`/personal/${id}`).then(r => r.data);

export const crear = (data: PersonalRequestDTO): Promise<PersonalDTO> =>
  api.post<PersonalDTO>('/personal', data).then(r => r.data);

export const actualizar = (id: number, data: PersonalUpdateRequestDTO): Promise<PersonalDTO> =>
  api.patch<PersonalDTO>(`/personal/${id}`, data).then(r => r.data);

export const habilitar = (id: number): Promise<PersonalDTO> =>
  api.patch<PersonalDTO>(`/personal/${id}/habilitar`).then(r => r.data);

export const deshabilitar = (id: number, solicitanteKeycloakUserId?: string): Promise<PersonalDTO> =>
  api.patch<PersonalDTO>(`/personal/${id}/deshabilitar`, null, { params: { solicitanteKeycloakUserId } }).then(r => r.data);

export const registrarExtensionMedica = (id: number, data: PersonalMedicoRequestDTO): Promise<PersonalMedicoDTO> =>
  api.post<PersonalMedicoDTO>(`/personal/${id}/medico-info`, data).then(r => r.data);

export const listarMedicos = (): Promise<PersonalMedicoDTO[]> =>
  api.get<PersonalMedicoDTO[]>('/personal/medicos').then(r => r.data);

export const listarEspecialidades = (): Promise<EspecialidadDTO[]> =>
  api.get<EspecialidadDTO[]>('/especialidades').then(r => r.data);

export const crearEspecialidad = (data: EspecialidadRequestDTO): Promise<EspecialidadDTO> =>
  api.post<EspecialidadDTO>('/especialidades', data).then(r => r.data);

export const actualizarEspecialidad = (id: number, data: EspecialidadRequestDTO): Promise<EspecialidadDTO> =>
  api.patch<EspecialidadDTO>(`/especialidades/${id}`, data).then(r => r.data);

export const eliminarEspecialidad = (id: number): Promise<void> =>
  api.delete(`/especialidades/${id}`).then(() => undefined);
