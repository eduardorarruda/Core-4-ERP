import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Upload, Loader2, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { conciliacaoCartao as api, cartoes as cartoesApi } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import OfxCartaoUploadZone from '../components/conciliacaoCartao/OfxCartaoUploadZone';
import ConciliacaoCartaoItemRow from '../components/conciliacaoCartao/ConciliacaoCartaoItemRow';
import Badge from '../components/ui/Badge';
import FormField, { inputCls } from '../components/ui/FormField';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { brl } from '../lib/formatters';
import { cn } from '../lib/utils';

const FILTROS = ['Todos', 'SUGERIDO', 'NAO_IDENTIFICADO', 'IGNORADO', 'VINCULADO_MANUALMENTE', 'BAIXADO'];

const FILTRO_LABEL = {
  Todos: 'Todos', SUGERIDO: 'Sugeridos', NAO_IDENTIFICADO: 'Não identificados',
  IGNORADO: 'Ignorados', VINCULADO_MANUALMENTE: 'Manuais', BAIXADO: 'Baixados',
};

const FILTRO_VARIANT = {
  Todos: 'neutral', SUGERIDO: 'warning', NAO_IDENTIFICADO: 'error',
  IGNORADO: 'neutral', VINCULADO_MANUALMENTE: 'info', BAIXADO: 'success',
};

