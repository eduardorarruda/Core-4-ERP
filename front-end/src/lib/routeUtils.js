export const ROUTE_PRIORITY = [
  { path: '/dashboard',        permissao: 'DASHBOARD_VISUALIZAR' },
  { path: '/contas',           permissao: 'CONTA_VISUALIZAR' },
  { path: '/contas-correntes', permissao: 'CONTA_CORRENTE_VISUALIZAR' },
  { path: '/parceiros',        permissao: 'PARCEIRO_VISUALIZAR' },
  { path: '/categorias',       permissao: 'CATEGORIA_VISUALIZAR' },
  { path: '/cartoes/dashboard',permissao: 'CARTAO_VISUALIZAR' },
  { path: '/investimentos',    permissao: 'INVESTIMENTO_VISUALIZAR' },
  { path: '/assinaturas',      permissao: 'ASSINATURA_VISUALIZAR' },
  { path: '/conciliacao',      permissao: 'CONCILIACAO_VISUALIZAR' },
  { path: '/configuracoes',    permissao: null },
];

export function getFirstAccessibleRoute(temPermissao) {
  for (const r of ROUTE_PRIORITY) {
    if (!r.permissao || temPermissao(r.permissao)) return r.path;
  }
  return '/configuracoes';
}
