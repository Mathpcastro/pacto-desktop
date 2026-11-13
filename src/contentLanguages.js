// Idiomas em que o carrossel pode sair (texto, legenda, stories e o texto dentro das artes).
// É separado do idioma da tela: dá para usar o app em português e gerar em inglês.
export const CONTENT_LANGUAGE_OPTIONS = [
  ["pt-BR", "Português do Brasil", ""],
  ["pt-PT", "Português de Portugal", ""],
  ["es", "Espanhol", ""],
  ["en", "Inglês", ""],
];

export function contentLanguageLabel(id) {
  return CONTENT_LANGUAGE_OPTIONS.find(([value]) => value === id)?.[1] || "Português do Brasil";
}

// Padrão do perfil; sem padrão, o idioma da tela (como antes da escolha existir).
export function defaultContentLanguage(state) {
  const saved = state?.settings?.contentLanguage;
  if (CONTENT_LANGUAGE_OPTIONS.some(([value]) => value === saved)) return saved;
  return state?.settings?.language === "es" ? "es" : "pt-BR";
}
