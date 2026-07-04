import api from './axios';
import type {
  BorradorResponseDTO,
  IniciarAtencionRequestDTO,
  ActualizarAnamnesisRequestDTO,
  DiagnosticoRequestDTO,
  AgregarRecetaRequestDTO,
  AgregarRecetaResponseDTO,
  AgregarOrdenRequestDTO,
  AgregarOrdenResponseDTO,
  Cie10DTO,
} from '../types/atencion';

export const iniciar = (data: IniciarAtencionRequestDTO): Promise<BorradorResponseDTO> =>
  api.post<BorradorResponseDTO>('/atenciones/iniciar', data).then(r => r.data);

export const obtenerBorrador = (idCita: number): Promise<BorradorResponseDTO> =>
  api.get<BorradorResponseDTO>(`/atenciones/${idCita}/borrador`).then(r => r.data);

export const guardarBorrador = (idCita: number, data: BorradorResponseDTO): Promise<BorradorResponseDTO> =>
  api.put<BorradorResponseDTO>(`/atenciones/${idCita}/borrador`, data).then(r => r.data);

export const actualizarAnamnesis = (idCita: number, data: ActualizarAnamnesisRequestDTO): Promise<BorradorResponseDTO> =>
  api.patch<BorradorResponseDTO>(`/atenciones/${idCita}/anamnesis`, data).then(r => r.data);

export const agregarDiagnostico = (idCita: number, data: DiagnosticoRequestDTO): Promise<BorradorResponseDTO> =>
  api.post<BorradorResponseDTO>(`/atenciones/${idCita}/diagnostico`, data).then(r => r.data);

export const agregarReceta = (idCita: number, data: AgregarRecetaRequestDTO): Promise<AgregarRecetaResponseDTO> =>
  api.post<AgregarRecetaResponseDTO>(`/atenciones/${idCita}/recetas`, data).then(r => r.data);

export const agregarOrden = (idCita: number, data: AgregarOrdenRequestDTO): Promise<AgregarOrdenResponseDTO> =>
  api.post<AgregarOrdenResponseDTO>(`/atenciones/${idCita}/ordenes-examen`, data).then(r => r.data);

export const finalizar = (idCita: number): Promise<BorradorResponseDTO> =>
  api.post<BorradorResponseDTO>(`/atenciones/${idCita}/finalizar`).then(r => r.data);

export const buscarCie10 = (q: string): Promise<Cie10DTO[]> =>
  api.get<Cie10DTO[]>('/atenciones/cie10', { params: { q } }).then(r => r.data);

export const verificarDisponibilidad = (): Promise<boolean> =>
  api.get('/atenciones/0/borrador')
    .then(() => true)
    .catch(err => {
      if (err?.response?.status === 404) return true;
      throw err;
    });
