/*
 * Regras de exibição de perfis e permissões compartilhadas por Configurações, Operadores e
 * Perfis de acesso. Só UX: quem decide é o backend (@Requer + EscaladaPrivilegioValidator).
 */

export const PERFIL_PROPRIETARIO = 'PROPRIETARIO';

const NOMES_SISTEMA = {
  PROPRIETARIO: 'Proprietário',
  ADMIN: 'Administrador',
  FINANCEIRO: 'Financeiro',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
};

/** Nome amigável do perfil ("FINANCEIRO" → "Financeiro"); perfis criados pela empresa ficam como estão. */
export function nomePerfil(nome) {
  if (!nome) return '—';
  return NOMES_SISTEMA[nome] ?? nome;
}

/** Tom do selo do perfil (cor + texto, nunca só cor). */
export function tomPerfil(nome) {
  if (nome === PERFIL_PROPRIETARIO) return 'invest';
  if (nome === 'ADMIN') return 'primary';
  if (nome === 'FINANCEIRO') return 'info';
  return 'neutral';
}

/**
 * Pode conceder qualquer permissão? Espelha EscaladaPrivilegioValidator.podeConcederQualquer:
 * administrador do sistema ou PROPRIETARIO (perfil de sistema) da empresa ativa.
 */
export function podeConcederQualquer({ adminSistema, perfilNome }) {
  return Boolean(adminSistema) || perfilNome === PERFIL_PROPRIETARIO;
}

export const MSG_ESCALADA =
  'Você só pode dar acessos que você mesmo tem. Peça a quem tem esse acesso (por exemplo, o proprietário) para fazer esta mudança.';

/** Traduz o erro do backend de escalada de privilégio para uma frase que diz o que fazer. */
export function mensagemErroPermissao(err, padrao) {
  const msg = err?.message || '';
  if (/conceder acessos que voc[eê] mesmo n[aã]o possui/i.test(msg)) return MSG_ESCALADA;
  if (/pr[oó]prio v[ií]nculo|pr[oó]prio perfil|voc[eê] mesmo/i.test(msg)) {
    return 'Você não pode alterar o seu próprio acesso. Peça a outra pessoa com permissão.';
  }
  return msg || padrao;
}
