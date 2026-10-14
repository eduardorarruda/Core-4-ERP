import { Landmark, CreditCard } from 'lucide-react';
import {
  conciliacao as apiBanco,
  conciliacaoCartao as apiCartao,
  contasCorrentes as contasCorrentesApi,
  cartoes as cartoesApi,
  contas as contasApi,
} from '../../lib/api';

/**
 * Tudo o que muda entre a conciliação bancária e a de cartão. O resto (upload, revisão,
 * sessões, relatório) é o mesmo código — ver ConciliacaoWorkspace.
 *
 * Os itens chegam do backend com nomes diferentes (contaId × lancamentoId…); `vinculoDe(item)`
 * devolve sempre { id, descricao, valor } para a tela não precisar saber o modo.
 */

/** Limite de contas em aberto carregadas no "Vincular" (o backend pagina). */
const LIMITE_CONTAS = 200;

const comum = {
  // O backend permite reabrir item ignorado (PATCH desfazer-ignorar). Se o cliente da API
  // ainda não expõe o método, "desvincular" tem o mesmo efeito (volta a Não identificado).
  desfazerIgnorar: (api) => (id, itemId) => (api.desfazerIgnorar ?? api.desvincularItem)(id, itemId),
};

export const MODOS = {
  banco: {
    id: 'banco',
    api: apiBanco,
    rotaBase: '/conciliacao',
    icone: Landmark,
    abaLabel: 'Conta bancária',
    subtitulo: 'Importe o extrato OFX do banco e confira cada movimento com as contas a pagar e receber.',
    permissoes: {
      ver: 'CONCILIACAO_VISUALIZAR',
      importar: 'CONCILIACAO_IMPORTAR',
      vincular: 'CONCILIACAO_VINCULAR',
    },
    destino: {
      rotulo: 'Conta bancária',
      erroPrefixo: 'CONTA_NAO_ENCONTRADA:',
      aviso: (num) => `Não achamos a conta ${num} do extrato entre as suas contas bancárias. Escolha qual conta é essa para continuar.`,
      listar: () => contasCorrentesApi.listar(),
      opcao: (c) => ({ value: c.id, label: `${c.descricao}${c.numeroConta ? ` — ${c.numeroConta}` : ''}` }),
    },
    vinculo: {
      singular: 'conta',
      artigo: 'a',
      vincularTitulo: 'Vincular a uma conta a pagar ou receber',
      criarTitulo: 'Nova conta a pagar ou receber',
      vazio: 'Nenhuma conta em aberto encontrada',
      colunaRelatorio: 'Conta',
    },
    vinculoDe: (i) => ({ id: i.contaId, descricao: i.contaDescricao, valor: i.contaValor }),
    descricaoOfx: (i) => i.ofxMemo || i.ofxNome || '',
    somenteIgnorar: () => false,
    tituloSessao: (s) => s.contaCorrenteDescricao || `Conta ${s.contaCorrenteNumero || s.numeroContaOfx || ''}`.trim(),
    detalheSessao: (s) => [s.bancoId && `Banco ${s.bancoId}`, s.agencia && `Ag. ${s.agencia}`, s.contaCorrenteNumero && `Conta ${s.contaCorrenteNumero}`]
      .filter(Boolean).join(' · '),
    textoBaixa: (n) => `${n} ${n === 1 ? 'conta será baixada' : 'contas serão baixadas'} na conta bancária`,
    statusLabel: { BAIXADO: 'Baixado' },
    acoes: {
      vincular: (sessaoId, itemId, alvo) => apiBanco.vincularItem(sessaoId, itemId, { contaId: alvo.id }),
      criar: (sessaoId, itemId, dto) => apiBanco.criarContaItem(sessaoId, itemId, dto),
      ignorar: (sessaoId, itemId) => apiBanco.ignorarItem(sessaoId, itemId),
      desvincular: (sessaoId, itemId) => apiBanco.desvincularItem(sessaoId, itemId),
      desfazerIgnorar: comum.desfazerIgnorar(apiBanco),
    },
    /** Candidatos ao vínculo: contas em aberto (pendentes ou atrasadas). */
    buscarCandidatos: async () => {
      const r = await contasApi.listar({ size: LIMITE_CONTAS });
      const todas = r?.content ?? [];
      return {
        itens: todas
          .filter((c) => c.status === 'PENDENTE' || c.status === 'ATRASADO')
          .map((c) => ({
            id: c.id,
            descricao: c.descricao,
            valor: Number(c.valorOriginal),
            data: c.dataVencimento,
            detalhe: c.status === 'ATRASADO' ? 'Atrasada' : 'Em aberto',
            atrasado: c.status === 'ATRASADO',
          })),
        truncado: (r?.totalElements ?? todas.length) > todas.length,
        limite: LIMITE_CONTAS,
      };
    },
  },

  cartao: {
    id: 'cartao',
    api: apiCartao,
    rotaBase: '/cartoes/conciliacao',
    icone: CreditCard,
    abaLabel: 'Cartão',
    subtitulo: 'Importe o OFX da fatura do cartão e confira cada compra com os lançamentos.',
    permissoes: {
      ver: 'CARTAO_CONCILIACAO_VISUALIZAR',
      importar: 'CARTAO_CONCILIACAO_IMPORTAR',
      vincular: 'CARTAO_CONCILIACAO_VINCULAR',
    },
    destino: {
      rotulo: 'Cartão',
      erroPrefixo: 'CARTAO_NAO_ENCONTRADO:',
      aviso: (num) => `Não achamos o cartão ${num} do arquivo entre os seus cartões. Escolha qual cartão é esse para continuar.`,
      listar: () => cartoesApi.listar(),
      opcao: (c) => ({ value: c.id, label: c.nome }),
    },
    vinculo: {
      singular: 'lançamento',
      artigo: 'o',
      vincularTitulo: 'Vincular a um lançamento do cartão',
      criarTitulo: 'Novo lançamento no cartão',
      vazio: 'Nenhum lançamento encontrado neste cartão',
      colunaRelatorio: 'Lançamento',
    },
    vinculoDe: (i) => ({ id: i.lancamentoId, descricao: i.lancamentoDescricao, valor: i.lancamentoValor }),
    descricaoOfx: (i) => i.ofxMemo || '',
    // Créditos/estornos no cartão não geram despesa — só podem ser ignorados.
    somenteIgnorar: (i) => i.ofxTipo === 'CREDIT',
    tituloSessao: (s) => s.cartaoCreditoNome || 'Cartão',
    detalheSessao: () => '',
    textoBaixa: (n) => `${n} ${n === 1 ? 'lançamento será confirmado' : 'lançamentos serão confirmados'} no cartão`,
    statusLabel: { BAIXADO: 'Confirmado' },
    acoes: {
      vincular: (sessaoId, itemId, alvo) => apiCartao.vincularItem(sessaoId, itemId, { lancamentoId: alvo.id }),
      criar: (sessaoId, itemId, dto) => apiCartao.criarLancamento(sessaoId, itemId, dto),
      ignorar: (sessaoId, itemId) => apiCartao.ignorarItem(sessaoId, itemId),
      desvincular: (sessaoId, itemId) => apiCartao.desvincularItem(sessaoId, itemId),
      desfazerIgnorar: comum.desfazerIgnorar(apiCartao),
    },
    /** Candidatos ao vínculo: lançamentos do cartão da sessão. */
    buscarCandidatos: async (sessao) => {
      const r = await cartoesApi.lancamentos.listar(sessao.cartaoCreditoId);
      const lista = Array.isArray(r) ? r : (r?.content ?? []);
      return {
        itens: lista.map((l) => ({
          id: l.id,
          descricao: l.descricao,
          valor: Number(l.valor),
          data: l.dataCompra,
          detalhe: l.totalParcelas > 1 ? `Parcela ${l.numeroParcela} de ${l.totalParcelas}` : '',
        })),
        truncado: false,
      };
    },
  },
};

