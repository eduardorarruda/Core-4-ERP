// Central de Ajuda — conteúdo data-driven.
// Cada seção documenta UMA tela do sistema em linguagem simples (regra CLAUDE.md §7:
// zero termos técnicos, nada de códigos de permissão ou nomes internos).
// A view (src/views/Ajuda.jsx) e, no futuro, a Áurea consomem este mesmo conteúdo.

export const AJUDA_GRUPOS = [
  { id: 'primeiros-passos', titulo: 'Primeiros passos' },
  { id: 'dia-a-dia',        titulo: 'Dia a dia' },
  { id: 'cartoes',          titulo: 'Cartões' },
  { id: 'conciliacao',      titulo: 'Conciliação' },
  { id: 'cadastros',        titulo: 'Cadastros' },
  { id: 'invest-assin',     titulo: 'Investimentos & Assinaturas' },
  { id: 'relatorios',       titulo: 'Relatórios' },
  { id: 'aurea',            titulo: 'Áurea (assistente)' },
  { id: 'administracao',    titulo: 'Administração' },
  { id: 'minha-conta',      titulo: 'Minha conta' },
  { id: 'pwa',              titulo: 'Instalar no celular' },
];

export const AJUDA_SECOES = [
  // ────────────────────────────── PRIMEIROS PASSOS ──────────────────────────────
  {
    id: 'primeiros-passos',
    grupo: 'primeiros-passos',
    titulo: 'Primeiros passos',
    rota: null,
    permissao: null,
    icone: 'Sparkles',
    resumo: 'Um roteiro rápido para começar a usar o Core 4 ERP do zero e organizar suas finanças em poucos minutos.',
    comoUsar: [
      'Cadastre suas contas correntes: informe cada banco e conta que você usa no dia a dia.',
      'Crie suas categorias (por exemplo, Mercado, Salário, Transporte) para organizar as entradas e saídas.',
      'Cadastre seus parceiros: os clientes de quem você recebe e os fornecedores para quem você paga.',
      'Registre seu primeiro lançamento em "Lançamentos" — uma conta a pagar ou a receber.',
      'Instale o aplicativo no celular para acompanhar tudo em qualquer lugar (veja "Instalar no celular").',
    ],
    dicas: [
      'Não precisa cadastrar tudo de uma vez. Comece pelo essencial e vá completando conforme usa.',
      'A qualquer momento você pode pedir ajuda à Áurea, a assistente do sistema, em linguagem natural.',
    ],
    faq: [
      { p: 'Preciso cadastrar categorias e parceiros antes de lançar?', r: 'É recomendado, pois deixa seus relatórios mais organizados. Mas você pode criar categorias e parceiros na hora, direto do formulário de lançamento.' },
    ],
  },

  // ────────────────────────────── DIA A DIA ──────────────────────────────
  {
    id: 'dashboard',
    grupo: 'dia-a-dia',
    titulo: 'Dashboard',
    rota: '/dashboard',
    permissao: 'DASHBOARD_VISUALIZAR',
    icone: 'LayoutDashboard',
    resumo: 'Sua visão geral financeira: saldos, receitas e despesas do mês, alertas de vencimento e gráficos de acompanhamento.',
    comoUsar: [
      'Use as abas "Visão Geral" e "Cartões" no topo para alternar entre as finanças gerais e os cartões de crédito.',
      'Os cartões coloridos do topo mostram saldo total, receitas, despesas e o patrimônio investido.',
      'Clique nos alertas em vermelho ou amarelo para ir direto às contas atrasadas ou próximas do vencimento.',
      'Ajuste o período dos gráficos usando o seletor de mês e ano.',
    ],
    dicas: [
      'O painel de acesso rápido leva você às ações mais comuns em um clique.',
    ],
    faq: [
      { p: 'Por que meu saldo aparece zerado?', r: 'O saldo considera apenas os lançamentos já baixados (pagos ou recebidos). Contas ainda pendentes aparecem na projeção, não no saldo atual.' },
    ],
  },
  {
    id: 'lancamentos',
    grupo: 'dia-a-dia',
    titulo: 'Lançamentos',
    rota: '/contas',
    permissao: 'CONTA_VISUALIZAR',
    icone: 'FileText',
    resumo: 'Suas contas a pagar e a receber: crie, edite, baixe (marque como paga ou recebida), estorne e transfira valores entre contas correntes.',
    comoUsar: [
      'Clique em "Nova Conta" e preencha vencimento, valor, categoria e parceiro.',
      'Use "Baixar" quando a conta for paga ou recebida: informe a data e a conta corrente usada.',
      'Precisa desfazer uma baixa? Use "Estornar" — ele cria o movimento contrário sem apagar o histórico.',
      'Para mover dinheiro entre suas contas bancárias, use "Nova Transferência".',
      'Filtre por situação (pendente, paga, atrasada), período ou valor para encontrar rapidamente o que precisa.',
    ],
    dicas: [
      'Uma conta já baixada não pode ser editada. Se precisar corrigir, faça o estorno e lance novamente.',
    ],
    faq: [
      { p: 'Qual a diferença entre baixar e estornar?', r: 'Baixar registra que a conta foi paga ou recebida. Estornar desfaz essa baixa, criando o movimento oposto para manter tudo rastreável.' },
      { p: 'O que é uma conta "atrasada"?', r: 'É uma conta pendente cuja data de vencimento já passou. Você ainda pode baixá-la normalmente.' },
    ],
  },
  {
    id: 'contas-correntes',
    grupo: 'dia-a-dia',
    titulo: 'Contas Correntes',
    rota: '/contas-correntes',
    permissao: 'CONTA_CORRENTE_VISUALIZAR',
    icone: 'Landmark',
    resumo: 'Suas contas bancárias e o saldo atual de cada uma.',
    comoUsar: [
      'Cadastre cada conta informando banco, agência e número.',
      'Acompanhe o saldo de cada conta na lista.',
      'Para movimentar dinheiro entre contas, use as transferências na tela de Lançamentos.',
    ],
    dicas: [
      'O saldo é calculado automaticamente a partir dos lançamentos baixados — você nunca precisa (nem deve) editar o saldo à mão.',
    ],
    faq: [
      { p: 'Por que não consigo apagar uma conta corrente?', r: 'Contas com transferências ou conciliações já registradas não podem ser removidas, para preservar o histórico.' },
    ],
  },
  {
    id: 'calendario',
    grupo: 'dia-a-dia',
    titulo: 'Calendário',
    rota: '/calendario',
    permissao: 'CALENDARIO_VISUALIZAR',
    icone: 'CalendarDays',
    resumo: 'Seus vencimentos e assinaturas organizados dia a dia, em formato de calendário.',
    comoUsar: [
      'Toque em um dia para ver o painel com as contas e assinaturas daquela data.',
      'Você pode baixar uma conta diretamente pelo painel do dia.',
      'Navegue entre os meses para planejar os próximos vencimentos.',
    ],
    dicas: [
      'Use o calendário no começo do mês para antecipar os pagamentos maiores.',
    ],
  },

  // ────────────────────────────── CARTÕES ──────────────────────────────
  {
    id: 'cartoes-dashboard',
    grupo: 'cartoes',
    titulo: 'Cartões — Dashboard',
    rota: '/cartoes/dashboard',
    permissao: 'CARTAO_VISUALIZAR',
    icone: 'CreditCard',
    resumo: 'Os indicadores dos seus cartões: limite usado, faturas, gastos por categoria e parceiro, parcelamentos e projeções.',
    comoUsar: [
      'Escolha o período com os filtros rápidos ou informando as datas.',
      'Acompanhe quanto do limite já foi usado e quanto ainda está livre.',
      'Veja os gráficos de gastos por categoria e por parceiro para entender para onde o dinheiro está indo.',
      'Fique atento aos alertas de faturas que fecham nos próximos 7 dias.',
    ],
    dicas: [
      'Compare meses diferentes para identificar aumentos de gasto em alguma categoria.',
    ],
  },
  {
    id: 'cartoes-lancamentos',
    grupo: 'cartoes',
    titulo: 'Cartões — Lançamentos',
    rota: '/cartoes',
    permissao: 'CARTAO_LANCAR',
    icone: 'ReceiptText',
    resumo: 'As compras e estornos de cada cartão, organizados fatura a fatura.',
    comoUsar: [
      'Selecione o cartão que deseja consultar ou lançar.',
      'Registre uma compra escolhendo o tipo "Saída"; para devoluções e estornos, use "Entrada".',
      'Informe valor, data, categoria e parceiro da compra.',
      'Ao fechar a fatura, o sistema cria automaticamente uma conta a pagar com o total.',
    ],
    dicas: [
      'Depois que a fatura é fechada, os lançamentos dela não podem mais ser alterados — qualquer ajuste exige estorno.',
    ],
    faq: [
      { p: 'Como uma compra parcelada aparece?', r: 'Cada parcela é lançada na fatura do mês correspondente, conforme a data de fechamento do cartão.' },
    ],
  },
  {
    id: 'cartoes-conciliacao',
    grupo: 'cartoes',
    titulo: 'Cartões — Conciliação',
    rota: '/cartoes/conciliacao',
    permissao: 'CARTAO_CONCILIACAO_VISUALIZAR',
    icone: 'GitCompareArrows',
    resumo: 'Confira a fatura enviada pelo banco (arquivo do cartão) com o que você já lançou no sistema.',
    comoUsar: [
      'No aplicativo ou site do banco, baixe o arquivo da fatura do cartão.',
      'Envie esse arquivo aqui no sistema.',
      'Revise item a item: vincule cada gasto a um lançamento que você já tinha ou crie um novo na hora.',
      'Finalize a conferência quando tudo estiver conferido.',
    ],
    dicas: [
      'Itens que você não reconhece podem ser ignorados — e reabertos depois, se precisar.',
    ],
  },

  // ────────────────────────────── CONCILIAÇÃO BANCÁRIA ──────────────────────────────
  {
    id: 'conciliacao',
    grupo: 'conciliacao',
    titulo: 'Conciliação bancária',
    rota: '/conciliacao',
    permissao: 'CONCILIACAO_VISUALIZAR',
    icone: 'ArrowLeftRight',
    resumo: 'Confira o extrato da sua conta bancária com os lançamentos do sistema, garantindo que nada ficou de fora.',
    comoUsar: [
      'Baixe o extrato da conta no aplicativo ou site do banco.',
      'Envie o arquivo do extrato aqui.',
      'Revise cada item: vincule a um lançamento existente, crie um novo ou ignore o que não interessa.',
      'Ao finalizar, o saldo da conta corrente é atualizado automaticamente.',
      'Se quiser, gere um relatório da conciliação em PDF.',
    ],
    dicas: [
      'Concilie com frequência para manter o saldo do sistema sempre igual ao do banco.',
    ],
    faq: [
      { p: 'O que acontece se eu ignorar um item?', r: 'Ele fica de fora da conta, mas você pode reabri-lo depois caso mude de ideia.' },
    ],
  },

  // ────────────────────────────── CADASTROS ──────────────────────────────
  {
    id: 'parceiros',
    grupo: 'cadastros',
    titulo: 'Parceiros',
    rota: '/parceiros',
    permissao: 'PARCEIRO_VISUALIZAR',
    icone: 'Users',
    resumo: 'Seus clientes e fornecedores — as pessoas e empresas de quem você recebe ou para quem você paga.',
    comoUsar: [
      'Clique em novo parceiro e informe se é pessoa ou empresa.',
      'Ao digitar o CNPJ, o sistema busca e preenche os dados automaticamente na base pública.',
      'Confira as informações preenchidas e salve.',
    ],
    dicas: [
      'O CPF ou CNPJ é obrigatório e ajuda a evitar cadastros duplicados.',
    ],
    faq: [
      { p: 'Posso cadastrar o mesmo CNPJ que já existe em outra empresa?', r: 'Sim. O CPF e o CNPJ são únicos apenas dentro da sua empresa, não no sistema inteiro.' },
    ],
  },
  {
    id: 'categorias',
    grupo: 'cadastros',
    titulo: 'Categorias',
    rota: '/categorias',
    permissao: 'CATEGORIA_VISUALIZAR',
    icone: 'Tag',
    resumo: 'A organização das suas receitas e despesas, com possibilidade de subcategorias para detalhar melhor.',
    comoUsar: [
      'Crie uma categoria principal (por exemplo, "Casa") e escolha um ícone.',
      'Se quiser detalhar, crie subcategorias dentro dela (como "Água" e "Luz").',
      'Use as categorias ao registrar lançamentos para deixar os relatórios mais claros.',
    ],
    dicas: [
      'Ao excluir, a categoria apenas fica inativa — o histórico é sempre preservado.',
      'Nos relatórios, o valor de uma subcategoria é somado dentro da categoria principal.',
    ],
    faq: [
      { p: 'Posso criar subcategoria de uma subcategoria?', r: 'Não. As categorias têm no máximo dois níveis: a principal e suas subcategorias.' },
    ],
  },

  // ────────────────────────────── INVESTIMENTOS & ASSINATURAS ──────────────────────────────
  {
    id: 'investimentos',
    grupo: 'invest-assin',
    titulo: 'Investimentos',
    rota: '/investimentos',
    permissao: 'INVESTIMENTO_VISUALIZAR',
    icone: 'TrendingUp',
    resumo: 'Sua carteira de investimentos: contas de aplicação, aportes, resgates e rendimentos.',
    comoUsar: [
      'Crie os tipos de investimento que você usa (Renda Fixa, Ações e outros).',
      'Cadastre suas contas de investimento dentro de cada tipo.',
      'Registre as movimentações: aportes (dinheiro que entra), resgates (que sai) e rendimentos.',
      'Acompanhe o patrimônio total somando todas as aplicações.',
    ],
    dicas: [
      'Mantenha os rendimentos atualizados para ver a evolução real da sua carteira.',
    ],
  },
  {
    id: 'assinaturas',
    grupo: 'invest-assin',
    titulo: 'Assinaturas',
    rota: '/assinaturas',
    permissao: 'ASSINATURA_VISUALIZAR',
    icone: 'Repeat',
    resumo: 'Seus gastos recorrentes, como streaming, academia e mensalidades.',
    comoUsar: [
      'Cadastre a assinatura informando o valor e o dia de vencimento.',
      'Se for cobrada no cartão, indique qual cartão de crédito.',
      'Enquanto a assinatura estiver ativa, a conta é gerada todos os meses automaticamente.',
      'Para parar temporariamente, deixe a assinatura como inativa; para encerrar de vez, cancele.',
    ],
    dicas: [
      'Revise as assinaturas de tempos em tempos para cortar aquelas que você não usa mais.',
    ],
  },

  // ────────────────────────────── RELATÓRIOS ──────────────────────────────
  {
    id: 'relatorios',
    grupo: 'relatorios',
    titulo: 'Relatórios',
    rota: '/reports',
    permissao: null,
    icone: 'BarChart3',
    resumo: 'Relatórios completos: Fluxo de Caixa, DRE, Extrato, Contas em Aberto, Investimentos, Cartões, Posição Financeira e Assinaturas.',
    comoUsar: [
      'Escolha o relatório que deseja e defina o período e os filtros.',
      'Veja o resultado na tela, ou exporte em PDF ou Excel.',
      'Cada relatório aparece de acordo com o acesso que o seu perfil tem.',
    ],
    dicas: [
      'O Fluxo de Caixa mostra entradas e saídas ao longo do tempo; a DRE resume o resultado do período.',
    ],
    faq: [
      { p: 'Por que não vejo todos os relatórios?', r: 'Cada relatório depende de uma permissão. Se algum não aparece, seu perfil não tem acesso a ele — fale com o administrador da sua empresa.' },
    ],
  },

  // ────────────────────────────── ÁUREA (IA) ──────────────────────────────
  {
    id: 'aurea',
    grupo: 'aurea',
    titulo: 'Áurea (assistente)',
    rota: '/assistente',
    permissao: null,
    icone: 'Sparkles',
    resumo: 'A assistente do Core 4 ERP, que consulta informações e faz lançamentos por você usando linguagem natural.',
    comoUsar: [
      'Abra a Áurea pelo balão no canto da tela ou pela tela do Assistente.',
      'Escreva como você falaria com uma pessoa, por exemplo: "quanto gastei em mercado este mês?".',
      'Peça para lançar: "registre R$ 50 de padaria hoje" — ela confirma com você antes de salvar.',
      'Anexe extratos e planilhas (PDF, arquivos do banco ou planilha) para que ela ajude na análise.',
    ],
    dicas: [
      'A Áurea sempre pede sua confirmação antes de registrar qualquer coisa — nada é lançado sem você aprovar.',
      'Quanto mais claro o pedido, melhor a resposta. Informe datas e valores quando possível.',
    ],
    faq: [
      { p: 'A Áurea pode apagar meus dados?', r: 'Não. Ela só consulta informações e cria ou atualiza lançamentos, sempre com a sua confirmação.' },
    ],
  },

  // ────────────────────────────── ADMINISTRAÇÃO ──────────────────────────────
  {
    id: 'auditoria',
    grupo: 'administracao',
    titulo: 'Auditoria',
    rota: '/audit',
    permissao: 'AUDITORIA_VISUALIZAR',
    icone: 'Gavel',
    resumo: 'O registro de tudo o que aconteceu na conta da sua empresa: quem fez o quê e quando.',
    comoUsar: [
      'Filtre os eventos por tipo de ação e por período.',
      'Consulte o histórico para acompanhar mudanças importantes.',
      'Identifique os eventos feitos pela assistente Áurea pelo selo próprio.',
    ],
    dicas: [
      'Use a auditoria para conferir alterações de permissão e mudanças em membros da empresa.',
    ],
  },
  {
    id: 'operadores',
    grupo: 'administracao',
    titulo: 'Operadores',
    rota: '/empresa/operadores',
    permissao: 'USUARIO_VISUALIZAR',
    icone: 'UserCog',
    resumo: 'Os membros da sua empresa: convide novas pessoas e gerencie quem tem acesso.',
    comoUsar: [
      'Convide um membro pelo e-mail e escolha o perfil de acesso dele.',
      'A pessoa recebe o convite e cria a própria senha ao aceitar.',
      'Para tirar o acesso de alguém, use "Remover" — a pessoa fica inativa, mas pode ser reativada depois.',
    ],
    dicas: [
      'Dê a cada pessoa o perfil com o mínimo de acesso necessário para o trabalho dela.',
    ],
    faq: [
      { p: 'Remover um operador apaga os registros dele?', r: 'Não. A pessoa fica inativa e perde o acesso, mas todo o histórico do que ela fez é mantido.' },
    ],
  },
  {
    id: 'perfis',
    grupo: 'administracao',
    titulo: 'Perfis de Acesso',
    rota: '/empresa/perfis',
    permissao: 'CONFIGURACAO_EDITAR',
    icone: 'ShieldCheck',
    resumo: 'O que cada perfil pode fazer no sistema — a base do controle de acesso da sua empresa.',
    comoUsar: [
      'Consulte os perfis existentes e o que cada um permite.',
      'Crie perfis personalizados marcando as permissões por área do sistema.',
      'Atribua os perfis às pessoas na tela de Operadores.',
    ],
    dicas: [
      'A permissão "Visualizar" é sempre necessária para as demais ações da mesma área — ela é adicionada automaticamente.',
      'Os perfis padrão do sistema não podem ser alterados; para ajustar algo, crie um perfil personalizado.',
    ],
  },

  // ────────────────────────────── MINHA CONTA ──────────────────────────────
  {
    id: 'configuracoes',
    grupo: 'minha-conta',
    titulo: 'Configurações',
    rota: '/configuracoes',
    permissao: null,
    icone: 'Settings',
    resumo: 'Seus dados pessoais, foto e senha.',
    comoUsar: [
      'Atualize seu nome e sua foto de perfil.',
      'Troque a senha quando quiser, informando a senha atual e a nova.',
    ],
    dicas: [
      'A nova senha precisa ter no mínimo 8 caracteres, com letras maiúsculas, minúsculas e pelo menos um número.',
    ],
  },

  // ────────────────────────────── PWA ──────────────────────────────
  {
    id: 'pwa',
    grupo: 'pwa',
    titulo: 'Instalar no celular',
    rota: null,
    permissao: null,
    icone: 'Smartphone',
    resumo: 'O Core 4 ERP funciona como um aplicativo, direto na tela inicial do seu celular ou computador.',
    comoUsar: [
      'No Android ou no computador: toque no botão "Instalar" que aparece no aviso do sistema.',
      'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
      'Pronto: o Core 4 vira um ícone e abre como um aplicativo normal.',
    ],
    dicas: [
      'Instalado, o app avisa quando você fica sem internet e volta a funcionar assim que a conexão retorna.',
    ],
    faq: [
      { p: 'Instalar consome muito espaço?', r: 'Não. O app é leve e usa apenas o necessário para funcionar bem, inclusive offline nas telas já visitadas.' },
    ],
  },
];
