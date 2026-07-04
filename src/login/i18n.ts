import { i18nBuilder } from 'keycloakify/login';

const { useI18n, ofTypeI18n } = i18nBuilder
  .withThemeName<'sistema-clinico'>()
  .withCustomTranslations({
    en: { loginAccountTitle: 'Sistema de Gestion Clinica' },
    es: { loginAccountTitle: 'Sistema de Gestion Clinica' },
  })
  .build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
