import { useCallback, useMemo, useState } from 'react';
import {
  assinaturas as assinaturasApi, cartoes as cartoesApi, contas as contasApi,
  dashboard as dashboardApi, investimentos as investimentosApi,
} from '../../lib/api';
import { useCarga } from '../../hooks/useCarga';
import { useAuth } from '../../hooks/useAuth';
import { orcamentosApi } from './apiVisaoGeral';
import { hojeLocal, paraIsoLocal } from './datasVisaoGeral';

const JANELA_VENCIMENTOS_DIAS = 30;
const MAX_CONTAS_JANELA = 60;

/** Contas pendentes/atrasadas até 30 dias à frente (o seed nem sempre grava ATRASADO: vale a data). */
async function carregarProximasContas() {
  const limite = hojeLocal();
  limite.setDate(limite.getDate() + JANELA_VENCIMENTOS_DIAS);
  const base = { vencimentoFim: paraIsoLocal(limite), size: MAX_CONTAS_JANELA, sort: 'dataVencimento,asc' };
  const [pendentes, atrasadas] = await Promise.all([
    contasApi.listar({ ...base, status: 'PENDENTE' }),
    contasApi.listar({ ...base, status: 'ATRASADO' }),
  ]);
  const todas = [...(atrasadas?.content ?? []), ...(pendentes?.content ?? [])];
  const unicas = [...new Map(todas.map((c) => [c.id, c])).values()];
  return unicas.sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento)));
}

/**
 * Todas as cargas do Início, cada uma só com a permissão que a API exige (sem permissão o painel
 * some, em vez de mostrar R$ 0,00). `atualizar()` recarrega tudo de uma vez (um botão só).
 */
export function useDadosInicio() {
  const { temPermissao } = useAuth();
  const [versao, setVersao] = useState(0);
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date());

  const pode = useMemo(() => ({
    saldo: temPermissao('DASHBOARD_CARTAO_VISUALIZAR'),
    investimentos: temPermissao('INVESTIMENTO_VISUALIZAR'),
    assinaturas: temPermissao('ASSINATURA_VISUALIZAR'),
    contas: temPermissao('CONTA_VISUALIZAR'),
    orcamentos: temPermissao('ORCAMENTO_VISUALIZAR'),
    cartoes: temPermissao('CARTAO_VISUALIZAR'),
  }), [temPermissao]);

  const resumo = useCarga(() => dashboardApi.resumo(), ['resumo', versao]);
  const saldo = useCarga(() => dashboardApi.saldoDetalhado(), ['saldo', versao], { ativo: pode.saldo });
  const carteiras = useCarga(() => investimentosApi.listar(), ['inv', versao], { ativo: pode.investimentos, inicial: [] });
  const assinaturas = useCarga(() => assinaturasApi.listarAtivas(), ['assin', versao], { ativo: pode.assinaturas, inicial: [] });
  const contas = useCarga(carregarProximasContas, ['contas', versao], { ativo: pode.contas, inicial: [] });
  const orcamento = useCarga(() => orcamentosApi.listar(), ['orc', versao], { ativo: pode.orcamentos });
  const cartoes = useCarga(() => cartoesApi.listar(), ['cartoes', versao], { ativo: pode.cartoes, inicial: [] });

  const atualizar = useCallback(() => {
    setVersao((v) => v + 1);
    setAtualizadoEm(new Date());
  }, []);

  const recarregarContas = useCallback(() => {
    contas.recarregar();
    resumo.recarregar();
    saldo.recarregar();
  }, [contas, resumo, saldo]);

  return { pode, resumo, saldo, carteiras, assinaturas, contas, orcamento, cartoes, atualizar, atualizadoEm, recarregarContas };
}

export default useDadosInicio;
