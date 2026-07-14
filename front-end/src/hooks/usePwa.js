import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSyncExternalStore } from 'react';

// Assina os eventos online/offline do navegador para refletir o estado da conexão na UI.
const subscribe = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

/**
 * Estado do PWA: conexão (online/offline) e disponibilidade de nova versão.
 * `atualizar()` ativa o novo service worker e recarrega — chamado só quando o usuário confirma.
 */
export function usePwa() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();
  return { online, precisaAtualizar, atualizar: () => updateServiceWorker(true) };
}
