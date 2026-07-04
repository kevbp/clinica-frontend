import { useQuery, useQueries } from '@tanstack/react-query';
import * as farmaciaApi from '../api/farmacia';

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
