export interface DiagnosticoDTO {
  codigoCie10: string;
  descripcion: string;
  tipoDiagnostico?: string; // 'PRESUNTIVO' | 'DEFINITIVO'
}

export interface SignosVitalesDTO {
  peso?: number;           // kg
  talla?: number;          // cm
  presionArterial?: string; // "120/80"
  frecuenciaCardiaca?: number;
  saturacionOxigeno?: number;
  frecuenciaRespiratoria?: number;
  temperatura?: number;
  imc?: number;
}

export interface LineaRecetaDTO {
  idMedicamento: number;
  nombreMedicamento?: string;
  principioActivo?: string;
  presentacion?: string;
  dosis: string;
  viaAdministracion: string;
  frecuencia: string;
  duracion: string;
  cantidadTotal: number;
  indicaciones?: string;
}

export interface LineaOrdenDTO {
  idExamen: number;
  nombreExamen?: string;
  categoria?: string;
  indicacionesPreparacion?: string;
}

export interface BorradorResponseDTO {
  idCita: number;
  idPaciente: number;
  idPersonalMedico: number;
  motivoConsulta?: string;
  signosVitales?: SignosVitalesDTO;
  diagnostico?: DiagnosticoDTO;
  observacionesClinicas?: string;
  lineasReceta: LineaRecetaDTO[];
  lineasOrden: LineaOrdenDTO[];
}

export interface IniciarAtencionRequestDTO {
  idCita: number;
  idPaciente: number;
  idPersonalMedico: number;
}

export interface ActualizarAnamnesisRequestDTO {
  motivoConsulta?: string;
  signosVitales?: SignosVitalesDTO;
}

export interface DiagnosticoRequestDTO {
  codigoCie10: string;
  descripcion: string;
  tipoDiagnostico?: string;
  observacionesClinicas?: string;
}

export interface AgregarRecetaRequestDTO {
  idMedicamento: number;
  dosis: string;
  viaAdministracion: string;
  frecuencia: string;
  duracion: string;
  cantidadTotal: number;
  indicaciones?: string;
}

export interface AntecedenteClinicoDTO {
  id: number;
  idPaciente: number;
  descripcion: string;
  tipo: string;
}

export interface DisponibilidadDTO {
  idMedicamento: number;
  cantidadTotal: number;
}

export interface AgregarRecetaResponseDTO {
  borrador: BorradorResponseDTO;
  advertenciasAntecedentes: AntecedenteClinicoDTO[];
  disponibilidadMedicamento: DisponibilidadDTO | null;
}

export interface AgregarOrdenRequestDTO {
  idExamen: number;
  indicacionesPreparacion?: string;
}

export interface ExamenCatalogoDTO {
  id: number;
  nombre: string;
  categoria: string;
  descripcion?: string;
}

export interface AgregarOrdenResponseDTO {
  borrador: BorradorResponseDTO;
  detalleExamen: ExamenCatalogoDTO;
}

export interface Cie10DTO {
  codigo: string;
  descripcion: string;
  categoria?: string;
}
