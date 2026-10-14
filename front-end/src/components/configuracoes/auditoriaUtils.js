import {
  ArrowLeftRight, CheckCircle2, FilePlus2, FileX2, Lock, PencilLine, RotateCcw,
} from 'lucide-react';

/*
 * Textos legíveis para os eventos de auditoria. A API devolve a entidade como o nome do
 * service em caixa alta (CONTA, CONTACORRENTE, CARTAOCREDITO…) e a ação do enum AcaoAuditoria.
 */

/** Ações do enum AcaoAuditoria (backend) — as únicas aceitas no filtro. */
export const ACOES = {
  CRIAR: { verbo: 'criou', rotulo: 'Criação', icon: FilePlus2, tom: 'success' },
  EDITAR: { verbo: 'alterou', rotulo: 'Alteração', icon: PencilLine, tom: 'info' },
  DELETAR: { verbo: 'excluiu', rotulo: 'Exclusão', icon: FileX2, tom: 'error' },
  BAIXAR: { verbo: 'deu baixa em', rotulo: 'Baixa', icon: CheckCircle2, tom: 'income' },
  ESTORNAR: { verbo: 'estornou a baixa de', rotulo: 'Estorno', icon: RotateCcw, tom: 'warning' },
  TRANSFERIR: { verbo: 'transferiu entre', rotulo: 'Transferência', icon: ArrowLeftRight, tom: 'info' },
  FECHAR_FATURA: { verbo: 'fechou a fatura de', rotulo: 'Fechamento de fatura', icon: Lock, tom: 'invest' },
};

const ENTIDADES = {
  CONTA: 'conta a pagar/receber',
  CONTACORRENTE: 'conta bancária',
  CARTAOCREDITO: 'cartão',
  LANCAMENTOCARTAO: 'lançamento do cartão',
  CATEGORIA: 'categoria',
  PARCEIRO: 'parceiro',
  INVESTIMENTO: 'investimento',
  TIPOINVESTIMENTO: 'tipo de investimento',
  ASSINATURA: 'assinatura',
  ORCAMENTO: 'orçamento',
  PERFILACESSO: 'perfil de acesso',
  EMPRESA: 'empresa',
  NOTIFICACAO: 'notificação',
  CHATCONVERSA: 'conversa com a Áurea',
  PLANO: 'plano',
  CONCILIACAO: 'conciliação',
};

export function nomeEntidade(entidade) {
  if (!entidade) return 'registro';
  return ENTIDADES[entidade] ?? entidade.toLowerCase().replace(/_/g, ' ');
}

const FEMININOS = new Set(['CONTA', 'CONTACORRENTE', 'CATEGORIA', 'ASSINATURA', 'NOTIFICACAO', 'CHATCONVERSA', 'EMPRESA', 'CONCILIACAO']);

/** "a categoria" / "o orçamento" (para montar frases naturais). */
export function entidadeComArtigo(entidade) {
  return `${FEMININOS.has(entidade) ? 'a' : 'o'} ${nomeEntidade(entidade)}`;
}

export function infoAcao(acao) {
  return ACOES[acao] ?? { verbo: 'registrou', rotulo: acao ?? 'Evento', icon: PencilLine, tom: 'neutral' };
}

/** JSON do valor anterior/novo (o backend grava texto). Nunca lança. */
export function lerJson(texto) {
  if (!texto) return null;
  try {
    const v = JSON.parse(texto);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/** Nome curto do registro afetado (descrição, nome, título…), quando houver. */
export function rotuloRegistro(evento) {
  const dado = lerJson(evento.valorNovo) ?? lerJson(evento.valorAnterior);
  const nome = dado?.descricao ?? dado?.nome ?? dado?.titulo ?? dado?.categoria?.descricao ?? null;
  const id = evento.entidadeId ?? dado?.id ?? null;
  return { nome: typeof nome === 'string' ? nome : null, id };
}

const CAMPOS = {
  descricao: 'Descrição', nome: 'Nome', titulo: 'Título', valor: 'Valor', valorOriginal: 'Valor',
  dataVencimento: 'Vencimento', dataPagamento: 'Pagamento', status: 'Situação', limite: 'Limite',
  categoria: 'Categoria', parceiro: 'Parceiro', ativo: 'Ativo', tipo: 'Tipo', observacao: 'Observação',
};

export const nomeCampo = (c) => CAMPOS[c] ?? c.replace(/([A-Z])/g, ' $1').replace(/^./, (l) => l.toUpperCase());

function formatarValor(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return v.descricao ?? v.nome ?? JSON.stringify(v);
  return String(v);
}

/** Lista de { campo, antes, depois } com o que mudou (ou todos os campos, numa criação/exclusão). */
export function diferencas(evento) {
  const antes = lerJson(evento.valorAnterior) ?? {};
  const depois = lerJson(evento.valorNovo) ?? {};
  const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].filter((k) => k !== 'id');
  return chaves
    .map((k) => ({ campo: nomeCampo(k), antes: formatarValor(antes[k]), depois: formatarValor(depois[k]), chave: k }))
    .filter((d) => !(Object.keys(antes).length && Object.keys(depois).length) || d.antes !== d.depois);
}

/** "2026-10-14" a partir do timestamp, para agrupar por dia. */
export const diaDe = (ts) => (ts ? String(ts).slice(0, 10) : 'sem-data');

export function rotuloDia(dia) {
  if (dia === 'sem-data') return 'Sem data';
  const hoje = new Date();
  const d = new Date(`${dia}T12:00:00`);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const mesmo = (a, b) => a.toDateString() === b.toDateString();
  if (mesmo(d, hoje)) return 'Hoje';
  if (mesmo(d, ontem)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' });
}

export const horaDe = (ts) => (ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
