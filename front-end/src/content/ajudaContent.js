// Central de Ajuda — conteúdo data-driven.
// Cada seção documenta UMA tela em linguagem simples (sem códigos de permissão nem nomes
// internos), com os termos do glossário do Core 4: "Contas a pagar e receber", "Conta bancária",
// "Lançamento do cartão", "Baixar", "Estornar baixa", "Entradas/Saídas", "Áurea", "Início".
// Os ids são âncoras usadas pela busca (Ctrl+K): conciliacao, aurea, lancamentos, pwa.
//
// Campos: id, grupo, titulo, rota, permissao (ou permissoesAlguma), icone (nome lucide),
// resumo, comoUsar (passos do "Como funciona"), dicas, faq [{ p, r }], palavras (sinônimos p/ busca).

export const AJUDA_GRUPOS = [
  { id: 'primeiros-passos', titulo: 'Primeiros passos', icone: 'Sparkles', descricao: 'Comece por aqui' },
  { id: 'visao-geral', titulo: 'Visão geral', icone: 'LayoutDashboard', descricao: 'Início, insights, calendário e relatórios' },
  { id: 'dinheiro', titulo: 'Dinheiro', icone: 'Wallet', descricao: 'Contas, cartões, bancos, investimentos e orçamento' },
  { id: 'conciliacao', titulo: 'Conciliação', icone: 'GitCompareArrows', descricao: 'Conferir o extrato com o sistema' },
  { id: 'cadastros', titulo: 'Cadastros', icone: 'Tag', descricao: 'Parceiros, categorias e assinaturas' },
  { id: 'aurea', titulo: 'Áurea', icone: 'MessageSquareText', descricao: 'A assistente que conversa e lança' },
  { id: 'administracao', titulo: 'Empresa', icone: 'UserCog', descricao: 'Operadores, perfis e auditoria' },
  { id: 'minha-conta', titulo: 'Minha conta', icone: 'Settings', descricao: 'Perfil, segurança, acessibilidade' },
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
    resumo: 'Um roteiro curto para começar do zero e organizar suas finanças em poucos minutos.',
    comoUsar: [
      'Cadastre suas contas bancárias em "Contas bancárias", com o saldo de hoje.',
      'Crie categorias (Mercado, Salário, Transporte) para separar entradas e saídas.',
      'Cadastre parceiros: clientes de quem você recebe e fornecedores a quem você paga.',
      'Registre a primeira conta em "Contas a pagar e receber".',
      'Se preferir, peça à Áurea: "registre uma conta a pagar de R$ 200 para amanhã".',
    ],
    dicas: [
      'Não precisa cadastrar tudo de uma vez. Comece pelo essencial e complete com o uso.',
      'Ctrl + K (⌘ K no Mac) abre a busca: encontre qualquer tela ou registro.',
    ],
    faq: [
      { p: 'Preciso cadastrar categorias e parceiros antes de lançar?', r: 'É recomendado, porque deixa os relatórios mais claros. Mas dá para criar na hora, direto do formulário da conta.' },
    ],
    palavras: ['começar', 'tutorial', 'onboarding', 'início rápido'],
  },
  {
    id: 'pwa',
    grupo: 'primeiros-passos',
    titulo: 'Instalar no celular',
    rota: null,
    permissao: null,
    icone: 'Smartphone',
    resumo: 'O Core 4 funciona como aplicativo, direto na tela inicial do celular ou do computador.',
    comoUsar: [
      'Android ou computador: toque em "Instalar" no aviso que aparece no sistema.',
      'iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
      'Pronto: o Core 4 vira um ícone e abre como um aplicativo.',
    ],
    dicas: ['Instalado, ele avisa quando você fica sem internet e volta sozinho quando a conexão retorna.'],
    faq: [
      { p: 'Instalar ocupa muito espaço?', r: 'Não. O app é leve e guarda só o necessário para abrir rápido.' },
    ],
    palavras: ['app', 'aplicativo', 'pwa', 'instalar', 'iphone', 'android'],
  },

  // ────────────────────────────── VISÃO GERAL ──────────────────────────────
  {
    id: 'dashboard',
    grupo: 'visao-geral',
    titulo: 'Início',
    rota: '/dashboard',
    permissao: 'DASHBOARD_VISUALIZAR',
    icone: 'LayoutDashboard',
    resumo: 'O resumo do seu dinheiro: saldo em contas, entradas e saídas do mês, o que pede atenção e o que vem por aí.',
    comoUsar: [
      'No topo ficam saldo em contas, entradas, saídas e resultado do mês.',
      'Os alertas levam direto às contas atrasadas ou que vencem logo.',
      'Os gráficos mostram os últimos 6 meses e as maiores saídas do mês atual.',
    ],
    dicas: ['Os cartões de crédito têm o painel próprio em Cartões › Visão geral.'],
    faq: [
      { p: 'Por que o saldo não mudou depois que lancei uma conta?', r: 'O saldo só muda quando a conta é baixada (paga ou recebida). Contas pendentes aparecem nas projeções.' },
      { p: 'Dá para escolher o período do Início?', r: 'Não. O Início mostra sempre o mês atual e os últimos 6 meses. Para outros períodos, use os Relatórios.' },
    ],
    palavras: ['dashboard', 'painel', 'resumo', 'saldo'],
  },
  {
    id: 'insights',
    grupo: 'visao-geral',
    titulo: 'Insights',
    rota: '/insights',
    permissao: 'DASHBOARD_VISUALIZAR',
    icone: 'Lightbulb',
    resumo: 'O que mudou no seu gasto, explicado em frases curtas e gráficos.',
    comoUsar: [
      'Escolha o mês que quer entender.',
      'Leia as frases: cada uma aponta uma alta, queda ou novidade com o valor.',
      'Abra a categoria ou o parceiro citado para ver os detalhes.',
    ],
    dicas: ['Compare com o mês anterior para pegar aumentos antes que virem hábito.'],
    palavras: ['análise', 'mudanças', 'tendência'],
  },
  {
    id: 'calendario',
    grupo: 'visao-geral',
    titulo: 'Calendário',
    rota: '/calendario',
    permissao: 'CALENDARIO_VISUALIZAR',
    icone: 'CalendarDays',
    resumo: 'Vencimentos de contas e assinaturas, dia a dia.',
    comoUsar: [
      'Navegue entre os meses pelas setas do topo.',
      'Toque em um dia para ver as contas e assinaturas daquela data.',
      'Baixe uma conta direto pelo painel do dia.',
    ],
    dicas: ['Olhe o calendário no começo do mês para se preparar para os pagamentos maiores.'],
    palavras: ['vencimentos', 'agenda', 'datas'],
  },
  {
    id: 'relatorios',
    grupo: 'visao-geral',
    titulo: 'Relatórios',
    rota: '/reports',
    permissoesAlguma: [
      'RELATORIO_FLUXO_CAIXA_VISUALIZAR', 'RELATORIO_CONTAS_ABERTAS_VISUALIZAR', 'RELATORIO_EXTRATO_VISUALIZAR',
      'RELATORIO_DRE_VISUALIZAR', 'RELATORIO_INVESTIMENTOS_VISUALIZAR', 'RELATORIO_CARTOES_VISUALIZAR',
      'RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR', 'RELATORIO_ASSINATURAS_VISUALIZAR',
    ],
    icone: 'BarChart3',
    resumo: 'Fluxo de caixa, DRE, extrato, contas em aberto, investimentos, cartões, posição financeira e assinaturas.',
    comoUsar: [
      'Escolha o relatório e o período.',
      'Veja o resultado na tela ou exporte em PDF ou Excel.',
      'Cada relatório aparece conforme o acesso do seu perfil.',
    ],
    dicas: ['O fluxo de caixa mostra entradas e saídas no tempo; a DRE resume receitas e despesas do período.'],
    faq: [
      { p: 'Por que não vejo todos os relatórios?', r: 'Cada relatório depende de um acesso do seu perfil. Peça ao administrador da empresa se precisar de outro.' },
    ],
    palavras: ['dre', 'fluxo de caixa', 'extrato', 'excel', 'pdf', 'exportar'],
  },

  // ────────────────────────────── DINHEIRO ──────────────────────────────
  {
    id: 'lancamentos',
    grupo: 'dinheiro',
    titulo: 'Contas a pagar e receber',
    rota: '/contas',
    permissao: 'CONTA_VISUALIZAR',
    icone: 'ReceiptText',
    resumo: 'Tudo o que você tem a pagar e a receber: crie, edite, baixe e estorne a baixa.',
    comoUsar: [
      'Clique em "Nova conta" e informe tipo (pagar ou receber), vencimento, valor, categoria e parceiro.',
      'Quando pagar ou receber, use "Baixar": informe a data e a conta bancária usada.',
      'Errou a baixa? Use "Estornar baixa". O histórico continua guardado.',
      'Use a barra de filtros para ver por situação, período ou texto.',
    ],
    dicas: [
      'Uma conta baixada não pode ser editada. Para corrigir, estorne a baixa e ajuste.',
      'Transferências entre suas contas ficam em "Contas bancárias".',
    ],
    faq: [
      { p: 'Qual a diferença entre baixar e estornar?', r: 'Baixar registra que a conta foi paga ou recebida e mexe no saldo. Estornar a baixa desfaz isso e devolve o saldo, mantendo o registro.' },
      { p: 'O que é uma conta atrasada?', r: 'Uma conta pendente com vencimento no passado. Você ainda pode baixá-la normalmente.' },
    ],
    palavras: ['lançamentos', 'baixar', 'pagar', 'receber', 'estorno', 'despesa', 'receita'],
  },
  {
    id: 'cartoes',
    grupo: 'dinheiro',
    titulo: 'Cartões',
    rota: '/cartoes',
    permissoesAlguma: ['CARTAO_LANCAR', 'CARTAO_VISUALIZAR'],
    icone: 'CreditCard',
    resumo: 'Faturas, limites e lançamentos do cartão, em duas abas: Visão geral e Faturas e lançamentos.',
    comoUsar: [
      'Visão geral: quanto está nas faturas, quanto do limite sobra, parcelamentos e onde mais gastou.',
      'Faturas e lançamentos: escolha o cartão e registre compras e estornos.',
      'Compras parceladas caem uma parcela em cada fatura, conforme o fechamento do cartão.',
      'Ao fechar a fatura, o Core 4 cria uma conta a pagar com o total.',
    ],
    dicas: ['Depois que a fatura fecha, os lançamentos dela não mudam. Ajustes viram estorno na próxima.'],
    faq: [
      { p: 'Por que só vejo uma das abas?', r: 'Cada aba depende de um acesso do seu perfil: ver o painel ou lançar no cartão.' },
    ],
    palavras: ['cartão de crédito', 'fatura', 'limite', 'parcelado', 'compra'],
  },
  {
    id: 'contas-correntes',
    grupo: 'dinheiro',
    titulo: 'Contas bancárias',
    rota: '/contas-correntes',
    permissao: 'CONTA_CORRENTE_VISUALIZAR',
    icone: 'Landmark',
    resumo: 'Suas contas no banco, o saldo de cada uma e as transferências entre elas.',
    comoUsar: [
      'Cadastre cada conta com banco, agência e número.',
      'Acompanhe o saldo de cada uma e o total em "Saldo em contas".',
      'Para mover dinheiro entre suas contas, use "Transferir".',
    ],
    dicas: ['O saldo é calculado a partir das baixas e transferências. Não edite o saldo à mão.'],
    faq: [
      { p: 'Por que não consigo excluir uma conta bancária?', r: 'Contas com transferências ou conciliações registradas ficam guardadas para manter o histórico.' },
    ],
    palavras: ['conta corrente', 'banco', 'saldo', 'transferência'],
  },
  {
    id: 'investimentos',
    grupo: 'dinheiro',
    titulo: 'Investimentos',
    rota: '/investimentos',
    permissao: 'INVESTIMENTO_VISUALIZAR',
    icone: 'TrendingUp',
    resumo: 'Sua carteira: aplicações, aportes, resgates e rendimentos.',
    comoUsar: [
      'Crie os tipos que você usa (Renda fixa, Ações…).',
      'Cadastre cada aplicação dentro do tipo.',
      'Registre aportes, resgates e rendimentos para acompanhar o patrimônio.',
    ],
    dicas: ['Lance os rendimentos todo mês para ver a evolução real da carteira.'],
    palavras: ['carteira', 'aporte', 'resgate', 'rendimento', 'patrimônio'],
  },
  {
    id: 'orcamentos',
    grupo: 'dinheiro',
    titulo: 'Orçamentos',
    rota: '/orcamentos',
    permissao: 'ORCAMENTO_VISUALIZAR',
    icone: 'Target',
    resumo: 'Quanto você quer gastar por categoria em cada mês e como está o ritmo.',
    comoUsar: [
      'Defina um limite mensal para cada categoria principal. Ele se repete todo mês.',
      'A marca na barra mostra onde o gasto deveria estar hoje. Passou dela, o selo avisa.',
      'Use as sugestões: o valor sugerido é a média dos últimos 3 meses.',
    ],
    dicas: ['Contam as contas a pagar do mês e as compras no cartão (cada parcela no seu mês).'],
    faq: [
      { p: 'Não consigo mudar os limites. Por quê?', r: 'Seu perfil pode ver o orçamento, mas não editar. Peça esse acesso ao administrador da empresa.' },
    ],
    palavras: ['orçamento', 'limite', 'meta', 'planejamento'],
  },

  // ────────────────────────────── CONCILIAÇÃO ──────────────────────────────
  {
    id: 'conciliacao',
    grupo: 'conciliacao',
    titulo: 'Conciliação',
    rota: '/conciliacao',
    permissoesAlguma: ['CONCILIACAO_VISUALIZAR', 'CARTAO_CONCILIACAO_VISUALIZAR'],
    icone: 'GitCompareArrows',
    resumo: 'Confira o extrato do banco ou do cartão com o que está no Core 4, item a item. Abas: Conta bancária e Cartão.',
    comoUsar: [
      'Baixe o extrato OFX no site ou app do banco.',
      'Escolha a aba (Conta bancária ou Cartão) e envie o arquivo.',
      'Revise cada item: vincule a uma conta existente, crie uma nova ou ignore.',
      'Sessões não terminadas ficam na lista, com "Retomar".',
    ],
    dicas: ['Concilie com frequência para o saldo do Core 4 bater com o do banco.'],
    faq: [
      { p: 'O que acontece se eu ignorar um item?', r: 'Ele fica de fora, mas dá para reabrir depois.' },
      { p: 'O que significam os selos?', r: 'Sugerido: o Core 4 achou uma conta parecida. Não identificado: não achou. Vinculado: você ligou a uma conta. Baixado: a conta foi baixada pela conciliação. Ignorado: ficou de fora.' },
    ],
    palavras: ['ofx', 'extrato', 'conferir', 'banco', 'cartão'],
  },

  // ────────────────────────────── CADASTROS ──────────────────────────────
  {
    id: 'parceiros',
    grupo: 'cadastros',
    titulo: 'Parceiros',
    rota: '/parceiros',
    permissao: 'PARCEIRO_VISUALIZAR',
    icone: 'Users',
    resumo: 'Clientes e fornecedores: de quem você recebe e a quem você paga.',
    comoUsar: [
      'Clique em "Novo parceiro" e diga se é pessoa ou empresa.',
      'Com o CNPJ, o Core 4 busca e preenche os dados públicos.',
      'Confira e salve.',
    ],
    dicas: ['O CPF ou CNPJ evita cadastros repetidos.'],
    faq: [
      { p: 'Posso cadastrar um CNPJ que já existe em outra empresa?', r: 'Sim. O documento é único só dentro da sua empresa.' },
    ],
    palavras: ['cliente', 'fornecedor', 'cnpj', 'cpf'],
  },
  {
    id: 'categorias',
    grupo: 'cadastros',
    titulo: 'Categorias',
    rota: '/categorias',
    permissao: 'CATEGORIA_VISUALIZAR',
    icone: 'Tag',
    resumo: 'Como você agrupa entradas e saídas, com subcategorias para detalhar.',
    comoUsar: [
      'Crie uma categoria principal (ex.: Casa) e escolha um ícone.',
      'Se quiser, crie subcategorias dentro dela (Água, Luz).',
      'Use as categorias ao lançar, para os relatórios ficarem claros.',
    ],
    dicas: ['Nos relatórios, as subcategorias somam dentro da principal.'],
    faq: [
      { p: 'Posso criar subcategoria de subcategoria?', r: 'Não. São no máximo dois níveis.' },
    ],
    palavras: ['classificação', 'subcategoria'],
  },
  {
    id: 'assinaturas',
    grupo: 'cadastros',
    titulo: 'Assinaturas',
    rota: '/assinaturas',
    permissao: 'ASSINATURA_VISUALIZAR',
    icone: 'Repeat',
    resumo: 'Cobranças que se repetem: streaming, academia, mensalidades, serviços.',
    comoUsar: [
      'Cadastre com valor e dia de cobrança.',
      'Se for no cartão, escolha qual.',
      'Enquanto estiver ativa, a cobrança é gerada todo mês. Para pausar, deixe inativa.',
    ],
    dicas: ['Revise de tempos em tempos e corte o que não usa mais.'],
    palavras: ['recorrente', 'mensalidade', 'streaming'],
  },

  // ────────────────────────────── ÁUREA ──────────────────────────────
  {
    id: 'aurea',
    grupo: 'aurea',
    titulo: 'Áurea, a assistente',
    rota: '/assistente',
    permissao: null,
    icone: 'Sparkles',
    resumo: 'Converse para consultar números, entender gastos e fazer lançamentos, sem abrir formulários.',
    comoUsar: [
      'Abra a Áurea pelo botão no canto da tela (computador), pelo centro da barra de baixo (celular) ou pelo menu.',
      'Escreva como falaria com uma pessoa: "quanto gastei com mercado este mês?".',
      'Peça lançamentos: "registre R$ 50 de padaria hoje". Cadastros simples são feitos na hora.',
      'Baixas, estornos, transferências, fechamento de fatura e exclusões aparecem num cartão "Confirmação necessária". Nada acontece até você tocar em Confirmar.',
      'Anexe planilha, extrato .ofx, PDF ou .md (até 5 MB). Ela lê e propõe o que fazer; para gravar, confirme na mensagem seguinte.',
    ],
    dicas: [
      'Quanto mais claro o pedido (valor, data, categoria), melhor a resposta.',
      'O painel do canto e a tela da Áurea guardam conversas separadas. A tela tem o histórico completo.',
      'As mensagens são processadas pela OpenAI, nos Estados Unidos. Evite enviar dados de outras pessoas sem necessidade.',
    ],
    faq: [
      { p: 'A Áurea pode excluir ou mexer no meu saldo?', r: 'Pode, mas só depois do seu OK: ela mostra o resumo e espera você confirmar. Além disso, ela respeita o seu perfil: o que você não pode fazer na tela, ela também não faz.' },
      { p: 'Apareceu "A resposta não chegou". E agora?', r: 'A Áurea ficou indisponível por um momento. Toque em "Tentar novamente". Se continuar, tente mais tarde.' },
      { p: 'Como apago uma conversa?', r: 'Na tela da Áurea, abra a conversa e use o botão de lixeira no topo. Seus dados financeiros não mudam.' },
    ],
    palavras: ['assistente', 'ia', 'chat', 'inteligência artificial', 'conversa', 'anexo'],
  },

  // ────────────────────────────── EMPRESA ──────────────────────────────
  {
    id: 'operadores',
    grupo: 'administracao',
    titulo: 'Operadores',
    rota: '/empresa/operadores',
    permissao: 'USUARIO_VISUALIZAR',
    icone: 'UserCog',
    resumo: 'Quem acessa a empresa: convide pessoas, troque perfis e desative acessos.',
    comoUsar: [
      'Clique em "Convidar", informe o e-mail e escolha o perfil.',
      'A pessoa recebe o convite e cria a própria senha. Convites esperando resposta ficam na aba "Convites pendentes".',
      'Para tirar o acesso, use "Desativar". Dá para reativar depois.',
    ],
    dicas: [
      'Dê a cada pessoa só o acesso de que ela precisa.',
      'Ninguém altera o próprio acesso, e o proprietário não muda por esta tela.',
    ],
    faq: [
      { p: 'Desativar apaga o que a pessoa fez?', r: 'Não. Ela perde o acesso, mas o histórico continua guardado.' },
      { p: 'Por que um perfil aparece com cadeado?', r: 'Ele tem acessos que você não tem. Só quem tem esses acessos pode atribuí-lo.' },
    ],
    palavras: ['usuários', 'convite', 'membros', 'equipe'],
  },
  {
    id: 'perfis',
    grupo: 'administracao',
    titulo: 'Perfis de acesso',
    rota: '/empresa/perfis',
    permissao: 'CONFIGURACAO_EDITAR',
    icone: 'ShieldCheck',
    resumo: 'O que cada perfil pode ver e fazer em cada módulo.',
    comoUsar: [
      'Veja os perfis padrão (Proprietário, Administrador, Financeiro, Operador, Visualizador).',
      'Para algo sob medida, crie um perfil da empresa e marque os acessos na tabela: módulos nas linhas, ações nas colunas.',
      'Atribua o perfil às pessoas em Operadores.',
    ],
    dicas: [
      'Marcar qualquer ação marca também "Ver" do módulo. Desmarcar "Ver" tira as outras ações.',
      'Acessos com cadeado são os que você não tem: você só consegue dar o que você mesmo tem.',
    ],
    faq: [
      { p: 'Por que não consigo excluir um perfil?', r: 'Perfis em uso por alguém (ou por um convite pendente) precisam ser trocados antes.' },
    ],
    palavras: ['permissões', 'acessos', 'papéis', 'rbac'],
  },
  {
    id: 'auditoria',
    grupo: 'administracao',
    titulo: 'Auditoria',
    rota: '/audit',
    permissao: 'AUDITORIA_VISUALIZAR',
    icone: 'Gavel',
    resumo: 'Quem fez o quê e quando: criações, alterações, exclusões, baixas, estornos e transferências.',
    comoUsar: [
      'Escolha o período e, se quiser, o tipo de ação.',
      'Os eventos aparecem por dia, do mais novo ao mais antigo.',
      'Toque num evento para ver o que mudou, de onde veio e quando.',
    ],
    dicas: ['O selo "Pela Áurea" mostra ações feitas pela assistente a pedido de alguém.'],
    palavras: ['log', 'histórico', 'registro', 'rastreabilidade'],
  },

  // ────────────────────────────── MINHA CONTA ──────────────────────────────
  {
    id: 'configuracoes',
    grupo: 'minha-conta',
    titulo: 'Configurações',
    rota: '/configuracoes',
    permissao: null,
    icone: 'Settings',
    resumo: 'Seu perfil, senha, sessões, dados pessoais, aparência e acessibilidade.',
    comoUsar: [
      'Perfil: nome e foto (você vê a prévia antes de salvar).',
      'Segurança: troque a senha ou saia de todos os dispositivos.',
      'Privacidade e dados: baixe seus dados ou exclua a conta.',
      'Aparência: tema claro ou escuro e o modo que esconde valores.',
    ],
    dicas: ['A nova senha precisa de 8 caracteres ou mais, com letra maiúscula, minúscula e número.'],
    faq: [
      { p: 'Perdi o celular. O que faço?', r: 'Em Configurações › Segurança, use "Sair de todos os dispositivos". Depois entre de novo com sua senha.' },
    ],
    palavras: ['senha', 'foto', 'tema', 'privacidade', 'lgpd', 'sessões'],
  },
  {
    id: 'acessibilidade',
    grupo: 'minha-conta',
    titulo: 'Acessibilidade',
    rota: '/configuracoes?aba=acessibilidade',
    permissao: null,
    icone: 'Accessibility',
    resumo: 'Ajuste o Core 4 ao seu jeito: tamanho do texto, contraste, movimento, fontes, cores e teclado.',
    comoUsar: [
      'Abra pelo ícone de acessibilidade na barra superior, com Alt + A, ou em Configurações › Acessibilidade.',
      'Use um conjunto pronto (Baixa visão, Dislexia, Movimento, Daltonismo, Teclado) ou ajuste cada opção.',
      'Tudo vale na hora e fica salvo neste navegador.',
    ],
    dicas: ['Os atalhos de teclado estão logo abaixo, nesta página.'],
    palavras: ['a11y', 'contraste', 'fonte', 'dislexia', 'daltonismo', 'leitor de tela', 'teclado', 'zoom'],
  },
];
