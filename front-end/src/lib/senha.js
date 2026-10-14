/**
 * Fonte ÚNICA da política de senha do sistema.
 * Regra oficial (alinhada ao backend — anotação @SenhaForte): de 8 a 72 caracteres,
 * com pelo menos uma letra maiúscula, uma minúscula e um número. Vale para cadastro,
 * troca de senha, redefinição e aceite de convite.
 */
export const SENHA_MAX_CARACTERES = 72;

export const REGRAS_SENHA = [
  { id: 'tamanho',   label: 'Mínimo de 8 caracteres', testar: (s) => s.length >= 8 },
  { id: 'maiuscula', label: 'Uma letra maiúscula',    testar: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', label: 'Uma letra minúscula',    testar: (s) => /[a-z]/.test(s) },
  { id: 'numero',    label: 'Um número',              testar: (s) => /[0-9]/.test(s) },
];

/** Retorna true somente quando a senha atende a TODAS as regras (e não passa do limite). */
export function senhaValida(s) {
  const senha = s || '';
  return senha.length <= SENHA_MAX_CARACTERES && REGRAS_SENHA.every((r) => r.testar(senha));
}
