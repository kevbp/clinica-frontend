import { ReactKeycloakProvider } from '@react-keycloak/web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import keycloak from './keycloak';
import AppRouter from './router/AppRouter';
import { antdTheme } from './theme';
import './index.css';

dayjs.locale('es');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function MainApp() {
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{ onLoad: 'login-required', checkLoginIframe: false }}
    >
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={antdTheme} locale={esES}>
          <App>
            <AppRouter />
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    </ReactKeycloakProvider>
  );
}
