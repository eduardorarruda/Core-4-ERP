import React, { useState } from 'react';
import { ChevronRight, Gavel, History, RefreshCw, Sparkles } from 'lucide-react';
import { auditoria } from '../lib/api';
import { useCarga } from '../hooks/useCarga';
import { useAuth } from '../hooks/useAuth';
import { usePeriodoUrl } from '../hooks/usePeriodoUrl';
import PageHeader from '../components/ui/PageHeader';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import FilterBar from '../components/ui/FilterBar';
import { FormSelect } from '../components/ui/FormField';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import Skeleton from '../components/ui/Skeleton';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import {
  ACOES, diaDe, diferencas, entidadeComArtigo, horaDe, infoAcao, nomeEntidade, rotuloDia, rotuloRegistro,
} from '../components/configuracoes/auditoriaUtils';
import { cn } from '../lib/utils';

const TAMANHO_PAGINA = 25;
const ATALHOS = ['hoje', '7d', '30d', '90d', 'mes', 'ano'];

const quem = (evento, meuId) => {
  if (evento.usuarioId == null) return 'O sistema';
  if (evento.usuarioId === meuId) return 'Você';
  return `Usuário nº ${evento.usuarioId}`;
};

function frase(evento, meuId) {
  const acao = infoAcao(evento.acao);
  const { nome, id } = rotuloRegistro(evento);
  let alvo = entidadeComArtigo(evento.entidade);
  if (evento.acao === 'TRANSFERIR') alvo = 'contas bancárias';
  else if (/^(deu baixa em|estornou a baixa de|fechou a fatura de)$/.test(acao.verbo)) alvo = alvo.replace(/^(a|o) /, (m) => (m === 'a ' ? 'uma ' : 'um '));
  if (!nome && id != null && evento.acao !== 'TRANSFERIR') alvo = `${alvo} nº ${id}`;
  return { autor: quem(evento, meuId), verbo: acao.verbo, alvo, nome, entidade: nomeEntidade(evento.entidade) };
}

function LinhaEvento({ evento, meuId, onAbrir }) {
  const acao = infoAcao(evento.acao);
  const Icone = acao.icon;
  const f = frase(evento, meuId);
  return (
    <button
      type="button"
      onClick={() => onAbrir(evento)}
      className="group w-full flex items-start gap-3 text-left px-3 py-3 rounded-xl hover:bg-surface-medium/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="relative mt-0.5 grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-surface-medium ring-1 ring-border text-text-primary/80" aria-hidden="true">
        <Icone className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block min-w-0 break-words text-sm text-text-primary leading-relaxed">
          <strong className="font-semibold">{f.autor}</strong> {f.verbo} {f.alvo}
          {f.nome && <> <span className="font-medium">“{f.nome}”</span></>}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant={acao.tom} size="sm">{acao.rotulo}</Badge>
          {evento.aiAction && <Badge variant="primary" size="sm"><Sparkles className="w-3 h-3" aria-hidden="true" /> Pela Áurea</Badge>}
          <span className="text-xs text-text-primary/60 tabular-nums">{horaDe(evento.timestamp)}</span>
        </span>
      </span>
      <ChevronRight className="w-4 h-4 mt-2.5 shrink-0 text-text-primary/40 group-hover:text-text-primary/70" aria-hidden="true" />
    </button>
  );
}

