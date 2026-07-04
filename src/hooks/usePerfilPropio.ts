import { useQuery } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import { buscarPorKeycloakId } from '../api/personal';

export function usePerfilPropio() {
  const { keycloak } = useKeycloak();
  const keycloakUserId = keycloak.tokenParsed?.sub ?? '';

  return useQuery({
    queryKey: ['perfil-propio', keycloakUserId],
    queryFn: () => buscarPorKeycloakId(keycloakUserId),
    enabled: !!keycloakUserId,
    staleTime: 5 * 60 * 1000,
  });
}
