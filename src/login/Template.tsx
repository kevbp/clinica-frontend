import DefaultTemplate from 'keycloakify/login/Template';
import type { TemplateProps } from 'keycloakify/login/TemplateProps';
import type { KcContext } from './KcContext';
import type { I18n } from './i18n';

export default function Template(props: TemplateProps<KcContext, I18n>) {
  return <DefaultTemplate {...props} documentTitle="Sistema de Gestión Clínico" />;
}