export function modoDe(modo) {
  return MODOS[modo] ?? MODOS.banco;
}

// ── Status dos itens (glossário §1.5: Sugerido, Não identificado, Ignorado, Vinculado, Baixado)

export const STATUS = {
  SUGERIDO: 'SUGERIDO',
  VINCULADO: 'VINCULADO_MANUALMENTE',
  NAO_IDENTIFICADO: 'NAO_IDENTIFICADO',
  IGNORADO: 'IGNORADO',
  BAIXADO: 'BAIXADO',
};

/** Itens que ainda pedem decisão de quem concilia. */
export const aRevisar = (i) => i.statusItem === STATUS.SUGERIDO || i.statusItem === STATUS.NAO_IDENTIFICADO;

export function rotuloStatus(statusItem, cfg) {
  const base = {
    SUGERIDO: 'Sugerido',
    VINCULADO_MANUALMENTE: 'Vinculado',
    NAO_IDENTIFICADO: 'Não identificado',
    IGNORADO: 'Ignorado',
    BAIXADO: 'Baixado',
  };
  return cfg?.statusLabel?.[statusItem] ?? base[statusItem] ?? statusItem;
}

/** Confiança da sugestão (pontos de 0 a 100 calculados no backend). */
export function nivelConfianca(score) {
  if (score == null) return null;
  if (score >= 70) return 'alta';
  if (score >= 50) return 'media';
  return 'baixa';
}

export const STATUS_SESSAO = {
  PENDENTE: { label: 'Em andamento', variant: 'warning' },
  FINALIZADA: { label: 'Finalizada', variant: 'success' },
  CANCELADA: { label: 'Cancelada', variant: 'neutral' },
};

/** Ações disponíveis para o item, na ordem em que aparecem. */
export function acoesDoItem(item, { cfg, podeVincular, sessaoAberta }) {
  if (!podeVincular || !sessaoAberta || item.statusItem === STATUS.BAIXADO) return [];
  const soIgnorar = cfg.somenteIgnorar(item);
  switch (item.statusItem) {
    case STATUS.SUGERIDO:
      return ['confirmar', 'vincular', 'ignorar'];
    case STATUS.NAO_IDENTIFICADO:
      return soIgnorar ? ['ignorar'] : ['vincular', 'criar', 'ignorar'];
    case STATUS.VINCULADO:
      return ['desvincular'];
    case STATUS.IGNORADO:
      return ['desfazerIgnorar'];
    default:
      return [];
  }
}
