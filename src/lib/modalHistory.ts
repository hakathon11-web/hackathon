type CloseRequest = () => void;

const modalStack: CloseRequest[] = [];
let listening = false;

const ensureListener = () => {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', () => {
    const close = modalStack.pop();
    if (close) {
      // Ask the top-most modal to close without pushing another history change
      try { close(); } catch {}
    }
    if (modalStack.length === 0) {
      // Keep listener; it's cheap, but we could also remove it
    }
  });
};

export interface ModalRegistration {
  /** Call when the user closes the modal via UI (X, Cancel). */
  closeManually: () => void;
  /** Call if the component unmounts while still registered. */
  unregister: () => void;
}

export const modalHistory = {
  getDepth(): number {
    return modalStack.length;
  },
  register(requestClose: CloseRequest): ModalRegistration {
    ensureListener();
    modalStack.push(requestClose);
    try { window.history.pushState({ modalDepth: modalStack.length }, '', window.location.href); } catch {}

    const closeManually = () => {
      // Do not mutate stack here. Let the popstate listener pop the top-most modal (this one)
      // to avoid accidentally closing parent modals.
      try { window.history.back(); } catch {}
    };

    const unregister = () => {
      const idx = modalStack.lastIndexOf(requestClose);
      if (idx !== -1) modalStack.splice(idx, 1);
    };

    return { closeManually, unregister };
  }
};


