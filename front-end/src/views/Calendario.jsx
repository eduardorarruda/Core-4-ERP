import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarDays, CheckCircle2, Repeat } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import Badge from '../components/ui/Badge';
import { MonthSelector } from '../components/ui/PeriodoSelector';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import { ContaItem, AssinaturaItem } from '../components/dashboard/CalendarioItens';
import { totaisDasContas, emAberto, valorCurto } from '../components/dashboard/calendarioCalculos';
import BaixaRapidaModal from '../components/dashboard/BaixaRapidaModal';
import { contas as contasApi, assinaturas as assinaturasApi } from '../lib/api';
import { useMesUrl } from '../hooks/usePeriodoUrl';
import { useCarga } from '../hooks/useCarga';
import { useAuth } from '../hooks/useAuth';
import { formatarMoeda } from '../lib/formatters';
import { cn } from '../lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const LIMITE_CONTAS_MES = 500;
const pad = (n) => String(n).padStart(2, '0');

function ResumoMes({ totais, carregando }) {
  const itens = [
    { id: 'pagar', rotulo: 'A pagar em aberto', valor: totais.pagar, sinal: '−', cor: 'text-expense', Icone: ArrowUpRight },
    { id: 'receber', rotulo: 'A receber em aberto', valor: totais.receber, sinal: '+', cor: 'text-income', Icone: ArrowDownLeft },
    { id: 'pago', rotulo: 'Já pago', valor: totais.pago, sinal: '−', cor: 'text-text-primary', Icone: CheckCircle2 },
    { id: 'recebido', rotulo: 'Já recebido', valor: totais.recebido, sinal: '+', cor: 'text-text-primary', Icone: CheckCircle2 },
  ];
  return (
    <Stagger as="dl" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {itens.map((i) => (
        <StaggerItem key={i.id} className="c4-card px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-text-primary/65">
            <i.Icone className={cn('w-3.5 h-3.5', i.cor === 'text-text-primary' ? 'text-text-primary/60' : i.cor)} aria-hidden="true" />
            {i.rotulo}
          </dt>
          <dd className={cn('mt-1 font-display text-lg font-semibold tabular-nums valor-privado', i.cor)}>
            {carregando ? <span className="block h-6 w-24 rounded shimmer-bg" aria-hidden="true" /> : `${i.valor > 0 ? i.sinal : ''}${formatarMoeda(i.valor, { sinal: 'nunca' })}`}
          </dd>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function CelulaDia({ dia, contas, assinaturas, hoje, selecionado, onSelecionar }) {
  const t = totaisDasContas(contas);
  const temAtraso = t.atrasadas > 0;
  const baixadas = contas.filter((c) => !emAberto(c)).length;
  const partes = [];
  if (t.pagar > 0) partes.push(`a pagar ${formatarMoeda(t.pagar)}`);
  if (t.receber > 0) partes.push(`a receber ${formatarMoeda(t.receber)}`);
  if (baixadas) partes.push(`${baixadas} já ${baixadas === 1 ? 'baixada' : 'baixadas'}`);
  if (assinaturas.length) partes.push(`${assinaturas.length} ${assinaturas.length === 1 ? 'assinatura' : 'assinaturas'}`);
  if (temAtraso) partes.push(`${t.atrasadas} atrasada${t.atrasadas > 1 ? 's' : ''}`);

  return (
    <button
      type="button"
      onClick={() => onSelecionar(dia)}
      aria-pressed={selecionado}
      aria-label={`Dia ${dia}${hoje ? ', hoje' : ''}${partes.length ? `: ${partes.join(', ')}` : ', sem vencimentos'}`}
      className={cn(
        'relative min-h-[5.75rem] w-full text-left rounded-xl p-2 border transition-colors flex flex-col gap-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selecionado ? 'border-primary/60 bg-primary/[0.08]' : temAtraso ? 'border-error/30 bg-error/[0.04] hover:bg-error/[0.08]' : 'border-transparent hover:bg-text-primary/[0.04] hover:border-border',
      )}
    >
      <span className="flex items-center justify-between">
        <span className={cn('grid place-items-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums', hoje ? 'bg-gradient-primary text-on-primary' : 'text-text-primary/75')}>{dia}</span>
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {temAtraso && <AlertTriangle className="w-3.5 h-3.5 text-error" />}
          {baixadas > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-income" />}
          {assinaturas.length > 0 && <Repeat className="w-3.5 h-3.5 text-primary/80" />}
        </span>
      </span>
      <span className="mt-auto space-y-0.5 text-[0.75rem] leading-tight tabular-nums" aria-hidden="true">
        {t.pagar > 0 && <span className="block truncate text-expense valor-privado">−{valorCurto(t.pagar)}</span>}
        {t.receber > 0 && <span className="block truncate text-income valor-privado">+{valorCurto(t.receber)}</span>}
      </span>
    </button>
  );
}

function ListaDoDia({ contas, assinaturas, onBaixar }) {
  if (!contas.length && !assinaturas.length) {
    return <p className="text-sm text-text-primary/60 py-6 text-center">Nenhum vencimento neste dia.</p>;
  }
  return (
    <ul className="space-y-2">
      {contas.map((c) => <li key={c.id}><ContaItem conta={c} onBaixar={onBaixar} /></li>)}
      {assinaturas.map((a) => <li key={`a-${a.id}`}><AssinaturaItem assinatura={a} /></li>)}
    </ul>
  );
}

export default function Calendario() {
  const { temPermissao } = useAuth();
  const reduzir = useReducedMotion();
  const [anoMes, setAnoMes, periodo] = useMesUrl();
  const [diaEscolhido, setDiaEscolhido] = useState(null);
  const [contaBaixa, setContaBaixa] = useState(null);
  const [ano, mesNum] = anoMes.split('-').map(Number);
  const mes = mesNum - 1;
  const podeAssinaturas = temPermissao('ASSINATURA_VISUALIZAR');

  const contasCarga = useCarga(
    () => contasApi.listar({ vencimentoInicio: periodo.inicio, vencimentoFim: periodo.fim, size: LIMITE_CONTAS_MES }).then((r) => r?.content ?? []),
    [periodo.inicio, periodo.fim],
    { inicial: [] },
  );
  const assinCarga = useCarga(() => assinaturasApi.listarAtivas(), ['assinaturas'], { ativo: podeAssinaturas, inicial: [] });

  const contasPorDia = useMemo(() => (contasCarga.dados ?? []).reduce((acc, c) => {
    const [a, m, d] = String(c.dataVencimento ?? '').split('-').map(Number);
    if (a !== ano || m !== mesNum) return acc;
    return { ...acc, [d]: [...(acc[d] ?? []), c] };
  }, {}), [contasCarga.dados, ano, mesNum]);

  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const assinPorDia = useMemo(() => (assinCarga.dados ?? []).filter((a) => a.ativa !== false).reduce((acc, a) => {
    const d = Math.min(Number(a.diaVencimento), ultimoDia);
    return { ...acc, [d]: [...(acc[d] ?? []), a] };
  }, {}), [assinCarga.dados, ultimoDia]);

  const totaisMes = useMemo(() => totaisDasContas(contasCarga.dados ?? []), [contasCarga.dados]);
  const hojeData = new Date();
  const ehMesAtual = hojeData.getFullYear() === ano && hojeData.getMonth() === mes;
  const diasComEventos = [...new Set([...Object.keys(contasPorDia), ...Object.keys(assinPorDia)].map(Number))].sort((a, b) => a - b);
  const diaPadrao = ehMesAtual ? hojeData.getDate() : (diasComEventos[0] ?? 1);
  const diaSelecionado = diaEscolhido && diaEscolhido <= ultimoDia ? diaEscolhido : diaPadrao;

  const mudarMes = (novo) => { setDiaEscolhido(null); setAnoMes(novo); };

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const celulas = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: ultimoDia }, (_, i) => i + 1)];
  const carregando = contasCarga.carregandoInicial;
  const dataSel = new Date(ano, mes, diaSelecionado);
  const contasSel = contasPorDia[diaSelecionado] ?? [];
  const assinSel = assinPorDia[diaSelecionado] ?? [];
  const totaisSel = totaisDasContas(contasSel);

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarDays} title="Calendário" subtitle="Vencimentos de contas e assinaturas, dia a dia." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSelector value={anoMes} onChange={mudarMes} label="Mês do calendário" />
        {totaisMes.atrasadas > 0 && (
          <Badge variant="error" size="md" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {totaisMes.atrasadas} {totaisMes.atrasadas === 1 ? 'conta atrasada' : 'contas atrasadas'} neste mês
          </Badge>
        )}
      </div>

      {contasCarga.erro && <AlertaErro compacto mensagem="Não deu para carregar as contas deste mês." onTentarNovamente={contasCarga.recarregar} />}

      <ResumoMes totais={totaisMes} carregando={carregando} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] gap-4 lg:gap-6 items-start">
        {/* Mês em grade (desktop) */}
        <Card className="hidden lg:flex" padding="sm" title={undefined}>
          <h2 className="sr-only">Mês em grade</h2>
          <div className="grid grid-cols-7 mb-1" aria-hidden="true">
            {DIAS_SEMANA.map((d) => (
              <span key={d} className="text-center text-xs font-semibold uppercase tracking-wider text-text-primary/55 py-2">{d}</span>
            ))}
          </div>
          <motion.div
            key={anoMes}
            className="grid grid-cols-7 gap-1"
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {celulas.map((dia, i) => (dia === null
              ? <span key={`v${i}`} aria-hidden="true" />
              : (
                <CelulaDia
                  key={dia}
                  dia={dia}
                  contas={contasPorDia[dia] ?? []}
                  assinaturas={assinPorDia[dia] ?? []}
                  hoje={ehMesAtual && dia === hojeData.getDate()}
                  selecionado={dia === diaSelecionado}
                  onSelecionar={setDiaEscolhido}
                />
              )))}
          </motion.div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border text-xs text-text-primary/70" aria-label="Legenda">
            <li className="flex items-center gap-1.5"><span className="text-expense font-semibold">−R$</span> a pagar em aberto</li>
            <li className="flex items-center gap-1.5"><span className="text-income font-semibold">+R$</span> a receber em aberto</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-income" aria-hidden="true" /> já baixada</li>
            <li className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-error" aria-hidden="true" /> atrasada</li>
            <li className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> assinatura (não entra nos totais)</li>
          </ul>
        </Card>

        {/* Detalhe do dia (desktop) */}
        <Card
          className="hidden lg:flex lg:sticky lg:top-24"
          title={`${dataSel.getDate()} de ${dataSel.toLocaleDateString('pt-BR', { month: 'long' })}`}
          subtitle={DIAS_SEMANA_LONGOS[dataSel.getDay()]}
          footer={(totaisSel.pagar > 0 || totaisSel.receber > 0) ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
              {totaisSel.pagar > 0 && <span>A pagar <strong className="text-expense valor-privado">−{formatarMoeda(totaisSel.pagar, { sinal: 'nunca' })}</strong></span>}
              {totaisSel.receber > 0 && <span>A receber <strong className="text-income valor-privado">+{formatarMoeda(totaisSel.receber, { sinal: 'nunca' })}</strong></span>}
            </div>
          ) : null}
        >
          <div aria-live="polite">
            <ListaDoDia contas={contasSel} assinaturas={assinSel} onBaixar={setContaBaixa} />
          </div>
        </Card>

        {/* Agenda (celular e tablet) */}
        <section className="lg:hidden space-y-5" aria-label="Agenda do mês">
          {carregando ? (
            <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl shimmer-bg" />)}</div>
          ) : diasComEventos.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nada vence neste mês" description="Quando houver contas ou assinaturas com vencimento neste mês, elas aparecem aqui por dia." />
          ) : (
            diasComEventos.map((dia) => {
              const data = new Date(ano, mes, dia);
              const hoje = ehMesAtual && dia === hojeData.getDate();
              const doDia = contasPorDia[dia] ?? [];
              const t = totaisDasContas(doDia);
              return (
                <div key={dia} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold sticky top-0 z-[1] bg-surface/90 backdrop-blur py-1.5">
                    <span className={cn('grid place-items-center w-8 h-8 rounded-full tabular-nums text-xs', hoje ? 'bg-gradient-primary text-on-primary' : 'bg-surface-medium')}>{pad(dia)}</span>
                    <span>{DIAS_SEMANA_LONGOS[data.getDay()].replace(/^./, (l) => l.toUpperCase())}</span>
                    {hoje && <Badge variant="primary" size="sm">Hoje</Badge>}
                    <span className="ml-auto flex gap-2 text-xs tabular-nums font-medium">
                      {t.pagar > 0 && <span className="text-expense valor-privado">−{valorCurto(t.pagar)}</span>}
                      {t.receber > 0 && <span className="text-income valor-privado">+{valorCurto(t.receber)}</span>}
                    </span>
                  </h3>
                  <ListaDoDia contas={doDia} assinaturas={assinPorDia[dia] ?? []} onBaixar={setContaBaixa} />
                </div>
              );
            })
          )}
        </section>
      </div>

      <BaixaRapidaModal
        key={contaBaixa?.id ?? 'nenhuma'}
        conta={contaBaixa}
        onClose={() => setContaBaixa(null)}
        onBaixada={contasCarga.recarregar}
      />
    </div>
  );
}

