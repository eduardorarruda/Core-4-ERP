import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, Upload, Loader2, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { conciliacao as api, contasCorrentes as ccApi } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import OfxUploadZone from '../components/conciliacao/OfxUploadZone';
import ConciliacaoItemRow from '../components/conciliacao/ConciliacaoItemRow';
import Badge from '../components/ui/Badge';
import FormField, { inputCls } from '../components/ui/FormField';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { brl } from '../lib/formatters';
import { cn } from '../lib/utils';

const FILTROS = ['Todos', 'SUGERIDO', 'NAO_IDENTIFICADO', 'IGNORADO', 'VINCULADO_MANUALMENTE', 'BAIXADO'];

function filtroBadge(f) {
  const MAP = {
    Todos: 'neutral', SUGERIDO: 'warning', NAO_IDENTIFICADO: 'error',
    IGNORADO: 'neutral', VINCULADO_MANUALMENTE: 'info', BAIXADO: 'success',
  };
  return MAP[f] ?? 'neutral';
}

function filtroBadgeLabel(f) {
  const MAP = {
    Todos: 'Todos', SUGERIDO: 'Sugeridos', NAO_IDENTIFICADO: 'Não identificados',
    IGNORADO: 'Ignorados', VINCULADO_MANUALMENTE: 'Manuais', BAIXADO: 'Baixados',
  };
  return MAP[f] ?? f;
}

export default function Conciliacao() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  // ── Passo 1: Upload
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // ── Passo 2: Conta corrente não encontrada
  const [mostrarSelecaoCC, setMostrarSelecaoCC] = useState(false);
  const [numeroCCNaoEncontrado, setNumeroCCNaoEncontrado] = useState('');
  const [contasCorrentes, setContasCorrentes] = useState([]);
  const [ccSelecionada, setCcSelecionada] = useState('');

  // ── Passo 3: Revisão
  const [sessao, setSessao] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [finalizando, setFinalizando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  async function enviarArquivo(contaCorrenteId) {
    if (!arquivo) { toast.error('Selecione um arquivo .ofx'); return; }
    setEnviando(true);
    try {
      const resultado = await api.upload(arquivo, contaCorrenteId || null);
      setSessao(resultado);
      setMostrarSelecaoCC(false);
    } catch (e) {
      if (e.message?.startsWith('CONTA_NAO_ENCONTRADA:')) {
        const numero = e.message.split(':')[1];
        setNumeroCCNaoEncontrado(numero);
        const ccs = await ccApi.listar().catch(() => []);
        setContasCorrentes(ccs);
        setMostrarSelecaoCC(true);
      } else {
        toast.error(e.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  async function finalizar() {
    const itens = sessao.itens ?? [];
    const pendentes = itens.filter((i) => i.statusItem === 'NAO_IDENTIFICADO').length;
    const sugeridos = itens.filter((i) => i.statusItem === 'SUGERIDO').length;
    const baixar = itens.filter((i) => i.statusItem === 'SUGERIDO' || i.statusItem === 'VINCULADO_MANUALMENTE').length;
    const ignorados = itens.filter((i) => i.statusItem === 'IGNORADO').length;

    const ok = await confirm({
      title: 'Confirmar Conciliação',
      message: (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-primary"><CheckCircle2 className="w-4 h-4" /> <span>{baixar} conta(s) serão baixadas</span></div>
          {ignorados > 0 && <div className="flex items-center gap-2 text-text-primary/60"><span>⚪ {ignorados} transação(ões) serão ignoradas</span></div>}
          {pendentes > 0 && <div className="flex items-center gap-2 text-error"><AlertTriangle className="w-4 h-4" /> <span>{pendentes} transação(ões) sem vínculo permanecerão sem baixa</span></div>}
        </div>
      ),
      confirmLabel: 'Finalizar',
    });
    if (!ok) return;

    setFinalizando(true);
    try {
      await api.finalizar(sessao.id, {});
      toast.success('Conciliação finalizada!');
      navigate(`/conciliacao/${sessao.id}/relatorio`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFinalizando(false);
    }
  }

  async function cancelar() {
    const ok = await confirm({ title: 'Cancelar conciliação', message: 'Deseja cancelar esta sessão de conciliação? Os dados serão descartados.', confirmLabel: 'Cancelar sessão', variant: 'error' });
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
        title="Conciliação Bancária"
        subtitle="Importe um arquivo OFX e reconcilie com seus lançamentos"
        icon={<GitMerge className="w-5 h-5" />}
        actions={
          <button
            onClick={() => navigate('/conciliacao/historico')}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/60 hover:text-text-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            <History className="w-4 h-4" /> Histórico
          </button>
        }
      />

      {/* ── Passo 1: Upload ──────────────────────────────── */}
      {!sessao && (
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">1. Selecione o arquivo OFX</h2>
          <OfxUploadZone onFile={setArquivo} />

          {/* ── Passo 2: Selecionar CC manualmente ── */}
          {mostrarSelecaoCC && (
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-400">
                  Conta corrente <strong>{numeroCCNaoEncontrado}</strong> não encontrada. Selecione qual conta corresponde:
                </p>
              </div>
              <FormField label="Conta Corrente">
                <select
                  className={`${inputCls} appearance-none`}
                  value={ccSelecionada}
                  onChange={(e) => setCcSelecionada(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {contasCorrentes.map((c) => (
                    <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          <button
            onClick={() => enviarArquivo(mostrarSelecaoCC ? ccSelecionada : null)}
            disabled={!arquivo || enviando || (mostrarSelecaoCC && !ccSelecionada)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {enviando ? 'Processando...' : mostrarSelecaoCC ? 'Tentar novamente' : 'Processar arquivo'}
          </button>
        </div>
      )}

      {/* ── Passo 3: Tela de revisão ─────────────────────── */}
      {sessao && (
        <div className="space-y-4">
          {/* Cabeçalho da sessão */}
          <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-text-primary">
                  {sessao.bancoId ? `Banco ${sessao.bancoId} — ` : ''}Conta {sessao.contaCorrenteNumero || sessao.numeroContaOfx}
                </h2>
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

          {/* Filtros */}
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
                  {filtroBadgeLabel(f)}
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

          {/* Lista de itens */}
          <div className="bg-surface-medium border border-text-primary/5 rounded-2xl overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[90px_1fr_110px_1fr_auto] gap-3 px-4 py-2.5 border-b border-text-primary/5">
              {['Data', 'Descrição OFX', 'Valor', 'Conta vinculada', ''].map((h, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30">{h}</span>
              ))}
            </div>

            {itensFiltrados.length === 0 ? (
              <p className="text-center text-sm text-text-primary/40 py-12">Nenhuma transação neste filtro</p>
            ) : (
              <div className="divide-y divide-text-primary/5">
                {itensFiltrados.map((item) => (
                  <ConciliacaoItemRow
                    key={item.id}
                    item={item}
                    conciliacaoId={sessao.id}
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
