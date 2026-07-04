import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as personalApi from '../api/personal';
import type {
  PersonalFiltros,
  PersonalRequestDTO,
  PersonalUpdateRequestDTO,
  PersonalMedicoRequestDTO,
  EspecialidadRequestDTO,
} from '../types/personal';

export function useListaPersonal(filtros: PersonalFiltros = {}) {
  return useQuery({
    queryKey: ['personal', filtros.nombre, filtros.tipoPersonal, filtros.estadoActivo],
    queryFn: () => personalApi.listarTodos(filtros),
  });
}

export function useCrearPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PersonalRequestDTO) => personalApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useActualizarPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PersonalUpdateRequestDTO }) =>
      personalApi.actualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useHabilitarPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => personalApi.habilitar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useDeshabilitarPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, solicitanteKeycloakUserId }: { id: number; solicitanteKeycloakUserId?: string }) =>
      personalApi.deshabilitar(id, solicitanteKeycloakUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useEspecialidades() {
  return useQuery({
    queryKey: ['especialidades'],
    queryFn: personalApi.listarEspecialidades,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMedicos() {
  return useQuery({
    queryKey: ['personal', 'medicos'],
    queryFn: personalApi.listarMedicos,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActualizarEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EspecialidadRequestDTO }) =>
      personalApi.actualizarEspecialidad(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['especialidades'] }),
  });
}

export function useEliminarEspecialidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => personalApi.eliminarEspecialidad(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['especialidades'] }),
  });
}

export function useRegistrarMedico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PersonalMedicoRequestDTO }) =>
      personalApi.registrarExtensionMedica(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}
