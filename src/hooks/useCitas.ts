import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import * as citasApi from '../api/citas';
import * as pacientesApi from '../api/pacientes';
import type { CitaMedicaRequestDTO, ReagendarRequestDTO, CitasFiltros } from '../types/citas';

export function useDisponibilidadCitas() {
  return useQuery({
    queryKey: ['citas', 'disponibilidad-servicio'],
    queryFn: () => citasApi.verificarDisponibilidad(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useListaCitas(filtros: CitasFiltros = {}, enabled = true) {
  return useQuery({
    queryKey: ['citas', 'listado', filtros.idPaciente, filtros.idPersonal, filtros.estado, filtros.fecha],
    queryFn: () => citasApi.listar(filtros),
    enabled,
  });
}

export function useCitaPorId(id: number | null) {
  return useQuery({
    queryKey: ['citas', 'detalle', id],
    queryFn: () => citasApi.obtenerPorId(id!),
    enabled: id !== null,
  });
}

export function useSlotsDisponibles(idPersonal: number | null, fecha: string | null) {
  return useQuery({
    queryKey: ['citas', 'slots', idPersonal, fecha],
    queryFn: () => citasApi.disponibilidad(idPersonal!, fecha!),
    enabled: idPersonal !== null && fecha !== null,
  });
}

export function useCrearCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CitaMedicaRequestDTO) => citasApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citas'] });
    },
  });
}

export function useCancelarPendientePago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => citasApi.cancelarPendientePago(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citas', 'listado'] }),
  });
}

export function useCancelarConfirmada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => citasApi.cancelarConfirmada(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citas', 'listado'] }),
  });
}

export function useCancelarPorClinica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => citasApi.cancelarPorClinica(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citas', 'listado'] }),
  });
}

export function useReagendarCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReagendarRequestDTO }) =>
      citasApi.reagendar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citas', 'listado'] }),
  });
}

// Resuelve nombres de pacientes para una lista de IDs (la cita solo trae idPaciente).
export function useNombresPacientes(ids: number[]) {
  const idsUnicos = Array.from(new Set(ids));
  const resultados = useQueries({
    queries: idsUnicos.map(id => ({
      queryKey: ['pacientes', 'nombre', id],
      queryFn: () => pacientesApi.obtenerPorId(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const mapa = new Map<number, string>();
  idsUnicos.forEach((id, i) => {
    const data = resultados[i]?.data;
    if (data) mapa.set(id, `${data.nombres} ${data.apellidos}`);
  });
  return mapa;
}
