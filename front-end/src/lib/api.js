const BASE_URL = import.meta.env.VITE_API_URL ?? '';

function clearAuth() {
  localStorage.removeItem('usuario');
  sessionStorage.removeItem('access_token');
}

async function request(path, options = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = sessionStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !skipAuthRedirect) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ mensagem: res.statusText }));
    throw new Error(body.mensagem || `Erro ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: async (email, senha) => {
    const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }), skipAuthRedirect: true });
    if (result?.accessToken) sessionStorage.setItem('access_token', result.accessToken);
    return result?.usuario ?? result;
  },

  logout: async () => {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('access_token');
  },

  registrar: (nome, email, senha, telefone) =>
    request('/api/auth/registrar', { method: 'POST', body: JSON.stringify({ nome, email, senha, telefone }), skipAuthRedirect: true }),

  me: () => request('/api/auth/me'),

  atualizarPerfil: (dto) =>
    request('/api/auth/perfil', { method: 'PUT', body: JSON.stringify(dto) }),
};

export function getUsuario() {
  return JSON.parse(localStorage.getItem('usuario') || 'null');
}

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
  resumo: () => request('/api/dashboard'),
  saldoDetalhado: () => request('/api/dashboard/saldo-detalhado'),
};

// ── Chat IA ───────────────────────────────────────────────────────────────────
export const chat = {
  enviar: (mensagem) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ mensagem }) }),
  limparHistorico: () =>
    request('/api/chat/historico', { method: 'DELETE' }),
};

// ── Conciliação Bancária ──────────────────────────────────────────────────────
export const conciliacao = {
  upload: (arquivo, contaCorrenteId) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const token = sessionStorage.getItem('access_token');
    const qs = contaCorrenteId ? `?contaCorrenteId=${contaCorrenteId}` : '';
    return fetch(`${BASE_URL}/api/conciliacao/upload${qs}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (res.status === 401) { clearAuth(); window.location.href = '/login'; throw new Error('Sessão expirada'); }
      if (!res.ok) { const b = await res.json().catch(() => ({ mensagem: res.statusText })); throw new Error(b.mensagem || `Erro ${res.status}`); }
      return res.json();
    });
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

// ── Relatórios (download binário) ─────────────────────────────────────────────
function relatorioQs(inicio, fim, params = {}) {
  const entries = { inicio, fim, ...params };
  const filtered = Object.fromEntries(
    Object.entries(entries).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  return new URLSearchParams(filtered).toString();
}

async function downloadRelatorio(path) {
  const token = sessionStorage.getItem('access_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.mensagem || `Erro ${res.status}`);
  }
  return res.blob();
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