export default function ConciliacaoCartao() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { id: sessionId } = useParams();

  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [loadingSessao, setLoadingSessao] = useState(false);

  const [mostrarSelecaoCartao, setMostrarSelecaoCartao] = useState(false);
  const [acctIdNaoEncontrado, setAcctIdNaoEncontrado] = useState('');
  const [cartoes, setCartoes] = useState([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState('');

  const [sessao, setSessao] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let ignore = false;
    setLoadingSessao(true);
    api.buscar(sessionId)
      .then((resultado) => { if (!ignore) setSessao(resultado); })
      .catch((e) => { if (!ignore) toast.error(e.message); })
      .finally(() => { if (!ignore) setLoadingSessao(false); });
    return () => { ignore = true; };
  }, [sessionId]);

  async function enviarArquivo(cartaoId) {
    if (!arquivo) { toast.error('Selecione um arquivo .ofx'); return; }
    setEnviando(true);
    try {
      const resultado = await api.upload(arquivo, cartaoId || null);
      setSessao(resultado);
      setMostrarSelecaoCartao(false);
    } catch (e) {
      if (e.message?.startsWith('CARTAO_NAO_ENCONTRADO:')) {
        const acctId = e.message.split(':')[1];
        setAcctIdNaoEncontrado(acctId);
        const lista = await cartoesApi.listar().catch(() => []);
        setCartoes(lista);
        setMostrarSelecaoCartao(true);
      } else {
        toast.error(e.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  async function finalizar() {
    const itens = sessao.itens ?? [];
    const baixar = itens.filter((i) => i.statusItem === 'SUGERIDO' || i.statusItem === 'VINCULADO_MANUALMENTE').length;
    const pendentes = itens.filter((i) => i.statusItem === 'NAO_IDENTIFICADO').length;
    const ignorados = itens.filter((i) => i.statusItem === 'IGNORADO').length;

    const ok = await confirm({
      title: 'Confirmar Conciliação',
      message: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-primary"><CheckCircle2 className="w-4 h-4" /> <span>{baixar} lançamento(s) serão confirmados</span></div>
          {ignorados > 0 && <div className="flex items-center gap-2 text-text-primary/60"><span>⚪ {ignorados} transação(ões) ignoradas</span></div>}
          {pendentes > 0 && <div className="flex items-center gap-2 text-error"><AlertTriangle className="w-4 h-4" /> <span>{pendentes} transação(ões) sem vínculo</span></div>}
        </div>
      ),
      confirmLabel: 'Finalizar',
    });
    if (!ok) return;

    setFinalizando(true);
    try {
      await api.finalizar(sessao.id, {});
      toast.success('Conciliação finalizada!');
      navigate(`/cartoes/conciliacao/${sessao.id}/relatorio`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFinalizando(false);
    }
  }

  async function cancelar() {
    const ok = await confirm({
      title: 'Cancelar conciliação',
      message: 'Deseja cancelar esta sessão? Os dados serão descartados.',
      confirmLabel: 'Cancelar sessão',
      variant: 'error',
    });
    if (!ok) return;
    setCancelando(true);
    try {
      await api.cancelar(sessao.id);
      setSessao(null);
      setArquivo(null);
      toast.success('Sessão cancelada');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelando(false);
    }
  }

  function onItemUpdate(atualizado) {
    setSessao((s) => ({
      ...s,
      itens: s.itens.map((i) => i.id === atualizado.id ? atualizado : i),
    }));
  }

  const itensFiltrados = (sessao?.itens ?? []).filter((i) =>
    filtroAtivo === 'Todos' || i.statusItem === filtroAtivo
  );

  const podeFinalizar = sessao && sessao.status === 'PENDENTE';
  const totalNaoId = (sessao?.itens ?? []).filter((i) => i.statusItem === 'NAO_IDENTIFICADO').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliação de Cartão"
        subtitle="Importe um arquivo OFX de cartão e reconcilie com seus lançamentos"
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <button
            onClick={() => navigate('/cartoes/conciliacao/historico')}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/60 hover:text-text-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            <History className="w-4 h-4" /> Histórico
          </button>
        }
      />

      {!sessao && loadingSessao && (
        <div className="flex items-center justify-center py-20 gap-3 text-text-primary/40">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando sessão...</span>
        </div>
      )}

      {!sessao && !loadingSessao && sessionId && (
        <p className="text-center text-sm text-text-primary/40 py-20">
          Sessão não encontrada.{' '}
          <button onClick={() => navigate('/cartoes/conciliacao/historico')} className="text-primary hover:underline font-bold">
            Ver histórico
          </button>
        </p>
      )}

      {!sessao && !sessionId && (
        <div className="rounded-[18px] p-6 space-y-4" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.2)' }}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">1. Selecione o arquivo OFX do cartão</h2>
          <OfxCartaoUploadZone onFile={setArquivo} />

          {mostrarSelecaoCartao && (
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-400">
                  Cartão com ID <strong>{acctIdNaoEncontrado}</strong> não encontrado. Selecione qual cartão corresponde:
                </p>
              </div>
              <FormField label="Cartão de Crédito">
                <select
                  className={`${inputCls} appearance-none`}
                  value={cartaoSelecionado}
                  onChange={(e) => setCartaoSelecionado(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {cartoes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          <button
            onClick={() => enviarArquivo(mostrarSelecaoCartao ? cartaoSelecionado : null)}
            disabled={!arquivo || enviando || (mostrarSelecaoCartao && !cartaoSelecionado)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {enviando ? 'Processando...' : mostrarSelecaoCartao ? 'Tentar novamente' : 'Processar arquivo'}
          </button>
        </div>
      )}

      {sessao && (
        <div className="space-y-4">
          <div className="rounded-[18px] p-6" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-text-primary">{sessao.cartaoCreditoNome}</h2>
                <p className="text-sm text-text-primary/50 mt-1">
                  {sessao.dataInicioOfx && sessao.dataFimOfx
                    ? `Período: ${sessao.dataInicioOfx} a ${sessao.dataFimOfx} · `
                    : ''}
                  {sessao.totalTransacoes} transações · {sessao.totalConciliados} identificadas · {totalNaoId} não identificadas
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={finalizar}
                  disabled={!podeFinalizar || finalizando}
                  className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {finalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {finalizando ? 'Finalizando...' : 'Finalizar'}
                </button>
                <button
                  onClick={cancelar}
                  disabled={cancelando}
                  className="flex items-center gap-2 border border-error/30 text-error font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-error/5 transition-colors"
                >
                  {cancelando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const count = f === 'Todos'
                ? sessao.itens?.length ?? 0
                : (sessao.itens ?? []).filter((i) => i.statusItem === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFiltroAtivo(f)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                    filtroAtivo === f
                      ? 'bg-primary text-on-primary border-transparent'
                      : 'border-text-primary/10 text-text-primary/50 hover:text-text-primary'
                  )}
                >
                  {FILTRO_LABEL[f]}
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    filtroAtivo === f ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-highest text-text-primary/40'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-surface-medium border border-text-primary/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[90px_1fr_110px_1fr_auto] gap-3 px-4 py-2.5 border-b border-text-primary/5">
              {['Data', 'Descrição OFX', 'Valor', 'Lançamento vinculado', ''].map((h, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30">{h}</span>
              ))}
            </div>

            {itensFiltrados.length === 0 ? (
              <p className="text-center text-sm text-text-primary/40 py-12">Nenhuma transação neste filtro</p>
            ) : (
              <div className="divide-y divide-text-primary/5">
                {itensFiltrados.map((item) => (
                  <ConciliacaoCartaoItemRow
                    key={item.id}
                    item={item}
                    conciliacaoId={sessao.id}
                    cartaoId={sessao.cartaoCreditoId}
                    onUpdate={onItemUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
