import React, { useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, CreditCard, Home, Landmark, RefreshCw, Scale } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import AlertaErro from '../components/ui/AlertaErro';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import FaixaAlertas from '../components/dashboard/FaixaAlertas';
import FluxoCaixaChart from '../components/dashboard/FluxoCaixaChart';
import FluxoSankey from '../components/dashboard/FluxoSankey';
import SaldoDetalhadoPanel from '../components/dashboard/SaldoDetalhadoPanel';
import ProximosVencimentos from '../components/dashboard/ProximosVencimentos';
import CarteiraPanel from '../components/dashboard/CarteiraPanel';
import OrcamentosResumo from '../components/dashboard/OrcamentosResumo';
import AssinaturasPanel from '../components/dashboard/AssinaturasPanel';
import BaixaRapidaModal from '../components/dashboard/BaixaRapidaModal';
import { useDadosInicio } from '../components/dashboard/useDadosInicio';
import { diasAte, paraIsoLocal, proximaDataDoDia } from '../components/dashboard/datasVisaoGeral';
import { formatarMoeda, formatarNumero } from '../lib/formatters';
import { MESES_ABREV, MESES_COMPLETOS } from '../lib/constants';
import { cn } from '../lib/utils';

/*
 * Faturas fechando: calculado aqui a partir de GET /api/cartoes (já carregado pelo Início) em vez de
 * chamar o BI de cartões (7 painéis, bem mais caro) só para isso. Mesma regra do `alertasFechamento`
 * do BI (CartaoCreditoService): até 7 dias, 0 = "fecha hoje", próximo dia de fechamento a partir de hoje.
 * Única diferença: aqui o dia 29–31 é ajustado ao último dia de meses curtos (o BI não ajusta).
 */
const DIAS_ALERTA_FATURA = 7;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Alertas que pedem ação agora — cada um leva à tela onde se resolve. */
function montarAlertas({ resumo, contas, cartoes, orcamento }) {
  const alertas = [];
  const atrasadas = Number(resumo?.contasAtrasadas ?? 0);
  if (atrasadas > 0) {
    const valor = contas.filter((c) => diasAte(c.dataVencimento) < 0 || c.status === 'ATRASADO')
      .reduce((s, c) => s + Number(c.valorOriginal ?? 0), 0);
    alertas.push({
      id: 'atrasadas', gravidade: 'critico', icon: AlertTriangle, to: '/contas',
      titulo: `${plural(atrasadas, 'conta atrasada', 'contas atrasadas')}`,
      detalhe: valor > 0 ? `Somam ${formatarMoeda(valor)} · dê baixa ou renegocie` : 'Dê baixa ou renegocie',
    });
  }
  const hoje = Number(resumo?.contasVencendoHoje ?? 0);
  if (hoje > 0) {
    alertas.push({ id: 'hoje', gravidade: 'atencao', icon: CalendarClock, to: '/contas', titulo: `${plural(hoje, 'conta vence', 'contas vencem')} hoje`, detalhe: 'Pague hoje para evitar juros' });
  }
  cartoes.forEach((c) => {
    const dias = diasAte(paraIsoLocal(proximaDataDoDia(c.diaFechamento)));
    if (dias <= DIAS_ALERTA_FATURA) {
      alertas.push({
        id: `fatura-${c.id}`, gravidade: 'info', icon: CreditCard, to: '/cartoes/dashboard',
        titulo: dias === 0 ? `Fatura do ${c.nome} fecha hoje` : `Fatura do ${c.nome} fecha em ${plural(dias, 'dia', 'dias')}`,
        detalhe: `Compras depois disso vão para a próxima fatura`,
      });
    }
  });
  const estourados = (orcamento?.itens ?? []).filter((o) => o.status === 'ESTOURADO');
  if (estourados.length > 0) {
    alertas.push({
      id: 'orcamentos', gravidade: 'atencao', icon: AlertOctagon, to: '/orcamentos',
      titulo: `${plural(estourados.length, 'orçamento estourou', 'orçamentos estouraram')}`,
      detalhe: estourados.slice(0, 2).map((o) => o.categoria?.descricao).join(', '),
    });
  }
  return alertas;
}

function rotuloMes(m) {
  return { rotulo: MESES_ABREV[m.mes - 1], rotuloLongo: `${MESES_COMPLETOS[m.mes - 1]} de ${m.ano}` };
}

