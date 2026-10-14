import React, { useEffect, useState } from 'react';
import { Search, Link, AlertTriangle } from 'lucide-react';
import { contas as contasApi } from '../../lib/api';
import { brl, formatDate } from '../../lib/formatters';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { cn } from '../../lib/utils';

const LIMITE = 200;

export default function VincularContaModal({ item, salvando = false, onConfirm, onClose }) {
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [truncado, setTruncado] = useState(false);

  useEffect(() => {
    let ignore = false;
    setCarregando(true);
    setErro('');
    contasApi.listar({ size: LIMITE })
      .then((r) => {
        if (ignore) return;
        const todas = r.content ?? [];
        setLista(todas.filter((c) => c.status === 'PENDENTE' || c.status === 'ATRASADO'));
        setTruncado((r.totalElements ?? todas.length) > todas.length);
      })
      .catch((e) => {
        if (!ignore) setErro(e?.message || 'Não foi possível carregar as contas. Tente novamente.');
      })
      .finally(() => { if (!ignore) setCarregando(false); });
    return () => { ignore = true; };
  }, []);

  const valorOfxAbs = Math.abs(item.ofxValor);
  const filtradas = lista.filter((c) => {
    const txt = filtro.toLowerCase();
    return !txt || c.descricao?.toLowerCase().includes(txt) ||
      String(c.valorOriginal).includes(txt);
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={(
        <span className="block">
          Vincular conta
          <span className="block text-xs font-normal text-text-primary/50 mt-0.5">
            Transação: {item.ofxMemo} — R$ {brl(valorOfxAbs)}
          </span>
        </span>
      )}
    >
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
        <input
          autoFocus
          type="text"
          placeholder="Buscar por descrição ou valor..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full bg-surface-medium border border-text-primary/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/30 focus:outline-none focus:border-primary/40"
        />
      </div>

      {truncado && !erro && (
        <p className="flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          Mostrando as primeiras {LIMITE} contas em aberto. Use a busca para refinar se não encontrar a conta desejada.
        </p>
      )}

      <div className="max-h-[50dvh] md:max-h-72 overflow-y-auto no-scrollbar -mx-1 px-1">
        {carregando ? (
          <p className="text-center text-sm text-text-primary/40 py-8">Carregando...</p>
        ) : erro ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="w-6 h-6 text-error" />
            <p className="text-sm text-error px-4">{erro}</p>
          </div>
        ) : filtradas.length === 0 ? (
          <p className="text-center text-sm text-text-primary/40 py-8">Nenhuma conta em aberto encontrada</p>
        ) : (
          filtradas.map((c) => {
            const diff = Math.abs(parseFloat(c.valorOriginal) - valorOfxAbs);
            const proxima = diff <= 10;
            return (
              <button
                key={c.id}
                onClick={() => setSelecionada(c)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3 mb-1 min-h-11',
                  selecionada?.id === c.id
                    ? 'bg-primary/15 border border-primary/30'
                    : 'hover:bg-surface-medium border border-transparent'
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{c.descricao}</p>
                  <p className="text-xs text-text-primary/50">{formatDate(c.dataVencimento)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {proxima && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">≈ valor</span>}
                  <Badge variant={c.status === 'ATRASADO' ? 'error' : 'warning'} size="sm">{c.status}</Badge>
                  <span className="text-sm font-bold text-text-primary">R$ {brl(c.valorOriginal)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Modal.Footer className="flex-col-reverse sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          variant="primary"
          loading={salvando}
          disabled={!selecionada}
          leftIcon={<Link className="w-4 h-4" />}
          onClick={() => onConfirm(selecionada)}
          className="w-full sm:w-auto"
        >
          Vincular
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
