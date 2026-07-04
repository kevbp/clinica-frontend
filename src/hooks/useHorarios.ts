import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as horariosApi from '../api/horarios';
import type {
  ConsultorioRequestDTO,
  ConsultorioUpdateRequestDTO,
  ProgramacionHorarioRequestDTO,
  ProgramacionHorarioUpdateRequestDTO,
} from '../types/horarios';

export function useDisponibilidadHorarios() {
  return useQuery({
    queryKey: ['horarios', 'disponibilidad'],
    queryFn: () => horariosApi.verificarDisponibilidad(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useConsultorios() {
  return useQuery({
    queryKey: ['consultorios'],
    queryFn: () => horariosApi.listarConsultorios(),
  });
}

export function useCrearConsultorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConsultorioRequestDTO) => horariosApi.crearConsultorio(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultorios'] }),
  });
}

export function useActualizarConsultorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ConsultorioUpdateRequestDTO }) =>
      horariosApi.actualizarConsultorio(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultorios'] }),
  });
}

export function useEliminarConsultorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => horariosApi.eliminarConsultorio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultorios'] }),
  });
}

export function useTurnosPorPersonal(idPersonal: number | null, desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ['programacion-horarios', 'personal', idPersonal, desde, hasta],
    queryFn: () => horariosApi.obtenerTurnosPorPersonal(idPersonal!, desde, hasta),
    enabled: idPersonal !== null,
  });
}

export function useCrearTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProgramacionHorarioRequestDTO) => horariosApi.crearTurno(data),
    onSuccess: (result) =>
      qc.invalidateQueries({ queryKey: ['programacion-horarios', 'personal', result.idPersonal] }),
  });
}

export function useActualizarTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProgramacionHorarioUpdateRequestDTO }) =>
      horariosApi.actualizarTurno(id, data),
    onSuccess: (result) =>
      qc.invalidateQueries({ queryKey: ['programacion-horarios', 'personal', result.idPersonal] }),
  });
}

export function useEliminarTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; idPersonal: number }) => horariosApi.eliminarTurno(id),
    onSuccess: (_result, { idPersonal }) =>
      qc.invalidateQueries({ queryKey: ['programacion-horarios', 'personal', idPersonal] }),
  });
}
