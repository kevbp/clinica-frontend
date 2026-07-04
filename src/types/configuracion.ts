export interface ConfiguracionSmtpResponseDTO {
  host: string | null;
  puerto: number | null;
  username: string | null;
  passwordConfigurado: boolean;
  remitente: string | null;
  starttlsEnabled: boolean;
}

export interface ConfiguracionSmtpRequestDTO {
  host: string;
  puerto: number;
  username: string;
  password?: string;
  remitente: string;
  starttlsEnabled: boolean;
}

export interface ProbarConexionRequestDTO {
  correoDestino: string;
}
