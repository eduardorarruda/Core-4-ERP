import React, { useEffect, useState } from 'react';
import { Search, X, Link } from 'lucide-react';
import { contas as contasApi } from '../../lib/api';
import { brl, formatDate } from '../../lib/formatters';
import Badge from '../ui/Badge';
import { cn } from '../../lib/utils';

export default function VincularContaModal({ item, onConfirm, onClose }) {
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    contasApi.listar({ size: 200 })
      .then((r) => setLista((r.content ?? []).filter((c) => c.status === 'PENDENTE' || c.status === 'ATRASADO')))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const valorOfxAbs = Math.abs(item.ofxValor);
  const filtradas = lista.filter((c) => {
    const txt = filtro.toLowerCase();
    return !txt || c.descricao?.toLowerCase().includes(txt) ||
      String(c.valorOriginal).includes(txt);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl border border-text-primary/10 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-text-primary/5">
          <div>
            <h2 className="font-bold text-text-primary">Vincular conta</h2>
            <p className="text-xs text-text-primary/50 mt-0.5">
              Transação: {item.ofxMemo} — R$ {brl(valorOfxAbs)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-primary/40 hover:text-error hover:bg-error/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-text-primary/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar por descrição ou valor..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full bg-surface-medium border border-text-primary/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-primary/30 focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto no-scrollbar px-2 py-2">
          {carregando ? (
            <p className="text-center text-sm text-text-primary/40 py-8">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-sm text-text-primary/40 py-8">Nenhuma conta encontrada</p>
          ) : (
            filtradas.map((c) => {
              const diff = Math.abs(parseFloat(c.valorOriginal) - valorOfxAbs);
              const proxima = diff <= 10;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelecionada(c)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3 mb-1',
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

        <div className="px-6 py-4 border-t border-text-primary/5 flex gap-3">
          <button
            disabled={!selecionada}
            onClick={() => onConfirm(selecionada)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Link className="w-4 h-4" /> Vincular
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-widest">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