function DetalheEvento({ evento, meuId, onClose }) {
  const acao = infoAcao(evento?.acao);
  const f = evento ? frase(evento, meuId) : null;
  const { id } = evento ? rotuloRegistro(evento) : {};
  const difs = evento ? diferencas(evento) : [];
  const criacaoOuExclusao = evento && (evento.acao === 'CRIAR' || evento.acao === 'DELETAR');
  return (
    <Drawer
      open={Boolean(evento)}
      onClose={onClose}
      title={acao.rotulo}
      description={evento ? new Date(evento.timestamp).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' }) : undefined}
    >
      {evento && (
        <div className="space-y-5">
          <p className="text-sm text-text-primary leading-relaxed">
            <strong>{f.autor}</strong> {f.verbo} {f.alvo}{f.nome ? <> “{f.nome}”</> : null}.
            {evento.aiAction && ' A ação foi feita pela Áurea, a pedido dessa pessoa.'}
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm rounded-xl border border-border p-4">
            <div><dt className="c4-eyebrow mb-0.5">Quem</dt><dd className="text-text-primary">{f.autor}</dd></div>
            <div><dt className="c4-eyebrow mb-0.5">Origem</dt><dd className="text-text-primary">{evento.aiAction ? 'Áurea (assistente)' : 'Tela do sistema'}</dd></div>
            <div><dt className="c4-eyebrow mb-0.5">Registro</dt><dd className="text-text-primary first-letter:uppercase">{f.entidade}{id != null ? ` nº ${id}` : ''}</dd></div>
            <div><dt className="c4-eyebrow mb-0.5">Endereço IP</dt><dd className="font-mono text-text-primary/80">{evento.ipAddress ?? '—'}</dd></div>
            <div className="col-span-2"><dt className="c4-eyebrow mb-0.5">Código da requisição</dt><dd className="font-mono text-xs text-text-primary/70 break-all">{evento.requestId ?? '—'}</dd></div>
          </dl>

          <section aria-labelledby="aud-mudancas">
            <h3 id="aud-mudancas" className="text-sm font-semibold text-text-primary mb-2">
              {criacaoOuExclusao ? 'Dados do registro' : 'O que mudou'}
            </h3>
            {difs.length === 0 ? (
              <p className="text-sm text-text-primary/65">Nenhum detalhe foi guardado para este evento.</p>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Campos do registro antes e depois</caption>
                  <thead className="bg-surface-medium/70">
                    <tr>
                      <th scope="col" className="text-left px-3 py-2 font-semibold">Campo</th>
                      {!criacaoOuExclusao && <th scope="col" className="text-left px-3 py-2 font-semibold">Antes</th>}
                      <th scope="col" className="text-left px-3 py-2 font-semibold">{criacaoOuExclusao ? 'Valor' : 'Depois'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {difs.map((d) => (
                      <tr key={d.chave} className="border-t border-border align-top">
                        <th scope="row" className="text-left px-3 py-2 font-medium text-text-primary/80">{d.campo}</th>
                        {!criacaoOuExclusao && <td className="px-3 py-2 text-text-primary/70 break-words">{d.antes}</td>}
                        <td className="px-3 py-2 text-text-primary break-words">{evento.acao === 'DELETAR' ? d.antes : d.depois}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function Audit() {
  const { usuario } = useAuth();
  const [periodo, setPeriodo] = usePeriodoUrl('30d');
  const [acao, setAcao] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

  // A página volta para a 1ª sempre que um filtro do servidor muda (derivado, sem efeito)
  const chaveFiltros = `${periodo.inicio}|${periodo.fim}|${acao}`;
  const [pag, setPag] = useState({ chave: chaveFiltros, n: 0 });
  const page = pag.chave === chaveFiltros ? pag.n : 0;

  const { dados, erro, carregando, recarregar } = useCarga(
    () => auditoria.listar({ acao: acao || undefined, dataInicio: periodo.inicio, dataFim: periodo.fim, page, size: TAMANHO_PAGINA }),
    [acao, periodo.inicio, periodo.fim, page],
  );

  const eventos = dados?.content ?? [];
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? eventos.filter((e) => {
      const f = frase(e, usuario?.id);
      return [f.autor, f.verbo, f.alvo, f.nome, infoAcao(e.acao).rotulo, e.ipAddress].some((t) => (t || '').toLowerCase().includes(termo));
    })
    : eventos;

  const grupos = [];
  filtrados.forEach((e) => {
    const dia = diaDe(e.timestamp);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.itens.push(e);
    else grupos.push({ dia, itens: [e] });
  });

  const filtrosAtivos = (acao ? 1 : 0) + (termo ? 1 : 0);
  const limpar = () => { setAcao(''); setBusca(''); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Quem fez o quê e quando."
        icon={Gavel}
        actions={(
          <Button variant="secondary" onClick={recarregar} loading={carregando && Boolean(dados)} leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}>
            Atualizar
          </Button>
        )}
      />

      <FilterBar
        busca={{ value: busca, onChange: setBusca, placeholder: 'Buscar nesta página', label: 'Buscar nos eventos desta página' }}
        periodo={<PeriodoSelector value={periodo} onChange={setPeriodo} granularidade="dia" atalhos={ATALHOS} label="Período" />}
        filtrosAtivos={filtrosAtivos}
        onLimpar={limpar}
      >
        <label className="flex items-center gap-2">
          <span className="sr-only md:not-sr-only text-sm text-text-primary/70 whitespace-nowrap">Tipo de ação</span>
          <FormSelect value={acao} onChange={(e) => setAcao(e.target.value)} className="min-w-44">
            <option value="">Todas as ações</option>
            {Object.entries(ACOES).map(([valor, a]) => <option key={valor} value={valor}>{a.rotulo}</option>)}
          </FormSelect>
        </label>
      </FilterBar>

      {erro && <AlertaErro mensagem={erro.message} onTentarNovamente={recarregar} />}

      <section aria-label="Eventos de auditoria" className="c4-card p-2 sm:p-3">
        {carregando && !dados ? (
          <div className="space-y-2 p-2" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            compact
            icon={History}
            title={termo ? 'Nada com essa busca nesta página' : 'Nenhum evento neste período'}
            description={termo ? 'A busca olha só os eventos já carregados. Troque de página ou limpe a busca.' : 'Amplie o período ou escolha “Todas as ações” para ver mais.'}
          />
        ) : (
          <div className={cn('space-y-4 transition-opacity', carregando && 'opacity-60')} aria-busy={carregando || undefined}>
            {grupos.map((g) => (
              <section key={g.dia} aria-labelledby={`dia-${g.dia}`}>
                <h2 id={`dia-${g.dia}`} className="sticky top-0 z-[1] px-3 py-1.5 c4-eyebrow first-letter:uppercase bg-surface-low/90 backdrop-blur-sm rounded-lg">
                  {rotuloDia(g.dia)}
                </h2>
                <Stagger as="ul" className="mt-1 relative before:absolute before:left-[2.05rem] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {g.itens.map((e) => (
                    <StaggerItem as="li" key={e.id} className="relative">
                      <LinhaEvento evento={e} meuId={usuario?.id} onAbrir={setAberto} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            ))}
          </div>
        )}
      </section>

      {dados && (
        <Pagination
          page={page}
          totalPages={dados.totalPages ?? 0}
          totalElements={dados.totalElements ?? 0}
          onChange={(n) => setPag({ chave: chaveFiltros, n })}
        />
      )}

      <DetalheEvento evento={aberto} meuId={usuario?.id} onClose={() => setAberto(null)} />
    </div>
  );
}
