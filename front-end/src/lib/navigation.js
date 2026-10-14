import {
  LayoutDashboard, CalendarDays, BarChart3, Sparkles, Lightbulb, Target,
  ReceiptText, CreditCard, Landmark, TrendingUp, GitMerge,
  Users, Tag, Repeat,
  UserCog, ShieldCheck, Gavel,
  Settings, HelpCircle, Accessibility,
} from 'lucide-react';

/*
 * Fonte ÚNICA da navegação do Core 4. Sidebar, BottomNav, CommandPalette, TopNav (trilha)
 * e document.title leem daqui. Tela nova = uma entrada aqui + a rota no App.jsx.
 *
 * Campos de cada item:
 * - id, label, icon, grupo
 * - path: rota principal. `destinos` (opcional): lista ordenada de { path, permissao } —
 *   o item leva ao 1º destino que o usuário pode abrir (ex.: Cartões → lançamentos ou painel).
 * - permissao: código exigido | permissoesAlguma: basta ter uma | sem nenhum dos dois = livre
 * - empresaOnly: só para conta EMPRESA
 * - rotas: prefixos que pertencem ao item (para destacar o ativo e montar a trilha/título)
 * - desc: frase curta exibida na busca (CommandPalette)
 * - mobile: posição (1, 2, 3) como slot da BottomNav — a Áurea fica sempre no centro
 */

export const PERMISSOES_RELATORIO = [
  'RELATORIO_FLUXO_CAIXA_VISUALIZAR',
  'RELATORIO_CONTAS_ABERTAS_VISUALIZAR',
  'RELATORIO_EXTRATO_VISUALIZAR',
  'RELATORIO_DRE_VISUALIZAR',
  'RELATORIO_INVESTIMENTOS_VISUALIZAR',
  'RELATORIO_CARTOES_VISUALIZAR',
  'RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR',
  'RELATORIO_ASSINATURAS_VISUALIZAR',
];

export const GRUPOS_NAV = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'cadastros', label: 'Cadastros' },
  { id: 'empresa', label: 'Empresa' },
];

