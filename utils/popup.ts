export type PopupTone = 'info' | 'error' | 'success';

export interface AppPopupPayload {
  title?: string;
  message: string;
  tone?: PopupTone;
}

export const APP_POPUP_EVENT = 'sustain:app-popup';

export const showAppPopup = (payloadOrMessage: AppPopupPayload | string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: AppPopupPayload = typeof payloadOrMessage === 'string'
    ? { message: payloadOrMessage, tone: 'info' }
    : payloadOrMessage;

  window.dispatchEvent(new CustomEvent<AppPopupPayload>(APP_POPUP_EVENT, { detail: payload }));
};
