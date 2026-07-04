import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as pacientesApi from '../api/pacientes';
import type {
  PacienteRequestDTO,
  PacienteUpdateRequestDTO,
  AntecedenteClinicoRequestDTO,
} from '../types/pacientes';

export function useBuscarPacientes(q: string) {
  return useQuery({
    queryKey: ['pacientes', 'buscar', q],
    queryFn: () => pacientesApi.buscar(q),
    enabled: q.length >= 2,
  });
}

export function useDisponibilidadPacientes() {
  return useQuery({
    queryKey: ['pacientes', 'disponibilidad'],
    queryFn: () => pacientesApi.verificarDisponibilidad(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useObtenerPaciente(id: number | null) {
  return useQuery({
    queryKey: ['paciente', id],
    queryFn: () => pacientesApi.obtenerPorId(id!),
    enabled: id !== null,
  });
}

export function useCrearPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PacienteRequestDTO) => pacientesApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  });
}

export function useActualizarPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PacienteUpdateRequestDTO }) =>
      pacientesApi.actualizar(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['pacientes'] });
      qc.invalidateQueries({ queryKey: ['paciente', id] });
    },
  });
}

export function useCambiarEstadoPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo ? pacientesApi.habilitar(id) : pacientesApi.deshabilitar(id),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['pacientes'] });
      qc.invalidateQueries({ queryKey: ['paciente', id] });
    },
  });
}

export function useAntecedentes(idPaciente: number | null) {
  return useQuery({
    queryKey: ['antecedentes', idPaciente],
    queryFn: () => pacientesApi.obtenerAntecedentes(idPaciente!),
    enabled: idPaciente !== null,
  });
}

export function useAgregarAntecedente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AntecedenteClinicoRequestDTO }) =>
      pacientesApi.agregarAntecedente(id, data),
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ['antecedentes', result.idPaciente] }),
  });
}

export function useEliminarAntecedente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idPaciente, idAntecedente }: { idPaciente: number; idAntecedente: number }) =>
      pacientesApi.eliminarAntecedente(idPaciente, idAntecedente),
    onSuccess: (_result, { idPaciente }) =>
      qc.invalidateQueries({ queryKey: ['antecedentes', idPaciente] }),
  });
}
