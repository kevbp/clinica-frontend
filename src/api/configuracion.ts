import api from './axios';
import type {
  ConfiguracionSmtpResponseDTO,
  ConfiguracionSmtpRequestDTO,
  ProbarConexionRequestDTO,
} from '../types/configuracion';

export const obtenerSmtp = (): Promise<ConfiguracionSmtpResponseDTO> =>
  api.get<ConfiguracionSmtpResponseDTO>('/notificaciones/configuracion/smtp').then(r => r.data);

export const actualizarSmtp = (data: ConfiguracionSmtpRequestDTO): Promise<ConfiguracionSmtpResponseDTO> =>
  api.put<ConfiguracionSmtpResponseDTO>('/notificaciones/configuracion/smtp', data).then(r => r.data);

export const probarConexion = (data: ProbarConexionRequestDTO): Promise<void> =>
  api.post('/notificaciones/configuracion/smtp/probar', data).then(() => undefined);
