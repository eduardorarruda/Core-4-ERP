/*
 * Catálogo de exibição das permissões (módulo × ação) para a matriz de perfis.
 * Os códigos vêm da API (/api/empresa/permissoes); aqui só ficam nomes e agrupamento.
 */

export const MODULOS = {
  DASHBOARD: { nome: 'Início', grupo: 'visao', ajuda: 'Painel com saldo, entradas e saídas' },
  DASHBOARD_CARTAO: { nome: 'Resumo de cartões no Início', grupo: 'visao' },
  CALENDARIO: { nome: 'Calendário', grupo: 'visao' },
  CONTA: { nome: 'Contas a pagar e receber', grupo: 'dinheiro' },
  CONTA_CORRENTE: { nome: 'Contas bancárias', grupo: 'dinheiro' },
  CARTAO: { nome: 'Cartões', grupo: 'dinheiro' },
  CARTAO_CONCILIACAO: { nome: 'Conciliação de cartão', grupo: 'dinheiro' },
  CONCILIACAO: { nome: 'Conciliação bancária', grupo: 'dinheiro' },
  INVESTIMENTO: { nome: 'Investimentos', grupo: 'dinheiro' },
  ORCAMENTO: { nome: 'Orçamentos', grupo: 'dinheiro', ajuda: 'Limites de gasto por categoria' },
  CATEGORIA: { nome: 'Categorias', grupo: 'cadastros' },
  PARCEIRO: { nome: 'Parceiros', grupo: 'cadastros' },
  ASSINATURA: { nome: 'Assinaturas', grupo: 'cadastros' },
  RELATORIO_FLUXO_CAIXA: { nome: 'Fluxo de caixa', grupo: 'relatorios' },
  RELATORIO_CONTAS_ABERTAS: { nome: 'Contas em aberto', grupo: 'relatorios' },
  RELATORIO_EXTRATO: { nome: 'Extrato', grupo: 'relatorios' },
  RELATORIO_DRE: { nome: 'DRE', grupo: 'relatorios' },
  RELATORIO_INVESTIMENTOS: { nome: 'Investimentos', grupo: 'relatorios' },
  RELATORIO_CARTOES: { nome: 'Cartões', grupo: 'relatorios' },
  RELATORIO_POSICAO_FINANCEIRA: { nome: 'Posição financeira', grupo: 'relatorios' },
  RELATORIO_ASSINATURAS: { nome: 'Assinaturas', grupo: 'relatorios' },
  RELATORIO: { nome: 'Exportação geral (antiga)', grupo: 'relatorios', ajuda: 'Mantido por compatibilidade' },
  USUARIO: { nome: 'Operadores', grupo: 'empresa' },
  CONFIGURACAO: { nome: 'Perfis de acesso', grupo: 'empresa', ajuda: 'Criar e alterar perfis como este' },
  AUDITORIA: { nome: 'Auditoria', grupo: 'empresa' },
};

export const GRUPOS = [
  { id: 'visao', nome: 'Visão geral' },
  { id: 'dinheiro', nome: 'Dinheiro' },
  { id: 'cadastros', nome: 'Cadastros' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'empresa', nome: 'Empresa' },
  { id: 'outros', nome: 'Outros' },
];

/** Colunas fixas da matriz; o resto das ações vai para "Outras ações". */
export const COLUNAS = [
  { acao: 'VISUALIZAR', nome: 'Ver' },
  { acao: 'CRIAR', nome: 'Criar' },
  { acao: 'EDITAR', nome: 'Editar' },
  { acao: 'DELETAR', nome: 'Excluir' },
];

const ACOES = {
  VISUALIZAR: 'Ver',
  CRIAR: 'Criar',
  EDITAR: 'Editar',
  DELETAR: 'Excluir',
  BAIXAR: 'Dar baixa',
  ESTORNAR: 'Estornar baixa',
  TRANSFERIR: 'Transferir',
  LANCAR: 'Lançar no cartão',
  FECHAR_FATURA: 'Fechar fatura',
  IMPORTAR: 'Importar extrato',
  VINCULAR: 'Vincular itens',
  CONVIDAR: 'Convidar',
  REMOVER: 'Desativar',
  EXPORTAR: 'Exportar',
  TIPO_GERENCIAR: 'Gerenciar tipos',
  GERENCIAR: 'Gerenciar',
};

export function nomeAcao(acao) {
  return ACOES[acao] ?? (acao ? acao.charAt(0) + acao.slice(1).toLowerCase().replace(/_/g, ' ') : '');
}

export function nomeModulo(modulo) {
  return MODULOS[modulo]?.nome ?? modulo.charAt(0) + modulo.slice(1).toLowerCase().replace(/_/g, ' ');
}

const ORDEM_MODULOS = Object.keys(MODULOS);
const ORDEM_ACOES = Object.keys(ACOES);

/**
 * Agrupa a lista plana da API em [{ grupo, modulos: [{ modulo, nome, ajuda, perms: { ACAO: p }, extras: [p] }] }].
 */
export function montarMatriz(permissoes) {
  const porModulo = new Map();
  permissoes.forEach((p) => {
    if (!porModulo.has(p.modulo)) porModulo.set(p.modulo, []);
    porModulo.get(p.modulo).push(p);
  });
  const fixas = new Set(COLUNAS.map((c) => c.acao));
  const linhas = [...porModulo.entries()]
    .sort(([a], [b]) => {
      const ia = ORDEM_MODULOS.indexOf(a);
      const ib = ORDEM_MODULOS.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    })
    .map(([modulo, lista]) => ({
      modulo,
      nome: nomeModulo(modulo),
      ajuda: MODULOS[modulo]?.ajuda,
      grupo: MODULOS[modulo]?.grupo ?? 'outros',
      todas: lista,
      perms: Object.fromEntries(lista.filter((p) => fixas.has(p.acao)).map((p) => [p.acao, p])),
      extras: lista
        .filter((p) => !fixas.has(p.acao))
        .sort((x, y) => ORDEM_ACOES.indexOf(x.acao) - ORDEM_ACOES.indexOf(y.acao)),
    }));
  return GRUPOS
    .map((g) => ({ ...g, modulos: linhas.filter((l) => l.grupo === g.id) }))
    .filter((g) => g.modulos.length > 0);
}

/** id do texto que explica o cadeado (ligado por aria-describedby nas caixas bloqueadas). */
export const ID_NOTA_BLOQUEIO = 'nota-acesso-bloqueado';
