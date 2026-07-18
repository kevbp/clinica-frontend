export interface ExamenResponseDTO {
  id: number;
  nombre: string;
  categoria: string;
  descripcion?: string;
  precio?: number;
}

export interface ExamenRequestDTO {
  nombre: string;
  categoria: string;
  descripcion?: string;
  precio: number;
}

export interface ExamenUpdateRequestDTO {
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  precio?: number;
}

export interface ExamenAutorizadoResponseDTO {
  id: number;
  idPaciente: number;
  idEpisodioClinico: string;
  idExamen: number;
  nombreExamen: string;
  fechaAutorizacion: string;
}
