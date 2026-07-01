import { traduzirErroPermissao } from './permissaoMessages.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export function setUsuario(u) {
  sessionStorage.setItem('usuario', JSON.stringify(u));
  window.dispatchEvent(new CustomEvent('auth-change'));
}

export function setLoginState(result) {
  sessionStorage.setItem('usuario', JSON.stringify(result?.usuario ?? result));
  sessionStorage.setItem('loginState', JSON.stringify(result));
  window.dispatchEvent(new CustomEvent('auth-change'));
}

export function getLoginState() {
  // CR-F6: tratar JSON corrompido sem quebrar a app
  try {
    return JSON.parse(sessionStorage.getItem('loginState') || 'null');
  } catch {
    sessionStorage.removeItem('loginState');
    return null;
  }
}

// S.11: empresa ativa explícita (em vez de assumir sempre empresas[0]). Mantém compatibilidade
// — se nada foi selecionado, cai no primeiro vínculo. Pronto para um seletor de empresa.
export function getEmpresaAtiva() {
  const state = getLoginState();
  if (!state) return null;
  const empresas = state.empresas ?? [];
  const ativa = empresas.find((e) => e.id === state.empresaAtivaId);
  return ativa ?? empresas[0] ?? null;
}

export function getEmpresaAtivaId() {
  return getEmpresaAtiva()?.id ?? null;
}

export function setEmpresaAtiva(id) {
  const state = getLoginState();
  if (!state) return;
  state.empresaAtivaId = id;
  sessionStorage.setItem('loginState', JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('auth-change'));
}

export function clearAuth() {
  sessionStorage.removeItem('usuario');
  sessionStorage.removeItem('loginState');
  window.dispatchEvent(new CustomEvent('auth-change'));
}

async function request(path, options = {}) {
  const { skipAuthRedirect, timeout = 30000, blob: expectBlob = false, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;

  // Envia o id da empresa ATIVA em todo request para o TenantFilter resolver o contexto certo
  const empresaAtualId = getEmpresaAtivaId();
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(empresaAtualId ? { 'X-Empresa-Id': String(empresaAtualId) } : {}),
    ...fetchOptions.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Tempo limite da requisição esgotado');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401 && !skipAuthRedirect) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ mensagem: res.statusText }));
    throw new Error(traduzirErroPermissao(body.mensagem || `Erro ${res.status}`));
  }

  if (res.status === 204) return null;
  if (expectBlob) return res.blob();

  // Lê como texto primeiro para evitar SyntaxError em body vazio
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, senha) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }), skipAuthRedirect: true }),

  logout: async () => {
    // CR-F2: logar falha de logout — sessão do servidor pode permanecer ativa
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Falha ao invalidar sessão no servidor:', err);
    }
    clearAuth();
  },

  registrar: (nome, email, senha, telefone, tipoConta, nomeEmpresa) =>
    request('/api/auth/registrar', { method: 'POST', body: JSON.stringify({ nome, email, senha, telefone, tipoConta, nomeEmpresa }), skipAuthRedirect: true }),

  me: () => request('/api/auth/me'),

  refreshPermissoes: () => request('/api/auth/me/permissoes'),

  esqueciSenha: (email) =>
    request('/api/auth/esqueci-senha', { method: 'POST', body: JSON.stringify({ email }), skipAuthRedirect: true }),

  redefinirSenha: (token, novaSenha) =>
    request('/api/auth/redefinir-senha', { method: 'POST', body: JSON.stringify({ token, novaSenha }), skipAuthRedirect: true }),

  atualizarPerfil: (dto) =>
    request('/api/auth/perfil', { method: 'PUT', body: JSON.stringify(dto) }),

  uploadFoto: (file) => {
    const formData = new FormData();
    formData.append('foto', file);
    return request('/api/auth/foto', { method: 'POST', body: formData });
  },
};

export function getUsuario() {
  return JSON.parse(sessionStorage.getItem('usuario') || 'null');
}

