import api from './axios';
import type {
  HistoriaClinicaDTO,
  EpisodioClinicoDTO,
  EpisodioCompletoDTO,
  RecetaDTO,
  OrdenLaboratorioDTO,
} from '../types/historias';

export const obtenerHistoriaPorPaciente = (idPaciente: number) =>
  api.get<HistoriaClinicaDTO>(`/historias/paciente/${idPaciente}`).then(r => r.data);

export const listarEpisodiosPorHistoria = (idHistoria: string) =>
  api.get<EpisodioClinicoDTO[]>(`/historias/${idHistoria}/episodios`).then(r => r.data);

export const obtenerEpisodioCompleto = (idEpisodio: string) =>
  api.get<EpisodioCompletoDTO>(`/episodios/${idEpisodio}`).then(r => r.data);

export const listarRecetasPorPaciente = (idPaciente: number) =>
  api.get<RecetaDTO[]>(`/recetas/paciente/${idPaciente}`).then(r => r.data);

export const obtenerReceta = (idReceta: string) =>
  api.get<RecetaDTO>(`/recetas/${idReceta}`).then(r => r.data);

export const listarOrdenesPorPaciente = (idPaciente: number) =>
  api.get<OrdenLaboratorioDTO[]>(`/ordenes/paciente/${idPaciente}`).then(r => r.data);

export const obtenerOrden = (idOrden: string) =>
  api.get<OrdenLaboratorioDTO>(`/ordenes/${idOrden}`).then(r => r.data);

export const verificarDisponibilidad = () =>
  api.get<HistoriaClinicaDTO>('/historias/paciente/0').catch(err => {
    if (err.response?.status === 404) return true;
    throw err;
  });
