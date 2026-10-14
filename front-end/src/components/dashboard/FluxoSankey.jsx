import React, { useId, useMemo, useState } from 'react';
import { Sankey, ResponsiveContainer } from 'recharts';
import { motion, useReducedMotion } from 'motion/react';
import { Waypoints } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import GraficoAcessivel from '../ui/GraficoAcessivel';
import { CORES_GRAFICO } from '../../lib/chartTheme';
import { formatarMoeda, formatarNumero } from '../../lib/formatters';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * "De onde veio, para onde foi" (Sankey do Recharts 3 com nós e fitas próprios — portado do Fluxo).
 *
 * Esquerda: entradas recebidas no mês (+ "Coberto pelo saldo" quando as despesas passam das entradas).
 * Direita: as maiores categorias de despesa que vencem no mês + "Sobrou".
 * As fitas se desenham da esquerda para a direita; passar o mouse/focar um nó acende só o caminho dele.
 * No celular vira uma lista de barras (o Sankey não cabe em 360px com rótulos legíveis).
 *
 * Props: entradas (número), categorias [{ nome, valor }], carregando, className.
 */
const CORES_CATEGORIA = ['var(--color-chart-2)', 'var(--color-chart-5)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-6)'];
const COR_CENTRO = 'var(--color-silver)';

function montar(entradas, categorias) {
  const despesas = categorias.reduce((s, c) => s + c.valor, 0);
  const deficit = Math.max(0, despesas - entradas);
  const sobrou = Math.max(0, entradas - despesas);
  const origens = [
    { nome: 'Entradas do mês', valor: entradas, cor: CORES_GRAFICO.entrada, lado: 'origem' },
    ...(deficit > 0 ? [{ nome: 'Coberto pelo saldo', valor: deficit, cor: 'var(--color-warning)', lado: 'origem' }] : []),
  ].filter((o) => o.valor > 0);
  const destinos = [
    ...categorias.map((c, i) => ({ nome: c.nome, valor: c.valor, cor: CORES_CATEGORIA[i % CORES_CATEGORIA.length], lado: 'destino' })),
    ...(sobrou > 0 ? [{ nome: 'Sobrou', valor: sobrou, cor: CORES_GRAFICO.entrada, lado: 'destino' }] : []),
  ].filter((d) => d.valor > 0);
  const total = origens.reduce((s, o) => s + o.valor, 0);
  const nodes = [...origens, { nome: 'Seu mês', valor: total, cor: COR_CENTRO, lado: 'centro' }, ...destinos];
  const centro = origens.length;
  const links = [
    ...origens.map((o, i) => ({ source: i, target: centro, value: o.valor })),
    ...destinos.map((d, i) => ({ source: centro, target: centro + 1 + i, value: d.valor })),
  ];
  return { nodes, links, total, origens, destinos, sobrou, deficit };
}

function No({ x, y, width, height, payload, foco, setFoco, total }) {
  const ativo = foco == null || foco === payload.nome || payload.lado === 'centro';
  const direita = payload.lado === 'destino';
  const pct = total > 0 ? (payload.valor / total) * 100 : 0;
  const tx = direita ? x + width + 10 : x - 10;
  const anchor = direita ? 'start' : 'end';
  const ehCentro = payload.lado === 'centro';
  return (
    <g
      onPointerEnter={() => setFoco(payload.nome)}
      onPointerLeave={() => setFoco(null)}
      style={{ opacity: ativo ? 1 : 0.35, transition: 'opacity 200ms' }}
    >
      <rect x={x} y={y} width={width} height={Math.max(2, height)} rx={3} fill={payload.cor} />
      {!ehCentro && (
        <>
          <text x={tx} y={y + height / 2 - 7} textAnchor={anchor} dominantBaseline="middle" fill="var(--color-text-primary)" fontSize={13} fontWeight={600}>
            {payload.nome}
          </text>
          <text x={tx} y={y + height / 2 + 10} textAnchor={anchor} dominantBaseline="middle" fill="var(--color-chart-axis)" fontSize={12} className="tabular-nums">
            {formatarMoeda(payload.valor)} · {formatarNumero(pct, 'percent', { casas: 0 })}
          </text>
        </>
      )}
    </g>
  );
}

