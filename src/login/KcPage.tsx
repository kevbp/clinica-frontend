import { Suspense, lazy } from 'react';
import type { KcContext } from './KcContext';
import { useI18n } from './i18n';
import DefaultPage from 'keycloakify/login/DefaultPage';
import UserProfileFormFields from 'keycloakify/login/UserProfileFormFields';
import Template from './Template';

const Login = lazy(() => import('./pages/Login'));

export default function KcPage({ kcContext }: { kcContext: KcContext }) {
  const { i18n } = useI18n({ kcContext });

  return (
    <Suspense>
      {kcContext.pageId === 'login.ftl' ? (
        <Login
          kcContext={kcContext}
          i18n={i18n}
          Template={Template}
          doUseDefaultCss={false}
        />
      ) : (
        <DefaultPage
          kcContext={kcContext}
          i18n={i18n}
          Template={Template}
          doUseDefaultCss={true}
          UserProfileFormFields={UserProfileFormFields}
          doMakeUserConfirmPassword={false}
        />
      )}
    </Suspense>
  );
}
