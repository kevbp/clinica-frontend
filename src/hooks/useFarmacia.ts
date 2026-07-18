import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import * as farmaciaApi from '../api/farmacia';
import type { MedicamentoRequestDTO, MedicamentoUpdateRequestDTO, LoteRequestDTO, LoteUpdateRequestDTO } from '../types/farmacia';

export function useBuscarMedicamentos(q: string) {
  return useQuery({
    queryKey: ['farmacia', 'medicamentos', q],
    queryFn: () => farmaciaApi.listarMedicamentos(q),
    enabled: q.trim().length >= 2,
  });
}

// Resuelve nombres de medicamentos para una lista de IDs (la receta del borrador solo trae idMedicamento).
export function useNombresMedicamentos(ids: number[]) {
  const idsUnicos = Array.from(new Set(ids));
  const resultados = useQueries({
    queries: idsUnicos.map(id => ({
      queryKey: ['farmacia', 'medicamento', id],
      queryFn: () => farmaciaApi.obtenerMedicamento(id),
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

export function useMedicamentosConStock(q?: string) {
  return useQuery({
    queryKey: ['farmacia', 'conStock', q ?? ''],
    queryFn: () => farmaciaApi.listarMedicamentosConStock(q),
  });
}

export function useStockBajo(umbral = 10) {
  return useQuery({
    queryKey: ['farmacia', 'stockBajo', umbral],
    queryFn: () => farmaciaApi.listarStockBajo(umbral),
  });
}

export function useProximosAVencer(dias = 30) {
  return useQuery({
    queryKey: ['farmacia', 'proximosVencer', dias],
    queryFn: () => farmaciaApi.listarProximosAVencer(dias),
  });
}

export function useDisponibilidadFarmacia() {
  return useQuery({
    queryKey: ['farmacia', 'disponibilidad'],
    queryFn: farmaciaApi.verificarDisponibilidad,
    retry: false,
  });
}

export function useCrearMedicamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicamentoRequestDTO) => farmaciaApi.crearMedicamento(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmacia'] }),
  });
}

export function useActualizarMedicamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicamentoUpdateRequestDTO }) =>
      farmaciaApi.actualizarMedicamento(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmacia'] }),
  });
}

export function useAgregarLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idMedicamento, data }: { idMedicamento: number; data: LoteRequestDTO }) =>
      farmaciaApi.agregarLote(idMedicamento, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmacia'] }),
  });
}

export function useActualizarLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idMedicamento, idLote, data }: { idMedicamento: number; idLote: number; data: LoteUpdateRequestDTO }) =>
      farmaciaApi.actualizarLote(idMedicamento, idLote, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmacia'] }),
  });
}

export function useKardex(idMedicamento: number | null, desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ['kardex', idMedicamento, desde, hasta],
    queryFn: () => farmaciaApi.obtenerKardex(idMedicamento!, desde, hasta),
    enabled: idMedicamento !== null,
  });
}
