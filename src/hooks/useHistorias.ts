import { useQuery } from '@tanstack/react-query';
import * as historiasApi from '../api/historias';

export function useDisponibilidadHistorias() {
  return useQuery({
    queryKey: ['historias', 'ping'],
    queryFn: () => historiasApi.verificarDisponibilidad().then(() => true),
    retry: false,
    staleTime: 30_000,
  });
}

export function useHistoriaPorPaciente(idPaciente: number | null) {
  return useQuery({
    queryKey: ['historias', 'paciente', idPaciente],
    queryFn: () => historiasApi.obtenerHistoriaPorPaciente(idPaciente!),
    enabled: idPaciente != null,
    retry: false,
  });
}

export function useEpisodiosPorHistoria(idHistoria: string | null) {
  return useQuery({
    queryKey: ['historias', 'episodios', idHistoria],
    queryFn: () => historiasApi.listarEpisodiosPorHistoria(idHistoria!),
    enabled: idHistoria != null,
  });
}

export function useEpisodioCompleto(idEpisodio: string | null) {
  return useQuery({
    queryKey: ['historias', 'episodio', idEpisodio],
    queryFn: () => historiasApi.obtenerEpisodioCompleto(idEpisodio!),
    enabled: idEpisodio != null,
    staleTime: 5 * 60_000,
  });
}
