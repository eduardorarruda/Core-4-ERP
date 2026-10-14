import { clearAuth, getEmpresaAtivaId } from '../../lib/api';
import { traduzirErroPermissao } from '../../lib/permissaoMessages';

/**
 * Chamadas das telas da Visão geral que ainda não estão em `lib/api.js`
 * (Orçamentos e Insights — V52).
 *
 * `lib/api.js` não exporta o helper `request`; este arquivo replica o mínimo dele
 * (cookie JWT, empresa ativa, 401 → login, mensagem de erro traduzida). Quando `request`
 * for exportado, troque `requisitar` por ele e apague o helper local.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TEMPO_LIMITE_MS = 30000;

async function requisitar(caminho, { method = 'GET', corpo } = {}) {
  const empresaId = getEmpresaAtivaId();
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let res;
  try {
    res = await fetch(`${BASE_URL}${caminho}`, {
      method,
      credentials: 'include',
      signal: controle.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(empresaId ? { 'X-Empresa-Id': String(empresaId) } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Error('O servidor demorou para responder. Tente de novo.', { cause: erro });
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.', { cause: erro });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const corpoErro = await res.json().catch(() => ({}));
    const erro = new Error(traduzirErroPermissao(corpoErro.mensagem || `Erro ${res.status}`));
    erro.status = res.status;
    erro.codigo = corpoErro.codigo ?? null;
    throw erro;
  }
  if (res.status === 204) return null;
  const texto = await res.text();
  if (!texto?.trim()) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

const qsMes = (mes) => (mes ? `?mes=${encodeURIComponent(mes)}` : '');

/** Orçamento mensal por categoria (ORCAMENTO_VISUALIZAR / ORCAMENTO_EDITAR). */
export const orcamentosApi = {
  listar: (mes) => requisitar(`/api/orcamentos${qsMes(mes)}`),
  sugestoes: (mes) => requisitar(`/api/orcamentos/sugestoes${qsMes(mes)}`),
  criar: (dto) => requisitar('/api/orcamentos', { method: 'POST', corpo: dto }),
  atualizar: (id, dto) => requisitar(`/api/orcamentos/${id}`, { method: 'PUT', corpo: dto }),
  excluir: (id) => requisitar(`/api/orcamentos/${id}`, { method: 'DELETE' }),
};

/** Leituras do mês (DASHBOARD_VISUALIZAR). */
export const insightsApi = {
  doMes: (mes) => requisitar(`/api/insights${qsMes(mes)}`),
};
