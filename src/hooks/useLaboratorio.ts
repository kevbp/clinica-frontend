import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import * as laboratorioApi from '../api/laboratorio';
import type { ExamenRequestDTO, ExamenUpdateRequestDTO } from '../types/laboratorio';

export function useBuscarExamenes(q: string) {
  return useQuery({
    queryKey: ['laboratorio', 'examenes', q],
    queryFn: () => laboratorioApi.listarExamenes(q),
    enabled: q.trim().length >= 2,
  });
}

export function useListarExamenes(q?: string) {
  return useQuery({
    queryKey: ['laboratorio', 'catalogo', q ?? ''],
    queryFn: () => laboratorioApi.listarExamenes(q),
  });
}

export function useNombresExamenes(ids: number[]) {
  const idsUnicos = Array.from(new Set(ids));
  const resultados = useQueries({
    queries: idsUnicos.map(id => ({
      queryKey: ['laboratorio', 'examen', id],
      queryFn: () => laboratorioApi.obtenerExamen(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const mapa = new Map<number, string>();
  idsUnicos.forEach((id, i) => {
    const data = resultados[i]?.data;
    if (data) mapa.set(id, data.nombre);
  });
  return mapa;
}

export function useAutorizadosPorPaciente(idPaciente: number | null) {
  return useQuery({
    queryKey: ['laboratorio', 'autorizados', idPaciente],
    queryFn: () => laboratorioApi.listarAutorizadosPorPaciente(idPaciente!),
    enabled: idPaciente !== null,
  });
}

export function useDisponibilidadLaboratorio() {
  return useQuery({
    queryKey: ['laboratorio', 'disponibilidad'],
    queryFn: laboratorioApi.verificarDisponibilidad,
    retry: false,
  });
}

export function useCrearExamen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamenRequestDTO) => laboratorioApi.crearExamen(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['laboratorio'] }),
  });
}

export function useActualizarExamen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExamenUpdateRequestDTO }) =>
      laboratorioApi.actualizarExamen(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['laboratorio'] }),
  });
}
