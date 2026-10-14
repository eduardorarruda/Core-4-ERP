import { useEffect } from 'react';

const SUFIXO_TITULO = 'Core 4 ERP';
const ROBOTS_NOINDEX = 'noindex, nofollow';
// Endereço público do front (primeiro valor de CORS_ORIGINS em produção)
const ORIGEM_CANONICA = 'https://front.core4erp.codes';

function obterMeta(name) {
  return document.head.querySelector(`meta[name="${name}"]`);
}

function definirMeta(name, content) {
  let meta = obterMeta(name);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function obterCanonical() {
  return document.head.querySelector('link[rel="canonical"]');
}

function definirCanonical(href) {
  let link = obterCanonical();
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Liga/desliga <meta name="robots" content="noindex, nofollow">.
 * Útil para telas autenticadas que não devem aparecer em buscadores.
 */
export function setRobotsNoindex(noindex) {
  if (typeof document === 'undefined') return;
  if (noindex) {
    definirMeta('robots', ROBOTS_NOINDEX);
    return;
  }
  const meta = obterMeta('robots');
  if (meta && meta.getAttribute('content') === ROBOTS_NOINDEX) meta.remove();
}

/**
 * Define título, descrição, URL canônica e indexação da página atual.
 * `canonical` é o caminho público (ex.: '/login'); ao desmontar, tudo volta ao anterior.
 */
export function usePageMeta({ title, description, canonical, noindex = false }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const tituloAnterior = document.title;
    const descricaoAnterior = obterMeta('description')?.getAttribute('content') ?? null;
    const canonicalAnterior = obterCanonical()?.getAttribute('href') ?? null;

    if (title) document.title = `${title} | ${SUFIXO_TITULO}`;
    if (description) definirMeta('description', description);
    if (canonical) definirCanonical(`${ORIGEM_CANONICA}${canonical}`);
    setRobotsNoindex(noindex);

    return () => {
      document.title = tituloAnterior;
      if (descricaoAnterior !== null) definirMeta('description', descricaoAnterior);
      else obterMeta('description')?.remove();
      if (canonical && canonicalAnterior !== null) definirCanonical(canonicalAnterior);
      if (noindex) setRobotsNoindex(false);
    };
  }, [title, description, canonical, noindex]);
}

export default usePageMeta;