// ── Planos ────────────────────────────────────────────────────────────────────
export const planos = {
  listarAtivos: () => request('/api/planos/ativos', { skipAuthRedirect: true }),
  listarTodos: () => request('/api/planos'),
  criar: (dto) => request('/api/planos', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/planos/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  desativar: (id) => request(`/api/planos/${id}/desativar`, { method: 'PATCH' }),
  reativar: (id) => request(`/api/planos/${id}/reativar`, { method: 'PATCH' }),
};

// ── Convites ──────────────────────────────────────────────────────────────────
export const convites = {
  convidar: (dto) => request('/api/empresa/usuarios/convidar', { method: 'POST', body: JSON.stringify(dto) }),
  pendentes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/empresa/convites/pendentes${qs ? `?${qs}` : ''}`);
  },
  reenviar: (id) => request(`/api/empresa/convites/${id}/reenviar`, { method: 'POST' }),
  buscarPorToken: (token) => request(`/api/auth/convite/${token}`, { skipAuthRedirect: true }),
  aceitar: (dto) => request('/api/auth/aceitar-convite', { method: 'POST', body: JSON.stringify(dto), skipAuthRedirect: true }),
};

// ── Operadores ────────────────────────────────────────────────────────────────
export const operadores = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/empresa/operadores${qs ? `?${qs}` : ''}`);
  },
  alterarPerfil: (usuarioId, perfilId) =>
    request(`/api/empresa/operadores/${usuarioId}/perfil`, { method: 'PATCH', body: JSON.stringify({ perfilId }) }),
  remover: (usuarioId) =>
    request(`/api/empresa/operadores/${usuarioId}/remover`, { method: 'PATCH' }),
  reativar: (usuarioId) =>
    request(`/api/empresa/operadores/${usuarioId}/reativar`, { method: 'PATCH' }),
};

// ── Perfis de Acesso ──────────────────────────────────────────────────────────
export const perfisAcesso = {
  listar: () => request('/api/empresa/perfis'),
  listarPermissoes: () => request('/api/empresa/permissoes'),
  criar: (dto) => request('/api/empresa/perfis', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/empresa/perfis/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/empresa/perfis/${id}`, { method: 'DELETE' }),
};

// ── Auditoria ─────────────────────────────────────────────────────────────────
export const auditoria = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/api/auditoria${qs ? `?${qs}` : ''}`);
  },
};

// ── Pagamentos ────────────────────────────────────────────────────────────────
export const pagamentos = {
  pagar: (dto) => request('/api/pagamentos', { method: 'POST', body: JSON.stringify(dto) }),
  historico: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/pagamentos/historico${qs ? `?${qs}` : ''}`);
  },
};

// ── Categorias ────────────────────────────────────────────────────────────────
export const categorias = {
  listar: () => request('/api/categorias').then(p => p.content),
  buscar: (id) => request(`/api/categorias/${id}`),
  criar: (dto) => request('/api/categorias', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/categorias/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/categorias/${id}`, { method: 'DELETE' }),
};