export const NAV = [
  // ── Visão geral ──
  {
    id: 'inicio', grupo: 'visao', label: 'Início', icon: LayoutDashboard, path: '/dashboard',
    permissao: 'DASHBOARD_VISUALIZAR', rotas: ['/dashboard'], desc: 'Saldo, entradas, saídas e alertas', mobile: 1,
  },
  {
    id: 'insights', grupo: 'visao', label: 'Insights', icon: Lightbulb, path: '/insights',
    permissao: 'DASHBOARD_VISUALIZAR', rotas: ['/insights'], desc: 'O que mudou no seu dinheiro, em frases',
  },
  {
    id: 'calendario', grupo: 'visao', label: 'Calendário', icon: CalendarDays, path: '/calendario',
    permissao: 'CALENDARIO_VISUALIZAR', rotas: ['/calendario'], desc: 'Vencimentos do mês, dia a dia', mobile: 3,
  },
  {
    id: 'relatorios', grupo: 'visao', label: 'Relatórios', icon: BarChart3, path: '/reports',
    permissoesAlguma: PERMISSOES_RELATORIO, rotas: ['/reports'], desc: 'DRE, fluxo de caixa, extrato e exportações',
  },
  {
    id: 'aurea', grupo: 'visao', label: 'Áurea', icon: Sparkles, path: '/assistente',
    rotas: ['/assistente'], desc: 'Assistente que consulta e lança por conversa', destaque: true,
  },

  // ── Dinheiro ──
  {
    id: 'contas', grupo: 'dinheiro', label: 'Contas a pagar e receber', labelCurto: 'Contas', icon: ReceiptText, path: '/contas',
    permissao: 'CONTA_VISUALIZAR', rotas: ['/contas'], desc: 'Vencimentos, baixas e estornos', mobile: 2,
  },
  {
    id: 'cartoes', grupo: 'dinheiro', label: 'Cartões', icon: CreditCard, path: '/cartoes',
    destinos: [
      { path: '/cartoes', permissao: 'CARTAO_LANCAR' },
      { path: '/cartoes/dashboard', permissao: 'CARTAO_VISUALIZAR' },
    ],
    rotas: ['/cartoes/dashboard', '/cartoes'], excetoRotas: ['/cartoes/conciliacao'],
    desc: 'Faturas, lançamentos do cartão e limites',
  },
  {
    id: 'contas-bancarias', grupo: 'dinheiro', label: 'Contas bancárias', icon: Landmark, path: '/contas-correntes',
    permissao: 'CONTA_CORRENTE_VISUALIZAR', rotas: ['/contas-correntes'], desc: 'Saldos e transferências entre contas',
  },
  {
    id: 'investimentos', grupo: 'dinheiro', label: 'Investimentos', icon: TrendingUp, path: '/investimentos',
    permissao: 'INVESTIMENTO_VISUALIZAR', rotas: ['/investimentos'], desc: 'Carteira, aportes e resgates',
  },
  {
    id: 'orcamentos', grupo: 'dinheiro', label: 'Orçamentos', icon: Target, path: '/orcamentos',
    permissao: 'ORCAMENTO_VISUALIZAR', rotas: ['/orcamentos'], desc: 'Limites por categoria e quanto já foi usado',
  },
  {
    id: 'conciliacao', grupo: 'dinheiro', label: 'Conciliação', icon: GitMerge, path: '/conciliacao',
    destinos: [
      { path: '/conciliacao', permissao: 'CONCILIACAO_VISUALIZAR' },
      { path: '/cartoes/conciliacao', permissao: 'CARTAO_CONCILIACAO_VISUALIZAR' },
    ],
    rotas: ['/conciliacao', '/cartoes/conciliacao'], desc: 'Importe o extrato OFX e confira item a item',
  },

  // ── Cadastros ──
  {
    id: 'parceiros', grupo: 'cadastros', label: 'Parceiros', icon: Users, path: '/parceiros',
    permissao: 'PARCEIRO_VISUALIZAR', rotas: ['/parceiros'], desc: 'Clientes e fornecedores',
  },
  {
    id: 'categorias', grupo: 'cadastros', label: 'Categorias', icon: Tag, path: '/categorias',
    permissao: 'CATEGORIA_VISUALIZAR', rotas: ['/categorias'], desc: 'Como você agrupa entradas e saídas',
  },
  {
    id: 'assinaturas', grupo: 'cadastros', label: 'Assinaturas', icon: Repeat, path: '/assinaturas',
    permissao: 'ASSINATURA_VISUALIZAR', rotas: ['/assinaturas'], desc: 'Cobranças recorrentes',
  },

  // ── Empresa ──
  {
    id: 'operadores', grupo: 'empresa', label: 'Operadores', icon: UserCog, path: '/empresa/operadores',
    permissao: 'USUARIO_VISUALIZAR', empresaOnly: true, rotas: ['/empresa/operadores'], desc: 'Quem acessa a empresa',
  },
  {
    id: 'perfis', grupo: 'empresa', label: 'Perfis de acesso', icon: ShieldCheck, path: '/empresa/perfis',
    permissao: 'CONFIGURACAO_EDITAR', empresaOnly: true, rotas: ['/empresa/perfis'], desc: 'O que cada perfil pode fazer',
  },
  {
    id: 'auditoria', grupo: 'empresa', label: 'Auditoria', icon: Gavel, path: '/audit',
    permissao: 'AUDITORIA_VISUALIZAR', empresaOnly: true, rotas: ['/audit'], desc: 'Quem fez o quê e quando',
  },
];

/** Telas da conta (menu do avatar) — fora dos grupos do menu lateral. */
export const NAV_CONTA = [
  { id: 'configuracoes', label: 'Configurações', icon: Settings, path: '/configuracoes', rotas: ['/configuracoes'], desc: 'Perfil, segurança e preferências' },
  { id: 'ajuda', label: 'Central de Ajuda', icon: HelpCircle, path: '/ajuda', rotas: ['/ajuda'], desc: 'Aprenda a usar cada tela' },
  // Página pública (declaração); o painel de ajustes abre com Alt+A ou pela busca
  { id: 'acessibilidade', label: 'Acessibilidade', icon: Accessibility, path: '/acessibilidade', rotas: ['/acessibilidade'], desc: 'Declaração de acessibilidade e modos disponíveis' },
];

/**
 * Ações rápidas da busca (CommandPalette). Abrem o formulário da tela via `?novo=`.
 * REGRA: só ligue `ativa: true` quando a tela de destino ler o parâmetro e abrir o formulário
 * (senão a ação vira um link morto). Quem implementar a leitura na tela liga a flag aqui.
 */
