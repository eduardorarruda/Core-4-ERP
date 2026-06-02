const PERMISSAO_MESSAGES = {
  // Lançamentos (Contas a Pagar/Receber)
  CONTA_VISUALIZAR:           'Você não tem permissão para visualizar lançamentos.',
  CONTA_CRIAR:                'Você não tem permissão para criar lançamentos.',
  CONTA_EDITAR:               'Você não tem permissão para editar lançamentos.',
  CONTA_DELETAR:              'Você não tem permissão para remover lançamentos.',
  CONTA_BAIXAR:               'Você não tem permissão para dar baixa em lançamentos.',
  CONTA_ESTORNAR:             'Você não tem permissão para estornar lançamentos.',
  // Contas Correntes
  CONTA_CORRENTE_VISUALIZAR:  'Você não tem permissão para visualizar contas correntes.',
  CONTA_CORRENTE_CRIAR:       'Você não tem permissão para criar contas correntes.',
  CONTA_CORRENTE_EDITAR:      'Você não tem permissão para editar contas correntes.',
  CONTA_CORRENTE_DELETAR:     'Você não tem permissão para remover contas correntes.',
  CONTA_CORRENTE_TRANSFERIR:  'Você não tem permissão para realizar transferências.',
  // Cartões
  CARTAO_VISUALIZAR:          'Você não tem permissão para visualizar cartões.',
  CARTAO_CRIAR:               'Você não tem permissão para criar cartões.',
  CARTAO_EDITAR:              'Você não tem permissão para editar cartões.',
  CARTAO_DELETAR:             'Você não tem permissão para remover cartões.',
  CARTAO_LANCAR:              'Você não tem permissão para lançar no cartão.',
  CARTAO_FECHAR_FATURA:       'Você não tem permissão para fechar faturas de cartão.',
  // Conciliação de Cartão
  CARTAO_CONCILIACAO_VISUALIZAR: 'Você não tem permissão para visualizar a conciliação de cartão.',
  CARTAO_CONCILIACAO_IMPORTAR:   'Você não tem permissão para importar arquivos de conciliação de cartão.',
  CARTAO_CONCILIACAO_VINCULAR:   'Você não tem permissão para vincular itens na conciliação de cartão.',
  // Categorias
  CATEGORIA_VISUALIZAR:       'Você não tem permissão para visualizar categorias.',
  CATEGORIA_CRIAR:            'Você não tem permissão para criar categorias.',
  CATEGORIA_EDITAR:           'Você não tem permissão para editar categorias.',
  CATEGORIA_DELETAR:          'Você não tem permissão para remover categorias.',
  // Parceiros
  PARCEIRO_VISUALIZAR:        'Você não tem permissão para visualizar parceiros.',
  PARCEIRO_CRIAR:             'Você não tem permissão para criar parceiros.',
  PARCEIRO_EDITAR:            'Você não tem permissão para editar parceiros.',
  PARCEIRO_DELETAR:           'Você não tem permissão para remover parceiros.',
  // Investimentos
  INVESTIMENTO_VISUALIZAR:    'Você não tem permissão para visualizar investimentos.',
  INVESTIMENTO_CRIAR:         'Você não tem permissão para criar novos investimentos.',
  INVESTIMENTO_EDITAR:        'Você não tem permissão para editar investimentos.',
  INVESTIMENTO_DELETAR:       'Você não tem permissão para remover investimentos.',
  INVESTIMENTO_TIPO_GERENCIAR:'Você não tem permissão para gerenciar tipos de investimento.',
  // Assinaturas
  ASSINATURA_VISUALIZAR:      'Você não tem permissão para visualizar assinaturas.',
  ASSINATURA_CRIAR:           'Você não tem permissão para criar assinaturas.',
  ASSINATURA_EDITAR:          'Você não tem permissão para editar assinaturas.',
  ASSINATURA_DELETAR:         'Você não tem permissão para remover assinaturas.',
  // Conciliação Bancária
  CONCILIACAO_VISUALIZAR:     'Você não tem permissão para visualizar a conciliação bancária.',
  CONCILIACAO_IMPORTAR:       'Você não tem permissão para importar arquivos de conciliação.',
  CONCILIACAO_VINCULAR:       'Você não tem permissão para vincular itens na conciliação.',
  // Relatórios
  RELATORIO_EXPORTAR:                         'Você não tem permissão para exportar relatórios.',
  RELATORIO_FLUXO_CAIXA_VISUALIZAR:           'Você não tem permissão para visualizar o relatório de Fluxo de Caixa.',
  RELATORIO_FLUXO_CAIXA_EXPORTAR:             'Você não tem permissão para exportar o relatório de Fluxo de Caixa.',
  RELATORIO_CONTAS_ABERTAS_VISUALIZAR:        'Você não tem permissão para visualizar o relatório de Contas Abertas.',
  RELATORIO_CONTAS_ABERTAS_EXPORTAR:          'Você não tem permissão para exportar o relatório de Contas Abertas.',
  RELATORIO_EXTRATO_VISUALIZAR:               'Você não tem permissão para visualizar o relatório de Extrato.',
  RELATORIO_EXTRATO_EXPORTAR:                 'Você não tem permissão para exportar o relatório de Extrato.',
  RELATORIO_DRE_VISUALIZAR:                   'Você não tem permissão para visualizar o relatório DRE.',
  RELATORIO_DRE_EXPORTAR:                     'Você não tem permissão para exportar o relatório DRE.',
  RELATORIO_INVESTIMENTOS_VISUALIZAR:         'Você não tem permissão para visualizar o relatório de Investimentos.',
  RELATORIO_INVESTIMENTOS_EXPORTAR:           'Você não tem permissão para exportar o relatório de Investimentos.',
  RELATORIO_CARTOES_VISUALIZAR:               'Você não tem permissão para visualizar o relatório de Cartões.',
  RELATORIO_CARTOES_EXPORTAR:                 'Você não tem permissão para exportar o relatório de Cartões.',
  RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR:    'Você não tem permissão para visualizar o relatório de Posição Financeira.',
  RELATORIO_POSICAO_FINANCEIRA_EXPORTAR:      'Você não tem permissão para exportar o relatório de Posição Financeira.',
  RELATORIO_ASSINATURAS_VISUALIZAR:           'Você não tem permissão para visualizar o relatório de Assinaturas.',
  RELATORIO_ASSINATURAS_EXPORTAR:             'Você não tem permissão para exportar o relatório de Assinaturas.',
  // Usuários e Empresa
  USUARIO_VISUALIZAR:         'Você não tem permissão para visualizar usuários da empresa.',
  USUARIO_CONVIDAR:           'Você não tem permissão para convidar novos usuários.',
  USUARIO_EDITAR:             'Você não tem permissão para editar usuários.',
  USUARIO_REMOVER:            'Você não tem permissão para remover usuários.',
  AUDITORIA_VISUALIZAR:       'Você não tem permissão para acessar os registros de auditoria.',
  CONFIGURACAO_EDITAR:        'Você não tem permissão para alterar as configurações da empresa.',
  // Outros módulos
  CALENDARIO_VISUALIZAR:      'Você não tem permissão para visualizar o calendário.',
  DASHBOARD_VISUALIZAR:       'Você não tem permissão para acessar o painel principal.',
  DASHBOARD_CARTAO_VISUALIZAR:'Você não tem permissão para visualizar o resumo detalhado de cartões.',
};

const PREFIXO = 'Permissão necessária: ';

export function traduzirErroPermissao(mensagem) {
  if (!mensagem?.startsWith(PREFIXO)) return mensagem;
  const codigo = mensagem.slice(PREFIXO.length).trim();
  return (
    PERMISSAO_MESSAGES[codigo] ??
    'Você não tem permissão para realizar esta ação. Solicite acesso ao administrador da empresa.'
  );
}
