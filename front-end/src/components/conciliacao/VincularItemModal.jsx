import React, { useId, useMemo, useState } from 'react';
import { Search, Link2, TriangleAlert, Equal, CalendarClock } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { FormInput } from '../ui/FormField';
import Skeleton from '../ui/Skeleton';
import { useCarga } from '../../hooks/useCarga';
import { cn } from '../../lib/utils';
import { formatDate, formatarMoeda } from '../../lib/formatters';
import { ValorOfx } from './ItemPartes';

/** Diferença máxima (R$) para marcar "valor igual". */
const TOLERANCIA_VALOR = 0.01;

function ordenarPorProximidade(lista, alvo) {
  return [...lista].sort((a, b) => Math.abs(a.valor - alvo) - Math.abs(b.valor - alvo));
}

function Candidato({ c, selecionado, valorAlvo, onSelecionar, nome }) {
  const igual = Math.abs(c.valor - valorAlvo) <= TOLERANCIA_VALOR;
  return (
    <li>
      <label
        className={cn(
          'flex items-center gap-3 min-h-11 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
          selecionado ? 'border-primary/40 bg-primary/[0.10]' : 'border-transparent hover:bg-text-primary/[0.04]'
        )}
      >
        <input
          type="radio"
          name={nome}
          value={c.id}
          checked={selecionado}
          onChange={() => onSelecionar(c)}
          className="w-4 h-4 accent-[var(--color-primary)] shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary break-words">{c.descricao}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-text-primary/65">
            {c.data && <span>{formatDate(c.data)}</span>}
            {c.detalhe && (
              <span className={cn('inline-flex items-center gap-1', c.atrasado && 'text-error')}>
                {c.atrasado && <CalendarClock className="w-3 h-3" aria-hidden="true" />}
                {c.detalhe}
              </span>
            )}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-semibold tabular-nums text-text-primary valor-privado">{formatarMoeda(c.valor)}</span>
          {igual && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Equal className="w-3 h-3" aria-hidden="true" /> Valor igual
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

/**
 * "Vincular" de um item do extrato — o mesmo modal para conta (banco) e lançamento (cartão).
 * Os candidatos vêm de `cfg.buscarCandidatos(sessao)`; os de valor mais próximo aparecem primeiro.
 *
 * Props: cfg, sessao, item, salvando, onConfirmar(candidato), onFechar.
 */
export default function VincularItemModal({ cfg, sessao, item, salvando = false, onConfirmar, onFechar }) {
  const nome = useId();
  const buscaId = useId();
  const [filtro, setFiltro] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const { dados, erro, carregando, recarregar } = useCarga(() => cfg.buscarCandidatos(sessao), [cfg.id, sessao.id]);

  const valorAlvo = Math.abs(Number(item.ofxValor) || 0);
  const filtrados = useMemo(() => {
    const txt = filtro.trim().toLowerCase();
    const base = (dados?.itens ?? []).filter((c) => !txt
      || c.descricao?.toLowerCase().includes(txt)
      || String(c.valor).includes(txt.replace(',', '.')));
    return ordenarPorProximidade(base, valorAlvo);
  }, [dados, filtro, valorAlvo]);

  return (
    <Modal
      open
      onClose={onFechar}
      size="lg"
      icon={Link2}
      title={cfg.vinculo.vincularTitulo}
      description={(
        <span className="flex flex-wrap items-center gap-x-2">
          <span className="break-words">{cfg.descricaoOfx(item) || 'Movimento do extrato'}</span>
          <ValorOfx valor={item.ofxValor} />
          {item.ofxData && <span>· {formatDate(item.ofxData)}</span>}
        </span>
      )}
    >
      <div className="relative mb-3">
        <label htmlFor={buscaId} className="sr-only">Buscar por descrição ou valor</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/50 pointer-events-none" aria-hidden="true" />
        <FormInput
          id={buscaId}
          type="search"
          placeholder="Buscar por descrição ou valor"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {dados?.truncado && !erro && (
        <p className="flex items-start gap-2 text-xs text-text-primary/80 bg-warning/[0.08] border border-warning/25 rounded-xl px-3 py-2 mb-3">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-px text-warning" aria-hidden="true" />
          Mostrando as primeiras {dados.limite} contas em aberto. Use a busca se não achar a que procura.
        </p>
      )}

      <div className="max-h-[50dvh] md:max-h-80 overflow-y-auto -mx-1 px-1" aria-live="polite" aria-busy={carregando || undefined}>
        {carregando && !dados && (
          <div className="space-y-2" aria-label="Carregando">
            {[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-12 w-full" />)}
          </div>
        )}
        {erro && (
          <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <TriangleAlert className="w-6 h-6 text-error" aria-hidden="true" />
            <p className="text-sm text-text-primary/80 px-4">{erro.message || 'Não foi possível carregar a lista.'}</p>
            <Button variant="secondary" size="sm" onClick={recarregar}>Tentar novamente</Button>
          </div>
        )}
        {!erro && dados && filtrados.length === 0 && (
          <p className="text-center text-sm text-text-primary/65 py-8">{filtro ? 'Nada encontrado com essa busca.' : cfg.vinculo.vazio}</p>
        )}
        {!erro && filtrados.length > 0 && (
          <fieldset>
            <legend className="sr-only">Escolha {cfg.vinculo.artigo} {cfg.vinculo.singular}</legend>
            <ul className="space-y-1">
              {filtrados.map((c) => (
                <Candidato
                  key={c.id}
                  c={c}
                  nome={nome}
                  valorAlvo={valorAlvo}
                  selecionado={selecionado?.id === c.id}
                  onSelecionar={setSelecionado}
                />
              ))}
            </ul>
          </fieldset>
        )}
      </div>

      <Modal.Footer className="flex-col-reverse sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onFechar} className="w-full sm:w-auto">Cancelar</Button>
        <Button
          loading={salvando}
          disabled={!selecionado}
          leftIcon={<Link2 className="w-4 h-4" aria-hidden="true" />}
          onClick={() => onConfirmar(selecionado)}
          className="w-full sm:w-auto"
        >
          Vincular
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
