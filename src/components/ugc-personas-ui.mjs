const useAsProfileFace = "Usar como cara do perfil";

export function profileFaceButton(persona, avatarPersonaId, busy = false) {
  if (!persona.anchor) return null;
  if (persona.id === avatarPersonaId) return { label: "Cara do perfil", disabled: true };
  return { label: useAsProfileFace, disabled: busy };
}

export function personaSaveLabel({ anchor }) {
  return anchor ? "Salvar avatar" : "Salvar rascunho";
}

export function savedAvatarNotice(persona, setProfileAvatar) {
  if (!persona?.anchor) return null;
  return {
    text: "Avatar salvo.",
    actionLabel: useAsProfileFace,
    onAction: () => setProfileAvatar(persona.id),
  };
}

export function tweetPreviewName(name, state) {
  const avatar = state.personas?.find(({ id }) => id === state.media?.avatarPersonaId);
  const profile = state.profiles?.find(({ id }) => id === state.profileId);
  return [
    name,
    state.brandInfo?.name,
    state.profile?.brand,
    avatar?.nome,
    profile?.name,
  ].map((value) => value?.trim()).find(Boolean) || "";
}