function Fita({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index, payload, foco, idBase, reduzir }) {
  const s = payload.source;
  const t = payload.target;
  const aceso = foco == null || foco === s.nome || foco === t.nome;
  const grad = `${idBase}-g${index}`;
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
  const atraso = (s.lado === 'origem' ? 0 : 0.45) + index * 0.05;
  return (
    <g>
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={sourceX} x2={targetX} y1={0} y2={0}>
          <stop offset="0" stopColor={s.cor} />
          <stop offset="1" stopColor={t.cor} />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth={Math.max(1, linkWidth)}
        initial={reduzir ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: aceso ? 0.5 : 0.08 }}
        transition={{ pathLength: { duration: 0.9, delay: atraso, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.2 } }}
      />
    </g>
  );
}

function ListaMobile({ itens, total }) {
  return (
    <ul className="space-y-3">
      {itens.map((d) => {
        const pct = total > 0 ? d.valor / total : 0;
        return (
          <li key={d.nome}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
              <span className="truncate text-text-primary/85">{d.nome}</span>
              <span className="tabular-nums font-medium valor-privado shrink-0">{formatarMoeda(d.valor)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-text-primary/[0.07] overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: d.cor }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function FluxoSankey({ entradas = 0, categorias = [], carregando = false, className }) {
  const reduzir = useReducedMotion();
  const largo = useMediaQuery('(min-width: 640px)');
  const idBase = `sk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [foco, setFoco] = useState(null);
  const modelo = useMemo(() => montar(Number(entradas) || 0, categorias), [entradas, categorias]);
  const vazio = modelo.total <= 0;

  const resumo = vazio
    ? 'Sem entradas nem despesas neste mês.'
    : `No mês entraram ${formatarMoeda(entradas)}. ${modelo.destinos.map((d) => `${d.nome}: ${formatarMoeda(d.valor)}`).join('; ')}.${modelo.deficit > 0 ? ` As despesas passaram das entradas em ${formatarMoeda(modelo.deficit)}, cobertos pelo saldo.` : ''}`;

  return (
    <Card
      className={className}
      loading={carregando}
      icon={Waypoints}
      title="De onde veio, para onde foi"
      subtitle="Entradas recebidas no mês e as maiores despesas que vencem no mês"
      footer={
        <p className="text-xs text-text-primary/60 leading-relaxed">
          As despesas contam pelo vencimento (pagas ou não) e mostram as 5 maiores categorias. Por isso o total pode
          ser diferente das saídas pagas no mês.
        </p>
      }
    >
      {vazio ? (
        <EmptyState compact icon={Waypoints} title="Nada para mostrar ainda" description="O fluxo aparece quando houver entradas ou despesas com vencimento neste mês." />
      ) : (
        <GraficoAcessivel
          resumo={resumo}
          tabela={{
            titulo: 'Fluxo do mês',
            colunas: ['De', 'Para', 'Valor'],
            linhas: [
              ...modelo.origens.map((o) => [o.nome, 'Seu mês', formatarMoeda(o.valor)]),
              ...modelo.destinos.map((d) => ['Seu mês', d.nome, formatarMoeda(d.valor)]),
            ],
          }}
        >
          {largo ? (
            <div className="h-[22rem] -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={{ nodes: modelo.nodes, links: modelo.links }}
                  nameKey="nome"
                  nodeWidth={10}
                  nodePadding={26}
                  linkCurvature={0.5}
                  iterations={0}
                  margin={{ top: 12, right: 170, bottom: 12, left: 150 }}
                  node={<No foco={foco} setFoco={setFoco} total={modelo.total} />}
                  link={<Fita foco={foco} idBase={idBase} reduzir={reduzir} />}
                />
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="c4-eyebrow mb-2">De onde veio</p>
                <ListaMobile itens={modelo.origens} total={modelo.total} />
              </div>
              <div>
                <p className="c4-eyebrow mb-2">Para onde foi</p>
                <ListaMobile itens={modelo.destinos} total={modelo.total} />
              </div>
            </div>
          )}
        </GraficoAcessivel>
      )}
    </Card>
  );
}
