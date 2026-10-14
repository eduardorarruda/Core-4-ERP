// Conteúdo da Declaração de Acessibilidade (/acessibilidade).
// Ao mudar o que o produto oferece ou o resultado das avaliações, atualize DATA_DECLARACAO.

export const DATA_DECLARACAO = 'outubro de 2026';
export const META_CONFORMIDADE = 'WCAG 2.2 nível AA';

export const SECOES_ACESSIBILIDADE = [
  { id: 'compromisso', titulo: 'Nosso compromisso' },
  { id: 'modos', titulo: 'Modos de acessibilidade' },
  { id: 'conjuntos', titulo: 'Conjuntos prontos' },
  { id: 'teclado', titulo: 'Teclado e atalhos' },
  { id: 'tecnologias', titulo: 'Leitores de tela e outras tecnologias' },
  { id: 'principios', titulo: 'Princípios que seguimos' },
  { id: 'limitacoes', titulo: 'Limitações conhecidas' },
  { id: 'avaliacao', titulo: 'Como avaliamos' },
  { id: 'contato', titulo: 'Encontrou uma barreira?' },
];

/** Modos do painel — o que fazem, em linguagem simples. */
export const MODOS = [
  { nome: 'Tamanho do texto', texto: 'De 100% a 175%. Tudo cresce junto e a tela se reorganiza, sem rolar para o lado. O zoom do navegador (Ctrl e +) também funciona até 200%.' },
  { nome: 'Contraste', texto: 'Padrão, alto ou seguir o sistema. O alto usa fundo sólido, letras com contraste de pelo menos 7:1 e bordas bem marcadas. O Alto Contraste do Windows (cores forçadas) também é respeitado.' },
  { nome: 'Tema claro ou escuro', texto: 'Na primeira visita seguimos o tema do seu sistema. Troque quando quiser (Alt + T).' },
  { nome: 'Fonte para leitura', texto: 'Atkinson Hyperlegible, feita para baixa visão, ou Lexend, com letras largas que ajudam na fluência de leitura. Só é baixada se você escolher.' },
  { nome: 'Espaçamento de texto ampliado', texto: 'Mais espaço entre linhas, letras, palavras e parágrafos (os valores do critério 1.4.12 da WCAG).' },
  { nome: 'Leitura simplificada', texto: 'Tira enfeites como brilhos, fundo animado e ilustrações, e limita a largura das linhas.' },
  { nome: 'Guia de leitura', texto: 'Uma faixa acompanha o mouse ou o item com foco e escurece o resto da tela.' },
  { nome: 'Animações', texto: 'Seguir o sistema, reduzidas (só esmaecer) ou desligadas (tudo aparece direto).' },
  { nome: 'Pausar tudo que se move', texto: 'Para indicadores girando, brilhos e números que contam, inclusive quando os dados se atualizam sozinhos.' },
  { nome: 'Destacar o foco', texto: 'Contorno preto e amarelo, bem grosso, em volta do item selecionado pelo teclado.' },
  { nome: 'Alvos amplos', texto: 'Botões, links de menu e campos com pelo menos 48 pixels de altura.' },
  { nome: 'Sublinhar links', texto: 'Mostra o que é link sem depender da cor.' },
  { nome: 'Cursor grande', texto: 'Ponteiro do mouse maior e com contorno.' },
  { nome: 'Visão de cores', texto: 'Paletas para protanopia, deuteranopia, tritanopia e monocromia. Trocam as cores dos gráficos e de entradas, saídas e investimentos. Valores sempre têm sinal (+ ou −) e ícone, nunca só cor.' },
  { nome: 'Padrões nos gráficos', texto: 'Cada série ganha uma textura (listras, pontos, xadrez) além da cor.' },
  { nome: 'Atalhos de teclado', texto: 'Podem ser desligados se você usa comando de voz ou aperta teclas sem querer. Nenhum atalho usa uma tecla sozinha.' },
];

export const PRINCIPIOS_UNIVERSAL = [
  { nome: 'Uso equitativo', texto: 'As mesmas telas e os mesmos dados para todo mundo; os modos ajustam a apresentação, não escondem funções.' },
  { nome: 'Flexibilidade no uso', texto: 'Mouse, toque, teclado, leitor de tela ou voz. Tamanho, fonte, contraste e movimento à sua escolha.' },
  { nome: 'Uso simples e intuitivo', texto: 'Cada tela tem um título, uma frase dizendo para que serve e uma ação principal. Um único filtro de período por tela.' },
  { nome: 'Informação perceptível', texto: 'Status com texto e ícone, gráficos com resumo e tabela, valores com sinal. Nada depende só de cor.' },
  { nome: 'Tolerância ao erro', texto: 'Exclusões pedem confirmação, mensagens de erro dizem o que fazer e avisos de erro não somem sozinhos.' },
  { nome: 'Baixo esforço físico', texto: 'Alvos de toque de 44 pixels ou mais no celular, sem gestos de arrastar obrigatórios e sem tempo limite para preencher.' },
  { nome: 'Tamanho e espaço para uso', texto: 'Funciona de 320 pixels de largura até telas grandes, com texto ampliado sem rolagem lateral.' },
];

export const PRINCIPIOS_INCLUSIVO = [
  { nome: 'Reconhecer a exclusão', texto: 'Procuramos onde o produto deixa pessoas de fora (pouca visão, tremor, dislexia, sensibilidade a movimento, daltonismo) e tratamos isso como defeito.' },
  { nome: 'Aprender com a diversidade', texto: 'Cada modo nasce de uma necessidade real e vem explicado em linguagem simples, para quem precisa entender sem ajuda.' },
  { nome: 'Resolver para um, estender para muitos', texto: 'O que ajuda uma pessoa cega ou com baixa visão (contraste, foco visível, tabelas nos gráficos) ajuda quem usa o celular no sol ou está cansado no fim do dia.' },
];

export const LIMITACOES = [
  { titulo: 'Respostas da Áurea', texto: 'As respostas do assistente são geradas por IA e exibidas por uma biblioteca de terceiros. Às vezes vêm sem títulos ou com tabelas longas, o que dificulta a leitura com leitor de tela. Peça "responda em lista curta" para um formato mais simples.' },
  { titulo: 'Gráficos complexos', texto: 'Todo gráfico tem um resumo e uma tabela para leitores de tela, mas os detalhes ao passar o mouse (tooltip) não existem no toque nem no teclado. Use a tabela ou o relatório da mesma informação.' },
  { titulo: 'Arquivos exportados', texto: 'PDFs gerados no navegador ainda não têm marcação de acessibilidade (tags). Prefira a exportação em Excel, que mantém cabeçalhos de coluna.' },
  { titulo: 'Preferências por navegador', texto: 'As escolhas do painel ficam salvas neste navegador, não na sua conta. Em outro aparelho, escolha de novo.' },
  { titulo: 'Testes com pessoas usuárias', texto: 'Ainda não fizemos rodadas de teste com pessoas com deficiência. Até lá, contamos com verificações automáticas e manuais e com o seu retorno.' },
  { titulo: 'Logotipo', texto: 'O símbolo da marca é decorativo e não segue a regra de contraste; o nome "Core 4" sempre aparece em texto ao lado ou no rótulo do link.' },
];