// ── Parceiros ─────────────────────────────────────────────────────────────────
export const parceiros = {
  listar: () => request('/api/parceiros').then(p => p.content),
  buscar: (id) => request(`/api/parceiros/${id}`),
  criar: (dto) => request('/api/parceiros', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/parceiros/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/parceiros/${id}`, { method: 'DELETE' }),
  buscarCnpj: (cnpj) => request(`/api/parceiros/cnpj/${cnpj}`),
};

// ── Contas Correntes ──────────────────────────────────────────────────────────
export const contasCorrentes = {
  listar: () => request('/api/contas-correntes'),
  buscar: (id) => request(`/api/contas-correntes/${id}`),
  criar: (dto) => request('/api/contas-correntes', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/contas-correntes/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/contas-correntes/${id}`, { method: 'DELETE' }),
  transferir: (dto) => request('/api/contas-correntes/transferir', { method: 'POST', body: JSON.stringify(dto) }),
  transferencias: {
    listar: () => request('/api/contas-correntes/transferencias'),
    atualizar: (id, dto) => request(`/api/contas-correntes/transferencias/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    deletar: (id) => request(`/api/contas-correntes/transferencias/${id}`, { method: 'DELETE' }),
  },
};

// ── Contas (Pagar / Receber) ──────────────────────────────────────────────────
export const contas = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/contas${qs ? `?${qs}` : ''}`);
  },
  buscar: (id) => request(`/api/contas/${id}`),
  criar: (dto) => request('/api/contas', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/contas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/contas/${id}`, { method: 'DELETE' }),
  baixar: (id, dto) => request(`/api/contas/${id}/baixa`, { method: 'PATCH', body: JSON.stringify(dto) }),
  estornar: (id) => request(`/api/contas/${id}/baixa`, { method: 'DELETE' }),
};

// ── Cartões de Crédito ────────────────────────────────────────────────────────
export const cartoes = {
  listar: () => request('/api/cartoes').then(p => p.content),
  buscar: (id) => request(`/api/cartoes/${id}`),
  criar: (dto) => request('/api/cartoes', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/cartoes/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/cartoes/${id}`, { method: 'DELETE' }),
  fecharFatura: (id, dto) => request(`/api/cartoes/${id}/fechar-fatura`, { method: 'POST', body: JSON.stringify(dto) }),
  lancamentos: {
    listar: (cartaoId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/cartoes/${cartaoId}/lancamentos${qs ? `?${qs}` : ''}`);
    },
    criar: (cartaoId, dto) => request(`/api/cartoes/${cartaoId}/lancamentos`, { method: 'POST', body: JSON.stringify(dto) }),
    atualizar: (cartaoId, id, dto) => request(`/api/cartoes/${cartaoId}/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    deletar: (cartaoId, id) => request(`/api/cartoes/${cartaoId}/lancamentos/${id}`, { method: 'DELETE' }),
  },
  dashboard: (qs) => request(`/api/cartoes/dashboard/resumo${qs ? `?${qs}` : ''}`),
  dashboardBI: (qs) => request(`/api/cartoes/dashboard/bi${qs ? `?${qs}` : ''}`),
};

// ── Notificações ──────────────────────────────────────────────────────────────
export const notificacoes = {
  listar: () => request('/api/notificacoes'),
  marcarLida: (id) => request(`/api/notificacoes/${id}/lida`, { method: 'PATCH' }),
  sincronizar: () => request('/api/notificacoes/sincronizar', { method: 'POST' }),
};

// ── Investimentos ─────────────────────────────────────────────────────────────
export const investimentos = {
  listar: () => request('/api/investimentos'),
  buscar: (id) => request(`/api/investimentos/${id}`),
  criar: (dto) => request('/api/investimentos', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/investimentos/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/investimentos/${id}`, { method: 'DELETE' }),
  transacoes: {
    listar: (contaId) => request(`/api/investimentos/${contaId}/transacoes`),
    registrar: (contaId, dto) => request(`/api/investimentos/${contaId}/transacoes`, { method: 'POST', body: JSON.stringify(dto) }),
  },
  tipos: {
    listar: () => request('/api/investimentos/tipos'),
    criar: (dto) => request('/api/investimentos/tipos', { method: 'POST', body: JSON.stringify(dto) }),
    atualizar: (id, dto) => request(`/api/investimentos/tipos/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
    deletar: (id) => request(`/api/investimentos/tipos/${id}`, { method: 'DELETE' }),
  },
};

// ── Assinaturas ───────────────────────────────────────────────────────────────
export const assinaturas = {
  listar: () => request('/api/assinaturas'),
  listarAtivas: () => request('/api/assinaturas/ativas'),
  buscar: (id) => request(`/api/assinaturas/${id}`),
  criar: (dto) => request('/api/assinaturas', { method: 'POST', body: JSON.stringify(dto) }),
  atualizar: (id, dto) => request(`/api/assinaturas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deletar: (id) => request(`/api/assinaturas/${id}`, { method: 'DELETE' }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  resumo: (qs) => request(`/api/dashboard${qs ? `?${qs}` : ''}`),
  saldoDetalhado: () => request('/api/dashboard/saldo-detalhado'),
};

// ── Chat IA ───────────────────────────────────────────────────────────────────
export const chat = {
  enviar: (mensagem) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ mensagem }) }),
  limparHistorico: () =>
    request('/api/chat/historico', { method: 'DELETE' }),
  // Envia um arquivo (planilha/OFX/PDF) + a instrução do usuário para a IA processar. Retorna ChatResponseDto.
  enviarAnexo: (arquivo, mensagem) => {
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    fd.append('mensagem', mensagem ?? '');
    return request('/api/chat/anexo', { method: 'POST', body: fd, timeout: 120000 });
  },
};

// ── Conciliação Bancária ──────────────────────────────────────────────────────
export const conciliacao = {
  upload: (arquivo, contaCorrenteId) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const qs = contaCorrenteId ? `?contaCorrenteId=${contaCorrenteId}` : '';
    return request(`/api/conciliacao/upload${qs}`, { method: 'POST', body: formData, timeout: 60000 });
  },
  listar: () => request('/api/conciliacao'),
  buscar: (id) => request(`/api/conciliacao/${id}`),
  vincularItem: (id, itemId, dto) => request(`/api/conciliacao/${id}/itens/${itemId}/vincular`, { method: 'PUT', body: JSON.stringify(dto) }),
  criarContaItem: (id, itemId, dto) => request(`/api/conciliacao/${id}/itens/${itemId}/nova-conta`, { method: 'POST', body: JSON.stringify(dto) }),
  ignorarItem: (id, itemId) => request(`/api/conciliacao/${id}/itens/${itemId}/ignorar`, { method: 'PUT' }),
  desvincularItem: (id, itemId) => request(`/api/conciliacao/${id}/itens/${itemId}/desvincular`, { method: 'PUT' }),
  finalizar: (id, dto) => request(`/api/conciliacao/${id}/finalizar`, { method: 'POST', body: JSON.stringify(dto ?? {}) }),
  cancelar: (id) => request(`/api/conciliacao/${id}`, { method: 'DELETE' }),
  relatorio: (id) => request(`/api/conciliacao/${id}/relatorio`),
};

// ── Conciliação de Cartão ─────────────────────────────────────────────────────
export const conciliacaoCartao = {
  upload: (arquivo, cartaoId) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const qs = cartaoId ? `?cartaoId=${cartaoId}` : '';
    return request(`/api/cartoes/conciliacao/upload${qs}`, { method: 'POST', body: formData, timeout: 60000 });
  },
  listar: () => request('/api/cartoes/conciliacao'),
  buscar: (id) => request(`/api/cartoes/conciliacao/${id}`),
  vincularItem: (id, itemId, dto) => request(`/api/cartoes/conciliacao/${id}/itens/${itemId}/vincular`, { method: 'PUT', body: JSON.stringify(dto) }),
  criarLancamento: (id, itemId, dto) => request(`/api/cartoes/conciliacao/${id}/itens/${itemId}/novo-lancamento`, { method: 'POST', body: JSON.stringify(dto) }),
  ignorarItem: (id, itemId) => request(`/api/cartoes/conciliacao/${id}/itens/${itemId}/ignorar`, { method: 'PUT' }),
  desfazerIgnorar: (id, itemId) => request(`/api/cartoes/conciliacao/${id}/itens/${itemId}/desfazer-ignorar`, { method: 'PATCH' }),
  desvincularItem: (id, itemId) => request(`/api/cartoes/conciliacao/${id}/itens/${itemId}/desvincular`, { method: 'PUT' }),
  finalizar: (id, dto) => request(`/api/cartoes/conciliacao/${id}/finalizar`, { method: 'POST', body: JSON.stringify(dto ?? {}) }),
  cancelar: (id) => request(`/api/cartoes/conciliacao/${id}`, { method: 'DELETE' }),
  relatorio: (id) => request(`/api/cartoes/conciliacao/${id}/relatorio`),
};

// ── Relatórios (download binário) ─────────────────────────────────────────────
function relatorioQs(inicio, fim, params = {}) {
  const entries = { inicio, fim, ...params };
  const filtered = Object.fromEntries(
    Object.entries(entries).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  return new URLSearchParams(filtered).toString();
}

function downloadRelatorio(path) {
  return request(path, { blob: true });
}

export const relatorios = {
  // ── Downloads Excel (.xlsx) ───────────────────────────────────────────────
  posicaoFinanceira: (inicio, fim, p) => downloadRelatorio(`/api/relatorios/posicao-financeira?${relatorioQs(inicio, fim, p)}`),
  fluxoCaixa:    (inicio, fim, p) => downloadRelatorio(`/api/relatorios/fluxo-caixa?${relatorioQs(inicio, fim, p)}`),
  contasAbertas: (inicio, fim, p) => downloadRelatorio(`/api/relatorios/contas-abertas?${relatorioQs(inicio, fim, p)}`),
  extrato:       (inicio, fim, p) => downloadRelatorio(`/api/relatorios/extrato?${relatorioQs(inicio, fim, p)}`),
  dre:           (inicio, fim, p) => downloadRelatorio(`/api/relatorios/dre?${relatorioQs(inicio, fim, p)}`),
  investimentos: (inicio, fim, p) => downloadRelatorio(`/api/relatorios/investimentos?${relatorioQs(inicio, fim, p)}`),
  cartoes:       (inicio, fim, p) => downloadRelatorio(`/api/relatorios/cartoes?${relatorioQs(inicio, fim, p)}`),
  assinaturas:   (ativas, p) => downloadRelatorio(`/api/relatorios/assinaturas?${relatorioQs('', '', { ativas, ...p })}`),

  // ── Dados JSON (visualização online e PDF) ────────────────────────────────
  dados: {
    posicaoFinanceira: (inicio, fim, p) => request(`/api/relatorios/posicao-financeira/dados?${relatorioQs(inicio, fim, p)}`),
    fluxoCaixa:    (inicio, fim, p) => request(`/api/relatorios/fluxo-caixa/dados?${relatorioQs(inicio, fim, p)}`),
    contasAbertas: (inicio, fim, p) => request(`/api/relatorios/contas-abertas/dados?${relatorioQs(inicio, fim, p)}`),
    extrato:       (inicio, fim, p) => request(`/api/relatorios/extrato/dados?${relatorioQs(inicio, fim, p)}`),
    dre:           (inicio, fim, p) => request(`/api/relatorios/dre/dados?${relatorioQs(inicio, fim, p)}`),
    investimentos: (inicio, fim, p) => request(`/api/relatorios/investimentos/dados?${relatorioQs(inicio, fim, p)}`),
    cartoes:       (inicio, fim, p) => request(`/api/relatorios/cartoes/dados?${relatorioQs(inicio, fim, p)}`),
    assinaturas:   (ativas) => request(`/api/relatorios/assinaturas/dados?ativas=${ativas ?? true}`),
  },
};
