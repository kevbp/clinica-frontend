export type TipoPersonal = 'MEDICO' | 'RECEPCIONISTA' | 'TECNICO_LABORATORIO' | 'ADMINISTRATIVO' | 'ADMIN';

export interface EspecialidadDTO {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface PersonalMedicoDTO {
  idPersonal: number;
  nombres: string;
  apellidos: string;
  numeroColegiatura: string;
  especialidad: EspecialidadDTO;
}

export interface PersonalDTO {
  id: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  celular?: string;
  correo?: string;
  fechaIngreso: string;
  estadoActivo: boolean;
  tipoPersonal: TipoPersonal;
  keycloakUserId: string;
  medicoInfo?: PersonalMedicoDTO;
}

export interface PersonalRequestDTO {
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  celular?: string;
  correo?: string;
  fechaIngreso: string;
  tipoPersonal: TipoPersonal;
  keycloakUserId?: string;
  // Requeridos solo cuando tipoPersonal === 'MEDICO' — validados en el backend
  numeroColegiatura?: string;
  idEspecialidad?: number;
}

export interface PersonalUpdateRequestDTO {
  nombres?: string;
  apellidos?: string;
  documentoIdentidad?: string;
  celular?: string;
  correo?: string;
  fechaIngreso?: string;
  tipoPersonal?: TipoPersonal;
  numeroColegiatura?: string;
  idEspecialidad?: number;
}

export interface PersonalMedicoRequestDTO {
  numeroColegiatura: string;
  idEspecialidad: number;
}

export interface EspecialidadRequestDTO {
  nombre: string;
  descripcion?: string;
}

export interface PersonalFiltros {
  nombre?: string;
  tipoPersonal?: TipoPersonal;
  estadoActivo?: boolean;
}
