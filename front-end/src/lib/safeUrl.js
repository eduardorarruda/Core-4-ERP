// Protocolos aceitos em links vindos de dados (respostas da IA, cadastros etc.).
// Bloqueia javascript:, data:, vbscript: e afins, que executariam código ao clicar.
const PROTOCOLOS_PERMITIDOS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Devolve a URL se ela for segura para usar em href, ou null caso contrário.
 * Aceita caminhos relativos ("/x", "./x", "../x", "#x", "?x") e URLs http(s)/mailto.
 */
export function safeUrl(href) {
  if (typeof href !== 'string') return null;
  const url = href.trim();
  if (!url) return null;
  // Caracteres de controle/espaços podem esconder um "javascript:" (ex.: "java\tscript:")
  // eslint-disable-next-line no-control-regex -- a verificação é justamente por caracteres de controle
  if (/[\u0000-\u001F\u007F\s]/.test(url)) return null;

  // "//host" é relativo ao protocolo, mas leva a outro domínio — trata como absoluto
  if (/^(\/(?!\/)|\.\.?\/|#|\?)/.test(url)) return url;

  try {
    const { protocol } = new URL(url);
    return PROTOCOLOS_PERMITIDOS.has(protocol) ? url : null;
  } catch {
    // Sem protocolo e sem barra inicial (ex.: "relatorio.xlsx"): relativo à página atual
    return /^[\w.-]+(\/[\w.\-/%]*)?$/.test(url) ? url : null;
  }
}

/** true se a URL aponta para fora da origem atual (abre em nova aba). */
export function isExternalUrl(href) {
  try {
    return new URL(href, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
}
