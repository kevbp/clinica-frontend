export type EstadoCita = 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'ATENDIDA' | 'CANCELADA';

export interface CitaMedicaResponseDTO {
  id: number;
  idPaciente: number;
  idPersonal: number;
  idConsultorio: number;
  fechaHora: string; // ISO LocalDateTime
  estado: EstadoCita;
}

export interface CitaMedicaRequestDTO {
  idPaciente: number;
  idPersonal: number;
  fechaHora: string;
  notificarCorreo?: boolean;
}

export interface ReagendarRequestDTO {
  nuevaFechaHora: string;
}

export interface SlotDisponibleDTO {
  fechaHora: string;
  idConsultorio: number;
}

export interface CitasFiltros {
  idPaciente?: number;
  idPersonal?: number;
  estado?: EstadoCita;
  fecha?: string; // YYYY-MM-DD
}
