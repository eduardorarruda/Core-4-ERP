import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { notificacoes as api } from '../lib/api';

export default function Notificacoes() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); } catch (e) { setErro(e.message); }
  }

  async function marcar(id) {
    try { await api.marcarLida(id); setLista(l => l.filter(n => n.id !== id)); }
    catch (e) { setErro(e.message); }
  }

  async function sincronizar() {
    setCarregando(true); setMsg(''); setErro('');
    try { await api.sincronizar(); await carregar(); setMsg('Sincronização concluída!'); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  const TIPO_STYLE = { VENCIMENTO: 'border-l-4 border-red-500', FATURA: 'border-l-4 border-orange-500' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Bell className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold text-white">Notificações</h1></div>
        <button onClick={sincronizar} disabled={carregando} className="flex items-center gap-2 border border-white/10 text-zinc-300 px-4 py-2 rounded-xl hover:bg-white/5 text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} /> Sincronizar
        </button>
      </div>

      {erro && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erro}</p>}
      {msg && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-2">{msg}</p>}

      <div className="space-y-3">
        {lista.map(n => (
          <div key={n.id} className={`bg-surface-low rounded-2xl p-5 flex items-start justify-between gap-4 ${TIPO_STYLE[n.tipo] || ''}`}>
            <div>
              <p className="text-white text-sm">{n.mensagem}</p>
              <p className="text-xs text-zinc-500 mt-1">{new Date(n.dataCriacao).toLocaleString('pt-BR')} · <span className="font-bold">{n.tipo}</span></p>
            </div>
            <button onClick={() => marcar(n.id)} title="Marcar como lida" className="text-zinc-400 hover:text-green-400 shrink-0">
              <CheckCheck className="w-5 h-5" />
            </button>
          </div>
        ))}
        {lista.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Sem notificações não lidas</p>
          </div>
        )}
      </div>
    </div>
  );
}
