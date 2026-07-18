export type TipoAntecedente = 'ENFERMEDAD_CRONICA' | 'ALERGIA' | 'OTRO';

export interface PacienteResponseDTO {
  id: number;
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento?: string; // "YYYY-MM-DD" — puede ser null en pacientes registrados antes de este campo
  direccion?: string;
  celular?: string;
  correo?: string;
  estadoActivo: boolean;
  sexo?: 'MASCULINO' | 'FEMENINO';
  grupoSanguineo?: string;
  nombreBanco?: string;
  numeroCuenta?: string;
}

export interface PacienteRequestDTO {
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string; // "YYYY-MM-DD"
  direccion?: string;
  celular?: string;
  correo?: string;
}

export interface PacienteUpdateRequestDTO {
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  direccion?: string | null;
  celular?: string | null;
  correo?: string | null;
  nombreBanco?: string | null;
  numeroCuenta?: string | null;
}

export interface AntecedenteClinicoResponseDTO {
  id: number;
  idPaciente: number;
  descripcion: string;
  tipo: TipoAntecedente;
}

export interface AntecedenteClinicoRequestDTO {
  descripcion: string;
  tipo: TipoAntecedente;
}
