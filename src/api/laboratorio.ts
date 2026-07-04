import api from './axios';
import type { ExamenResponseDTO } from '../types/laboratorio';

export const listarExamenes = (q?: string): Promise<ExamenResponseDTO[]> =>
  api.get<ExamenResponseDTO[]>('/examenes', { params: q ? { q } : undefined }).then(r => r.data);

export const obtenerExamen = (id: number): Promise<ExamenResponseDTO> =>
  api.get<ExamenResponseDTO>(`/examenes/${id}`).then(r => r.data);
