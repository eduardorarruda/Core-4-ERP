import { BarChart3, CalendarClock, PieChart, Wallet } from 'lucide-react';

/*
 * Regras compartilhadas da Áurea (tela cheia e painel flutuante). Fonte única para as
 * sugestões, a detecção do pedido de confirmação e os textos fixos.
 */

/** Sugestões da tela de boas-vindas e dos chips do painel. */
export const SUGESTOES_AUREA = [
  { texto: 'Qual o meu saldo hoje?', curto: 'Saldo de hoje', icon: Wallet },
  { texto: 'Quais contas estão atrasadas?', curto: 'Contas atrasadas', icon: CalendarClock },
  { texto: 'Onde eu mais gastei este mês?', curto: 'Maiores gastos', icon: PieChart },
  { texto: 'Faça um resumo das minhas finanças do mês', curto: 'Resumo do mês', icon: BarChart3 },
];

/** Respostas que os botões do cartão de confirmação enviam (o backend aceita "sim" e recusa "não"). */
export const RESPOSTA_CONFIRMAR = 'sim';
export const RESPOSTA_CANCELAR = 'não';

export const TEXTO_CONFIANCA =
  'A Áurea só muda algo quando você pede. Ações que mexem em dinheiro ou excluem dados esperam o seu OK.';

/*
 * Ações críticas (baixa, estorno, transferência, exclusão, fechar fatura…) e escritas vindas de
 * anexo passam pelo portão de 2 turnos do backend (CONFIRMAÇÃO NECESSÁRIA). O prompt do sistema
 * manda a Áurea mostrar o resumo e terminar com "Posso prosseguir?". Detectamos essa pergunta
 * no fim da resposta para mostrar os botões Confirmar/Cancelar.
 */
const PEDIDO_CONFIRMACAO = /(posso\s+prosseguir|confirma(?:\s+a\s+opera[cç][aã]o)?|deseja\s+(?:continuar|prosseguir|confirmar)|posso\s+(?:continuar|executar|seguir))\s*\?\s*[*_]*\s*$/i;

export function pedeConfirmacao(texto) {
  if (!texto) return false;
  const final = texto.trim().split('\n').slice(-3).join(' ');
  return PEDIDO_CONFIRMACAO.test(final);
}

/** Saudação pelo horário local. */
export function saudacao(agora = new Date()) {
  const h = agora.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Primeiro nome para a saudação ("Eduardo Arruda" → "Eduardo"). */
export function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || '';
}

const RELATORIO_PATH = /\/api\/chat\/relatorios\/[^\s)"'\]]+\.xlsx/;

/** Caminho do relatório gerado pela Áurea dentro do texto (sempre relativo à origem). */
export function relatorioDoTexto(texto) {
  const m = (texto || '').match(RELATORIO_PATH);
  return m ? m[0] : null;
}

export function ehCaminhoRelatorio(href) {
  return RELATORIO_PATH.test(href || '');
}

/** Remove do texto o link cru do relatório (ele vira um botão de download). */
export function textoSemRelatorio(texto) {
  if (!relatorioDoTexto(texto)) return texto;
  return texto
    .replace(/\[([^\]]*)\]\(\s*[^)]*\/api\/chat\/relatorios\/[^)]*\)/g, '')
    .replace(new RegExp(RELATORIO_PATH.source, 'g'), '')
    .replace(/\[[^\]]*\]\(\s*\)/g, '')
    .trim();
}

/*
 * Mensagens de erro amigáveis. O backend devolve 503 quando a OpenAI está fora; 429 quando o
 * limite de mensagens estoura; 502 quando o modelo devolve algo inválido.
 */
// Mensagem do servidor que é detalhe técnico (exceção Java, formato, stack) não vai para a tela
const TECNICO = /(exception|specifier|java\.|null|stack|sql|format|\bat\s+[\w.]+\(|^[A-Z][a-zA-Z]+Error)/i;

export function mensagemErroChat(status, mensagemBruta) {
  const mensagemServidor = mensagemBruta && !TECNICO.test(mensagemBruta) ? mensagemBruta : null;
  if (status === 429) return 'Você enviou muitas mensagens em pouco tempo. Espere um minuto e tente de novo.';
  if (status === 503 || status === 502 || status >= 500) {
    return 'A Áurea está indisponível agora. Tente de novo em alguns instantes.';
  }
  if (status === 403) return mensagemServidor || 'Seu perfil não tem acesso a esta ação. Fale com o administrador da empresa.';
  if (status === 413) return 'O arquivo é grande demais. Envie um arquivo de até 5 MB.';
  return mensagemServidor || 'Não foi possível processar sua mensagem. Tente novamente.';
}

export const ERRO_CONEXAO = 'Sem conexão com o servidor. Verifique a internet e tente de novo.';

/** Tipos de arquivo aceitos pela Áurea (mesma lista do backend). */
export const TIPOS_ANEXO = '.xlsx,.xls,.csv,.ofx,.pdf,.md';
export const MAX_ANEXO_MB = 5;
export const MAX_ANEXO_BYTES = MAX_ANEXO_MB * 1024 * 1024;

const EXTENSOES = TIPOS_ANEXO.split(',');

/** Valida o arquivo antes de anexar. Devolve a mensagem de erro ou null. */
export function validarAnexo(arquivo) {
  if (!arquivo) return 'Nenhum arquivo selecionado.';
  const nome = arquivo.name.toLowerCase();
  if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
    return 'Esse tipo de arquivo não é aceito. Envie planilha (.xlsx, .xls, .csv), extrato .ofx, PDF ou .md.';
  }
  if (arquivo.size > MAX_ANEXO_BYTES) return `O arquivo passa de ${MAX_ANEXO_MB} MB. Envie um arquivo menor.`;
  return null;
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/*
 * Quando a OpenAI falha no meio do stream, o backend não derruba a conexão: manda uma frase
 * amigável como se fosse a resposta (ChatService.mensagemAmigavelErro). Reconhecemos essas
 * frases para mostrar o estado de erro com "Tentar novamente" em vez de um balão comum.
 */
const RESPOSTAS_DE_ERRO = [
  /^n[aã]o consegui responder agora/i, // RespostaFalhaChat.TEXTO_PADRAO (backend atual)
  /^o assistente est[aá] temporariamente indispon[ií]vel/i,
  /^o assistente recebeu muitas solicita[cç][oõ]es/i,
  /^erro ao processar mensagem/i,
  /^n[aã]o foi poss[ií]vel conectar ao servidor/i,
];

export function ehRespostaDeErro(texto) {
  const t = (texto || '').trim();
  return t.length > 0 && t.length < 220 && RESPOSTAS_DE_ERRO.some((r) => r.test(t));
}

/** Converte a frase de erro do backend no texto do estado de erro. */
export function mensagemDaRespostaDeErro(texto) {
  if (/muitas solicita/i.test(texto || '')) return mensagemErroChat(429);
  return mensagemErroChat(503);
}