export const NAV_ACOES = [
  { id: 'nova-conta-pagar', label: 'Nova conta a pagar', path: '/contas?novo=PAGAR', permissao: 'CONTA_CRIAR', desc: 'Registrar uma despesa', ativa: true },
  { id: 'nova-conta-receber', label: 'Nova conta a receber', path: '/contas?novo=RECEBER', permissao: 'CONTA_CRIAR', desc: 'Registrar uma receita', ativa: true },
  { id: 'novo-lancamento-cartao', label: 'Novo lançamento do cartão', path: '/cartoes?novo=lancamento', permissao: 'CARTAO_LANCAR', desc: 'Registrar uma compra no cartão', ativa: true },
  { id: 'novo-parceiro', label: 'Novo parceiro', path: '/parceiros?novo=1', permissao: 'PARCEIRO_CRIAR', desc: 'Cadastrar cliente ou fornecedor', ativa: true },
  { id: 'nova-categoria', label: 'Nova categoria', path: '/categorias?novo=1', permissao: 'CATEGORIA_CRIAR', desc: 'Organizar receitas e despesas', ativa: true },
  { id: 'nova-assinatura', label: 'Nova assinatura', path: '/assinaturas?novo=1', permissao: 'ASSINATURA_CRIAR', desc: 'Adicionar cobrança recorrente', ativa: true },
  { id: 'novo-investimento', label: 'Novo investimento', path: '/investimentos?novo=1', permissao: 'INVESTIMENTO_CRIAR', desc: 'Registrar um investimento', ativa: true },
];

/** Usuário pode ver o item? `ctx` = { temPermissao, tipoConta } (do useAuth). */
export function podeVerItem(item, { temPermissao, tipoConta }) {
  if (item.empresaOnly && tipoConta !== 'EMPRESA') return false;
  if (item.destinos) return item.destinos.some((d) => !d.permissao || temPermissao(d.permissao));
  if (item.permissoesAlguma) return item.permissoesAlguma.some((p) => temPermissao(p));
  if (item.permissao) return temPermissao(item.permissao);
  return true;
}

/** Rota de destino do item para este usuário (1º destino permitido). */
export function destinoDoItem(item, temPermissao) {
  if (!item.destinos) return item.path;
  return item.destinos.find((d) => !d.permissao || temPermissao(d.permissao))?.path ?? item.path;
}

/** Itens visíveis, já com `to` resolvido. */
export function itensVisiveis(ctx) {
  return NAV.filter((item) => podeVerItem(item, ctx)).map((item) => ({ ...item, to: destinoDoItem(item, ctx.temPermissao) }));
}

/** Grupos com seus itens visíveis (grupos vazios somem). */
export function gruposVisiveis(ctx) {
  const itens = itensVisiveis(ctx);
  return GRUPOS_NAV
    .map((g) => ({ ...g, itens: itens.filter((i) => i.grupo === g.id) }))
    .filter((g) => g.itens.length > 0);
}

const casaRota = (pathname, rota) => pathname === rota || pathname.startsWith(`${rota}/`);

/** Item de navegação dono da rota atual (o prefixo mais longo vence). */
export function itemDaRota(pathname) {
  let melhor = null;
  let tamanho = -1;
  for (const item of [...NAV, ...NAV_CONTA]) {
    if (item.excetoRotas?.some((r) => casaRota(pathname, r))) continue;
    for (const rota of item.rotas ?? [item.path]) {
      if (casaRota(pathname, rota) && rota.length > tamanho) {
        melhor = item;
        tamanho = rota.length;
      }
    }
  }
  return melhor;
}

/** Trilha da TopNav: ['Dinheiro', 'Cartões'] (sem repetir o título do PageHeader no mobile). */
export function trilhaDaRota(pathname) {
  const item = itemDaRota(pathname);
  if (!item) return [];
  const grupo = GRUPOS_NAV.find((g) => g.id === item.grupo);
  return grupo ? [grupo.label, item.label] : ['Conta', item.label];
}

/** Título da aba do navegador: "Cartões | Core 4". */
export function tituloDaRota(pathname) {
  const item = itemDaRota(pathname);
  return item ? item.label : null;
}
