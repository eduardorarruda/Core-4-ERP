import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSyncExternalStore, useEffect, useState, useCallback } from 'react';

// Assina os eventos online/offline do navegador para refletir o estado da conexão na UI.
const subscribe = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

// O app já está rodando instalado (janela standalone)? Aí não faz sentido oferecer instalação.
function estaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari
}

// iOS Safari não dispara `beforeinstallprompt`: a instalação é manual (Compartilhar → Adicionar
// à Tela de Início). Detectamos para mostrar as instruções em vez de um botão que não funciona.
function ehIOS() {
  const ua = window.navigator.userAgent || '';
  const iOS = /iphone|ipad|ipod/i.test(ua)
    // iPad iOS 13+ se apresenta como "Macintosh" com suporte a toque.
    || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  return iOS && safari;
}

/**
 * Estado do PWA: conexão (online/offline), disponibilidade de nova versão e instalação.
 * - `atualizar()` ativa o novo service worker e recarrega (só quando o usuário confirma).
 * - `podeInstalar` + `instalar()` cobrem Android/Chrome (prompt nativo capturado).
 * - `isIOS` sinaliza que a instalação é manual (mostramos instruções).
 */
export function usePwa() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  const [promptInstalacao, setPromptInstalacao] = useState(() => window.deferredInstallPrompt || null);
  const [jaInstalado, setJaInstalado] = useState(estaInstalado);

  useEffect(() => {
    // Evento pode ter disparado antes do React montar — o script no index.html guardou em window.
    if (window.deferredInstallPrompt) setPromptInstalacao(window.deferredInstallPrompt);

    const onInstallable = () => setPromptInstalacao(window.deferredInstallPrompt || null);
    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      setPromptInstalacao(e);
    };
    const onInstalled = () => {
      window.deferredInstallPrompt = null;
      setPromptInstalacao(null);
      setJaInstalado(true);
    };

    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pwa-installed', onInstalled);
    return () => {
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pwa-installed', onInstalled);
    };
  }, []);

  const instalar = useCallback(async () => {
    const prompt = promptInstalacao;
    if (!prompt) return false;
    prompt.prompt();
    const escolha = await prompt.userChoice;
    window.deferredInstallPrompt = null;
    setPromptInstalacao(null);
    return escolha?.outcome === 'accepted';
  }, [promptInstalacao]);

  return {
    online,
    precisaAtualizar,
    atualizar: () => updateServiceWorker(true),
    podeInstalar: !!promptInstalacao && !jaInstalado,
    instalar,
    isIOS: ehIOS(),
    jaInstalado,
  };
}
