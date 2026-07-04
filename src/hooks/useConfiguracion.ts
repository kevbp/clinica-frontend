import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as configuracionApi from '../api/configuracion';
import type { ConfiguracionSmtpRequestDTO, ProbarConexionRequestDTO } from '../types/configuracion';

export function useConfiguracionSmtp() {
  return useQuery({
    queryKey: ['configuracion', 'smtp'],
    queryFn: configuracionApi.obtenerSmtp,
  });
}

export function useActualizarConfiguracionSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfiguracionSmtpRequestDTO) => configuracionApi.actualizarSmtp(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion', 'smtp'] }),
  });
}

export function useProbarConexionSmtp() {
  return useMutation({
    mutationFn: (data: ProbarConexionRequestDTO) => configuracionApi.probarConexion(data),
  });
}
