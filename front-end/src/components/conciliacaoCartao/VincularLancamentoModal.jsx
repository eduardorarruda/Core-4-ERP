import React, { useEffect, useState } from 'react';
import { Search, Link, AlertTriangle } from 'lucide-react';
import { cartoes as cartoesApi } from '../../lib/api';
import { brl, formatDate } from '../../lib/formatters';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

export default function VincularLancamentoModal({ item, cartaoId, salvando = false, onConfirm, onClose }) {
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ignore = false;
    setCarregando(true);
    setErro('');
    cartoesApi.lancamentos.listar(cartaoId)
      .then((r) => { if (!ignore) setLista(Array.isArray(r) ? r : (r?.content ?? [])); })
      .catch((e) => { if (!ignore) setErro(e?.message || 'Não foi possível carregar os lançamentos. Tente novamente.'); })
      .finally(() => { if (!ignore) setCarregando(false); });
    return () => { ignore = true; };
  }, [cartaoId]);

  const valorOfxAbs = Math.abs(item.ofxValor);
  const filtrados = lista.filter((l) => {
    const txt = filtro.toLowerCase();
    return !txt || l.descricao?.toLowerCase().includes(txt) || String(l.valor).includes(txt);
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={(
        <span className="block">
          Vincular lançamento
          <span className="block text-xs font-normal text-text-primary/50 mt-0.5">
            OFX: {item.ofxMemo} — R$ {brl(valorOfxAbs)}
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

      <div className="max-h-[50dvh] md:max-h-72 overflow-y-auto no-scrollbar -mx-1 px-1">
        {carregando ? (
          <p className="text-center text-sm text-text-primary/40 py-8">Carregando...</p>
        ) : erro ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="w-6 h-6 text-error" />
            <p className="text-sm text-error px-4">{erro}</p>
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-sm text-text-primary/40 py-8">Nenhum lançamento encontrado</p>
        ) : (
          filtrados.map((l) => {
            const diff = Math.abs(parseFloat(l.valor) - valorOfxAbs);
            const proxima = diff <= 10;
            return (
              <button
                key={l.id}
                onClick={() => setSelecionado(l)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3 mb-1 min-h-11',
                  selecionado?.id === l.id
                    ? 'bg-primary/15 border border-primary/30'
                    : 'hover:bg-surface-medium border border-transparent'
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{l.descricao}</p>
                  <p className="text-xs text-text-primary/50">
                    {formatDate(l.dataCompra)}
                    {l.totalParcelas > 1 && ` · Parcela ${l.numeroParcela}/${l.totalParcelas}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {proxima && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">≈ valor</span>}
                  <span className="text-sm font-bold text-text-primary">R$ {brl(l.valor)}</span>
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
          disabled={!selecionado}
          leftIcon={<Link className="w-4 h-4" />}
          onClick={() => onConfirm(selecionado)}
          className="w-full sm:w-auto"
        >
          Vincular
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
