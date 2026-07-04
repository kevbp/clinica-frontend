import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as atencionApi from '../api/atencion';
import type {
  IniciarAtencionRequestDTO,
  ActualizarAnamnesisRequestDTO,
  DiagnosticoRequestDTO,
  AgregarRecetaRequestDTO,
  AgregarOrdenRequestDTO,
} from '../types/atencion';

export function useDisponibilidadAtencion() {
  return useQuery({
    queryKey: ['atencion', 'disponibilidad-servicio'],
    queryFn: () => atencionApi.verificarDisponibilidad(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useBorrador(idCita: number | null) {
  return useQuery({
    queryKey: ['atencion', 'borrador', idCita],
    queryFn: () => atencionApi.obtenerBorrador(idCita!),
    enabled: idCita !== null,
    retry: false,
  });
}

export function useBuscarCie10(q: string) {
  return useQuery({
    queryKey: ['cie10', q],
    queryFn: () => atencionApi.buscarCie10(q),
    enabled: q.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIniciarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IniciarAtencionRequestDTO) => atencionApi.iniciar(data),
    onSuccess: (result) => qc.setQueryData(['atencion', 'borrador', result.idCita], result),
  });
}

export function useActualizarAnamnesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idCita, data }: { idCita: number; data: ActualizarAnamnesisRequestDTO }) =>
      atencionApi.actualizarAnamnesis(idCita, data),
    onSuccess: (result) => qc.setQueryData(['atencion', 'borrador', result.idCita], result),
  });
}

export function useAgregarDiagnostico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idCita, data }: { idCita: number; data: DiagnosticoRequestDTO }) =>
      atencionApi.agregarDiagnostico(idCita, data),
    onSuccess: (result) => qc.setQueryData(['atencion', 'borrador', result.idCita], result),
  });
}

export function useAgregarReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idCita, data }: { idCita: number; data: AgregarRecetaRequestDTO }) =>
      atencionApi.agregarReceta(idCita, data),
    onSuccess: (result) => qc.setQueryData(['atencion', 'borrador', result.borrador.idCita], result.borrador),
  });
}

export function useAgregarOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idCita, data }: { idCita: number; data: AgregarOrdenRequestDTO }) =>
      atencionApi.agregarOrden(idCita, data),
    onSuccess: (result) => qc.setQueryData(['atencion', 'borrador', result.borrador.idCita], result.borrador),
  });
}

export function useFinalizarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idCita: number) => atencionApi.finalizar(idCita),
    onSuccess: (_result, idCita) => {
      qc.removeQueries({ queryKey: ['atencion', 'borrador', idCita] });
      qc.invalidateQueries({ queryKey: ['citas', 'listado'] });
    },
  });
}
