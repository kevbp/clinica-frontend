type ApiErrorShape = {
  response?: {
    status?: number;
    // GlobalExceptionHandler (incluye ResponseStatusException) → {"mensaje":"..."}
    // Fallback legacy → {"detail":"..."} / {"message":"..."}
    data?: { mensaje?: string; detail?: string; message?: string };
  };
  message?: string;
};

export function extractApiError(err: unknown): { status?: number; msg?: string } {
  const e = err as ApiErrorShape;
  return {
    status: e?.response?.status,
    msg: e?.response?.data?.mensaje ?? e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message,
  };
}

export function serviceErrorMessage(err: unknown, servicio: string, puerto: number): string {
  const { status, msg } = extractApiError(err);
  if (status === 502 || status === 503) return `${servicio} no disponible (${status}). Puerto ${puerto}.`;
  return msg ?? 'Error desconocido. Revise la consola del navegador.';
}

export function titleForStatus(status?: number): string {
  if (status === 400) return 'Datos inválidos';
  if (status === 404) return 'No encontrado';
  if (status === 409) return 'Conflicto';
  if (status === 412) return 'Condición previa no cumplida';
  if (status === 502 || status === 503) return 'Servicio no disponible';
  return 'Error';
}
