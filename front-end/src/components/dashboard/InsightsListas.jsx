import React from 'react';
import { AlertOctagon, AlertTriangle, CreditCard, Flame, Info, Receipt, Sparkles, Telescope, ThumbsUp } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { Delta } from '../ui/KpiCard';
import { AnimatedNumber, Stagger, StaggerItem } from '../motion/Movimento';
import IconeCategoria from './IconeCategoria';
import { formatarMoeda, formatarNumero } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { diaMesCurto } from './datasVisaoGeral';

/** Partes de texto/lista da tela Insights (frases, fora do normal, maiores gastos, projeção). */

const TIPO_FRASE = {
  ALERTA: { Icone: AlertOctagon, cor: 'var(--color-expense)', rotulo: 'Alerta' },
  ATENCAO: { Icone: AlertTriangle, cor: 'var(--color-warning)', rotulo: 'Atenção' },
  POSITIVO: { Icone: ThumbsUp, cor: 'var(--color-income)', rotulo: 'Boa notícia' },
  INFO: { Icone: Info, cor: 'var(--color-info)', rotulo: 'Informação' },
};

export function FrasesInsight({ frases = [], className }) {
  return (
    <Card className={className} destaque icon={Sparkles} title="O que chama atenção" subtitle="Leituras automáticas a partir dos seus números — sem IA, só contas.">
      {frases.length === 0 ? (
        <p className="text-sm text-text-primary/65">Ainda não há movimento suficiente neste mês para tirar conclusões.</p>
      ) : (
        <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
          {frases.map((f, i) => {
            const t = TIPO_FRASE[f.tipo] ?? TIPO_FRASE.INFO;
            return (
              <StaggerItem as="li" key={`${f.tipo}-${i}`} className="flex items-start gap-3 rounded-2xl border border-border bg-surface-medium/40 p-3.5">
                <span
                  aria-hidden="true"
                  className="grid place-items-center w-9 h-9 rounded-xl shrink-0 border"
                  style={{ color: t.cor, background: `color-mix(in srgb, ${t.cor} 14%, transparent)`, borderColor: `color-mix(in srgb, ${t.cor} 24%, transparent)` }}
                >
                  <t.Icone className="w-[1.125rem] h-[1.125rem]" />
                </span>
                <p className="text-sm leading-relaxed text-text-primary/90 pt-1.5">
                  <span className="sr-only">{t.rotulo}: </span>{f.texto}
                </p>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </Card>
  );
}

export function ProjecaoMes({ projecao, diasNoMes, diaReferencia, className }) {
  const p = projecao ?? {};
  const restantes = Math.max(0, Number(diasNoMes ?? 0) - Number(diaReferencia ?? 0));
  const variavel = Number(p.ritmoDiario ?? 0) * restantes;
  const encerrado = Boolean(p.mesEncerrado);
  return (
    <Card className={className} icon={Telescope} title={encerrado ? 'Como o mês fechou' : 'Projeção do mês'} subtitle={encerrado ? 'Total gasto no mês.' : 'Onde o gasto deve fechar se o ritmo continuar.'}>
      <div className="space-y-4">
        <div>
          <AnimatedNumber value={p.valorProjetado} className="font-display text-3xl font-semibold" />
          {p.variacaoVsMesAnterior != null && (
            <p className="mt-1.5 flex items-center gap-2 text-xs text-text-primary/65">
              <Delta variacao={Number(p.variacaoVsMesAnterior)} inverter />
              <span>vs. {formatarMoeda(p.totalMesAnterior)} no mês anterior</span>
            </p>
          )}
        </div>
        {!encerrado && (
          <dl className="divide-y divide-border text-sm">
            <div className="flex justify-between gap-3 py-2"><dt className="text-text-primary/70">Já gasto até hoje</dt><dd className="tabular-nums font-medium valor-privado">{formatarMoeda(p.gastoAteHoje)}</dd></div>
            <div className="flex justify-between gap-3 py-2"><dt className="text-text-primary/70">Contas que ainda vencem</dt><dd className="tabular-nums font-medium valor-privado">{formatarMoeda(p.agendadoRestante)}</dd></div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-text-primary/70">Cartão no ritmo atual <span className="block text-xs text-text-primary/55">{formatarMoeda(p.ritmoDiario)}/dia × {restantes} dias</span></dt>
              <dd className="tabular-nums font-medium valor-privado">{formatarMoeda(variavel)}</dd>
            </div>
          </dl>
        )}
      </div>
    </Card>
  );
}

export function ForaDoNormal({ categorias = [], className }) {
  return (
    <Card className={className} icon={Flame} title="Fora do normal" subtitle="Categorias bem acima da média dos 3 meses anteriores">
      {categorias.length === 0 ? (
        <EmptyState compact tom="income" icon={ThumbsUp} title="Tudo dentro do normal" description="Nenhuma categoria passou 20% (e R$ 50) da sua média deste mês." />
      ) : (
        <ul className="divide-y divide-border">
          {categorias.map((c, i) => (
            <li key={c.categoriaId ?? c.descricao} className="flex items-center gap-3 py-2.5">
              <IconeCategoria nome={c.icone} tamanho="sm" cor={`var(--color-chart-${(i % 5) + 2})`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.descricao}</p>
                <p className="text-xs text-text-primary/60 tabular-nums">
                  {c.tipo === 'NOVA' ? 'Sem gasto nos 3 meses anteriores' : <>Média: <span className="valor-privado">{formatarMoeda(c.media3Meses)}</span></>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums valor-privado">{formatarMoeda(c.atual)}</p>
                {c.tipo === 'NOVA'
                  ? <Badge variant="info" size="sm">Nova</Badge>
                  : <Badge variant="expense" size="sm">+{formatarNumero(Number(c.variacaoPercentual ?? 0), 'percent', { casas: 0 })}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function MaioresGastos({ gastos = [], className }) {
  return (
    <Card className={className} icon={Receipt} title="Maiores gastos do mês" subtitle="Contas a pagar e compras no cartão">
      {gastos.length === 0 ? (
        <p className="text-sm text-text-primary/65">Nenhum gasto neste mês ainda.</p>
      ) : (
        <ol className="divide-y divide-border">
          {gastos.map((g, i) => (
            <li key={`${g.descricao}-${i}`} className="flex items-center gap-3 py-2.5">
              <span aria-hidden="true" className="w-6 text-center font-display text-sm font-semibold text-text-primary/45 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{g.descricao}</p>
                <p className="text-xs text-text-primary/60 truncate flex items-center gap-1">
                  {g.origem === 'CARTAO' ? <CreditCard className="w-3 h-3 shrink-0" aria-hidden="true" /> : <Receipt className="w-3 h-3 shrink-0" aria-hidden="true" />}
                  {g.origem === 'CARTAO' ? 'Cartão' : 'Conta'} · {diaMesCurto(g.data)}{g.categoria ? ` · ${g.categoria}` : ''}
                </p>
              </div>
              <span className={cn('text-sm font-semibold tabular-nums text-expense shrink-0 valor-privado')}>−{formatarMoeda(g.valor, { sinal: 'nunca' })}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
