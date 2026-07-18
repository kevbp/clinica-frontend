export interface PacienteSnapshot {
  id: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  fechaNacimiento?: string;
}

export interface MedicoSnapshot {
  id: number;
  nombres: string;
  apellidos: string;
  numeroColegiatura?: string;
  especialidad?: string;
}

export interface DiagnosticoDTO {
  codigoCie10: string;
  descripcion: string;
  tipoDiagnostico?: string; // 'PRESUNTIVO' | 'DEFINITIVO'
}

export interface SignosVitalesDTO {
  peso?: number;
  talla?: number;
  presionArterial?: string;
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

export interface RecetaDTO {
  idReceta: string;
  idEpisodioClinico: string;
  idPaciente: number;
  idPersonalMedico: number;
  fechaEmision?: string;
  paciente?: PacienteSnapshot;
  medico?: MedicoSnapshot;
  lineas: LineaRecetaDTO[];
}

export interface LineaOrdenDTO {
  idExamen: number;
  nombreExamen?: string;
  categoria?: string;
  indicacionesPreparacion?: string;
}

export interface OrdenLaboratorioDTO {
  idOrden: string;
  idEpisodioClinico: string;
  idPaciente: number;
  idPersonalMedico: number;
  fechaEmision?: string;
  paciente?: PacienteSnapshot;
  medico?: MedicoSnapshot;
  lineas: LineaOrdenDTO[];
}

export interface AdendaDTO {
  idAdenda: string;
  idEpisodioPadre: string;
  fechaCorreccion: string;
  idPersonalMedico: number;
  textoRectificacion: string;
}

export interface EpisodioClinicoDTO {
  idEpisodio: string;
  idHistoriaClinica: string;
  idPaciente: number;
  idCita: number;
  idPersonalMedico: number;
  paciente?: PacienteSnapshot;
  medico?: MedicoSnapshot;
  fechaAtencion: string;
  motivoConsulta?: string;
  signosVitales?: SignosVitalesDTO;
  diagnostico: DiagnosticoDTO;
  observacionesClinicas?: string;
}

export interface EpisodioCompletoDTO extends EpisodioClinicoDTO {
  receta?: RecetaDTO;
  ordenLaboratorio?: OrdenLaboratorioDTO;
  adendas: AdendaDTO[];
}

export interface HistoriaClinicaDTO {
  id: string;
  codigoHistoria: string;
  idPaciente: number;
  fechaCreacion: string;
  estado: string;
}