export default function Dashboard() {
  const dadosInicio = useDadosInicio();
  const { pode, resumo, saldo, carteiras, assinaturas, contas, orcamento, cartoes, atualizar, atualizadoEm, recarregarContas } = dadosInicio;
  const [contaBaixa, setContaBaixa] = useState(null);

  const d = resumo.dados;
  const fluxo = useMemo(() => (d?.fluxoMensal ?? []).map((m) => ({
    ...rotuloMes(m),
    entradas: Number(m.totalRecebido ?? 0),
    saidas: Number(m.totalPago ?? 0),
  })), [d]);
  const categorias = useMemo(() => (d?.despesasPorCategoria ?? []).map((c) => ({ nome: c.categoria, valor: Number(c.total ?? 0) })), [d]);

  const mes = fluxo[fluxo.length - 1];
  const anterior = fluxo[fluxo.length - 2];
  const entradas = mes?.entradas ?? 0;
  const saidas = mes?.saidas ?? 0;
  const resultado = entradas - saidas;
  const taxaSobra = entradas > 0 ? (resultado / entradas) * 100 : null;
  const limiteTotal = Number(d?.limiteTotalCartoes ?? 0);
  const limiteUsado = Number(d?.limiteUsadoTotalCartoes ?? 0);

  const alertas = useMemo(
    () => montarAlertas({ resumo: d, contas: contas.dados ?? [], cartoes: cartoes.dados ?? [], orcamento: orcamento.dados }),
    [d, contas.dados, cartoes.dados, orcamento.dados],
  );

  const carregando = resumo.carregando || saldo.carregando || contas.carregando;
  const inicial = resumo.carregandoInicial;
  const painelInferior = [pode.investimentos, pode.orcamentos, pode.assinaturas].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Home}
        title="Início"
        subtitle="O que pede atenção, quanto entrou e saiu e o que vem por aí."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-primary/60 hidden sm:block" aria-live="polite">
              {carregando ? 'Atualizando…' : `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <Button
              variant="secondary"
              onClick={atualizar}
              disabled={carregando}
              leftIcon={<RefreshCw className={cn('w-4 h-4', carregando && 'motion-safe:animate-spin')} aria-hidden="true" />}
            >
              Atualizar
            </Button>
          </div>
        }
      />

      {resumo.erro && !d ? (
        <AlertaErro mensagem="Não deu para carregar o resumo. Verifique a conexão e tente de novo." onTentarNovamente={atualizar} />
      ) : (
        <>
          <FaixaAlertas alertas={alertas} />

          <section aria-labelledby="kpis-titulo">
            <h2 id="kpis-titulo" className="sr-only">Resumo do mês</h2>
            <KpiGrid cols={4}>
              <KpiCard
                destaque
                label="Saldo em contas"
                valor={d?.saldoTotalContasCorrentes}
                icon={Landmark}
                tom="primary"
                loading={inicial}
                ajuda="Soma do saldo de todas as contas bancárias hoje."
              />
              <KpiCard
                label="Entradas do mês"
                valor={entradas}
                anterior={anterior?.entradas}
                icon={ArrowDownLeft}
                tom="income"
                loading={inicial}
                ajuda="Dinheiro recebido no mês (contas a receber com baixa)."
              />
              <KpiCard
                label="Saídas do mês"
                valor={saidas}
                anterior={anterior?.saidas}
                inverterDelta
                icon={ArrowUpRight}
                tom="expense"
                loading={inicial}
                ajuda="Dinheiro pago no mês (contas a pagar com baixa). Contas que ainda vão vencer não entram."
              />
              <KpiCard
                label="Sobrou no mês"
                valor={resultado}
                colorirSinal
                icon={Scale}
                tom={resultado >= 0 ? 'income' : 'expense'}
                loading={inicial}
                ajuda="Entradas menos saídas do mês."
              >
                {taxaSobra != null && (
                  <span className={cn('font-medium', taxaSobra >= 0 ? 'text-income' : 'text-expense')}>
                    {taxaSobra >= 0
                      ? `Sobrou ${formatarNumero(taxaSobra, 'percent', { casas: 0 })} do que entrou`
                      : `Saiu ${formatarNumero(-taxaSobra, 'percent', { casas: 0 })} a mais do que entrou`}
                  </span>
                )}
              </KpiCard>
            </KpiGrid>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {pode.contas && (
              <ProximosVencimentos
                id="proximos-vencimentos"
                className="lg:col-span-12 xl:col-span-6"
                contas={contas.dados ?? []}
                carregando={contas.carregandoInicial}
                onBaixar={setContaBaixa}
              />
            )}
            <FluxoCaixaChart dados={fluxo} carregando={inicial} className={cn('lg:col-span-12', pode.contas && 'xl:col-span-6')} />

            <FluxoSankey entradas={entradas} categorias={categorias} carregando={inicial} className={cn('lg:col-span-12', pode.saldo && 'xl:col-span-8')} />
            {pode.saldo && (
              <SaldoDetalhadoPanel
                className="lg:col-span-12 xl:col-span-4"
                dados={saldo.dados}
                carregando={saldo.carregando}
                erro={saldo.erro}
                onTentarNovamente={saldo.recarregar}
                limiteLivre={limiteTotal > 0 ? limiteTotal - limiteUsado : null}
              />
            )}
          </div>

          {painelInferior > 0 && (
            <div className={cn('grid grid-cols-1 gap-4 lg:gap-6', painelInferior >= 2 && 'md:grid-cols-2', painelInferior >= 3 && 'xl:grid-cols-3')}>
              {pode.investimentos && (
                <CarteiraPanel
                  carteiras={carteiras.dados ?? []}
                  saldoContas={Number(d?.saldoTotalContasCorrentes ?? 0)}
                  dividaCartoes={limiteUsado}
                  carregando={carteiras.carregandoInicial}
                />
              )}
              {pode.orcamentos && <OrcamentosResumo orcamento={orcamento.dados} carregando={orcamento.carregandoInicial} />}
              {pode.assinaturas && <AssinaturasPanel assinaturas={assinaturas.dados ?? []} carregando={assinaturas.carregandoInicial} />}
            </div>
          )}
        </>
      )}

      <BaixaRapidaModal key={contaBaixa?.id ?? 'nenhuma'} conta={contaBaixa} onClose={() => setContaBaixa(null)} onBaixada={recarregarContas} />
    </div>
  );
}

