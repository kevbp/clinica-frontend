import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cajaApi from '../api/caja';
import type {
  PagoConsultaRequestDTO,
  PagarItemsRequestDTO,
  TarifaConsultaRequestDTO,
} from '../types/caja';

export function useDisponibilidadCaja() {
  return useQuery({
    queryKey: ['caja', 'disponibilidad-servicio'],
    queryFn: () => cajaApi.verificarDisponibilidad(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePagoPorCita(idCita: number | null) {
  return useQuery({
    queryKey: ['caja', 'pago-consulta', 'cita', idCita],
    queryFn: () => cajaApi.obtenerPagoPorCita(idCita!),
    enabled: idCita !== null,
    retry: false,
  });
}

export function useCrearPagoConsulta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PagoConsultaRequestDTO) => cajaApi.crearPagoConsulta(data),
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ['caja', 'pago-consulta', 'cita', result.idCita] }),
  });
}

export function useConfirmarPagoConsulta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cajaApi.confirmarPagoConsulta(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['caja', 'pago-consulta', 'cita', result.idCita] });
      qc.invalidateQueries({ queryKey: ['citas', 'listado'] });
    },
  });
}

export function useTarifas() {
  return useQuery({
    queryKey: ['caja', 'tarifas'],
    queryFn: cajaApi.listarTarifas,
  });
}

export function useGuardarTarifa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TarifaConsultaRequestDTO) => cajaApi.guardarTarifa(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja', 'tarifas'] }),
  });
}

export function useNotasCredito(idPaciente: number | null) {
  return useQuery({
    queryKey: ['caja', 'notas-credito', idPaciente],
    queryFn: () => cajaApi.listarNotasCredito(idPaciente!),
    enabled: idPaciente !== null,
  });
}

export function useProformasPorPaciente(idPaciente: number | null) {
  return useQuery({
    queryKey: ['caja', 'proformas', idPaciente],
    queryFn: () => cajaApi.listarProformasPorPaciente(idPaciente!),
    enabled: idPaciente !== null,
  });
}

export function useConstruirProforma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idPaciente: number) => cajaApi.construirProforma(idPaciente),
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ['caja', 'proformas', result.idPaciente] }),
  });
}

export function usePagarItemsProforma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PagarItemsRequestDTO }) =>
      cajaApi.pagarItemsProforma(id, data),
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ['caja', 'proformas', result.idPaciente] }),
  });
}

export function useEmitirComprobante() {
  return useMutation({
    mutationFn: (id: number) => cajaApi.emitirComprobante(id),
  });
}

export function useComprobantesPorPaciente(idPaciente: number | null) {
  return useQuery({
    queryKey: ['caja', 'comprobantes', idPaciente],
    queryFn: () => cajaApi.listarComprobantesPorPaciente(idPaciente!),
    enabled: idPaciente !== null,
  });
}

export function usePagoConsultaPorId(id: number | null) {
  return useQuery({
    queryKey: ['caja', 'pago-consulta', 'id', id],
    queryFn: () => cajaApi.obtenerPagoConsultaPorId(id!),
    enabled: id !== null,
  });
}
