import { useQuery, useQueries } from '@tanstack/react-query';
import * as laboratorioApi from '../api/laboratorio';

export function useBuscarExamenes(q: string) {
  return useQuery({
    queryKey: ['laboratorio', 'examenes', q],
    queryFn: () => laboratorioApi.listarExamenes(q),
    enabled: q.trim().length >= 2,
  });
}

// Resuelve nombres de exámenes para una lista de IDs (la orden del borrador solo trae idExamen).
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
