import api from './axios';
import type { MedicamentoResponseDTO } from '../types/farmacia';

export const listarMedicamentos = (q?: string): Promise<MedicamentoResponseDTO[]> =>
  api.get<MedicamentoResponseDTO[]>('/medicamentos', { params: q ? { q } : undefined }).then(r => r.data);

export const obtenerMedicamento = (id: number): Promise<MedicamentoResponseDTO> =>
  api.get<MedicamentoResponseDTO>(`/medicamentos/${id}`).then(r => r.data);
