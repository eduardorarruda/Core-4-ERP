const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function clearAuth() {
  localStorage.removeItem('usuario');
}

async function request(path, options = {}) {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
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
  login: (email, senha) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }), skipAuthRedirect: true }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

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

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  resumo: () => request('/api/dashboard'),
};
