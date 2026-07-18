export interface ConsultorioResponseDTO {
  id: number;
  numero: string;
  piso: number;
  ubicacion?: string;
}

export interface ConsultorioRequestDTO {
  numero: string;
  piso: number;
  ubicacion?: string;
}

export interface ConsultorioUpdateRequestDTO {
  numero?: string;
  piso?: number;
  ubicacion?: string;
}

export interface ProgramacionHorarioResponseDTO {
  id: number;
  idPersonal: number;
  consultorio: ConsultorioResponseDTO;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm:ss"
  horaFin: string;
  esPasado: boolean;
}

export interface ProgramacionHorarioRequestDTO {
  idPersonal: number;
  idConsultorio: number;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string;
}

export interface ProgramacionHorarioUpdateRequestDTO {
  idConsultorio?: number;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
}

export interface ProgramacionHorarioBatchRequestDTO {
  idPersonal: number;
  idConsultorio: number;
  fechas: string[]; // ["YYYY-MM-DD", ...]
  horaInicio: string; // "HH:mm"
  horaFin: string;
}

export interface ProgramacionHorarioBatchResponseDTO {
  total: number;
  creados: number;
  turnos: ProgramacionHorarioResponseDTO[];
}
