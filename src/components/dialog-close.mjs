export function isBackdropEvent(event, dialog) {
  if (event.target !== dialog) return false;
  const { left, right, top, bottom } = dialog.getBoundingClientRect();
  return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
}

export function canCloseFromBackdrop(pointerDownOnBackdrop, clickOnBackdrop) {
  return pointerDownOnBackdrop && clickOnBackdrop;
}

export function shouldBlockPersonaClose({ reason, picking, busy, ignoreCloseUntil, now }) {
  if (picking || busy) return true;
  return (reason === "onCancel" || reason === "backdrop-click") && now < ignoreCloseUntil;
}
