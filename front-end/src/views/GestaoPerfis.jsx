import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, Lock, Info, ShieldQuestion } from 'lucide-react';
import { perfisAcesso } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const MODULO_LABEL = {
  CONTA: 'Lançamentos',
  CONTA_CORRENTE: 'Contas Correntes',
  CARTAO: 'Cartões',
  CARTAO_CONCILIACAO: 'Conciliação de Cartão',
  CATEGORIA: 'Categorias',
  PARCEIRO: 'Parceiros',
  INVESTIMENTO: 'Investimentos',
  ASSINATURA: 'Assinaturas',
  CONCILIACAO: 'Conciliação Bancária',
  RELATORIO: 'Relatórios',
  RELATORIO_FLUXO_CAIXA: 'Relatório: Fluxo de Caixa',
  RELATORIO_CONTAS_ABERTAS: 'Relatório: Contas Abertas',
  RELATORIO_EXTRATO: 'Relatório: Extrato',
  RELATORIO_DRE: 'Relatório: DRE',
  RELATORIO_INVESTIMENTOS: 'Relatório: Investimentos',
  RELATORIO_CARTOES: 'Relatório: Cartões',
  RELATORIO_POSICAO_FINANCEIRA: 'Relatório: Posição Financeira',
  RELATORIO_ASSINATURAS: 'Relatório: Assinaturas',
  USUARIO: 'Usuários',
  CONFIGURACAO: 'Configurações',
  AUDITORIA: 'Auditoria',
  CALENDARIO: 'Calendário',
  DASHBOARD: 'Dashboard Geral',
  DASHBOARD_CARTAO: 'Dashboard de Cartões',
};

// Rótulos amigáveis em pt-BR para as ações (evita expor o código cru ao usuário).
const ACAO_LABEL = {
  VISUALIZAR: 'Visualizar',
  CRIAR: 'Criar',
  EDITAR: 'Editar',
  DELETAR: 'Excluir',
  BAIXAR: 'Dar baixa',
  ESTORNAR: 'Estornar',
  TRANSFERIR: 'Transferir',
  LANCAR: 'Lançar',
  FECHAR_FATURA: 'Fechar fatura',
  IMPORTAR: 'Importar',
  VINCULAR: 'Vincular',
  CONVIDAR: 'Convidar',
  REMOVER: 'Remover',
  EXPORTAR: 'Exportar',
  GERENCIAR: 'Gerenciar',
};

const acaoLabel = (acao) =>
  ACAO_LABEL[acao] ??
  (acao ? acao.charAt(0) + acao.slice(1).toLowerCase().replace(/_/g, ' ') : acao);

const INPUT_CLS =
  'block w-full h-11 px-3.5 bg-surface border border-text-primary/10 rounded-xl text-sm text-text-primary ' +
  'placeholder:text-text-primary/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition';
const LABEL_CLS = 'block text-xs font-medium text-text-primary/60 mb-1.5';

const FORM_VAZIO = { nome: '', descricao: '', permissaoIds: new Set() };

function agruparPorModulo(permissoes) {
  return permissoes.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});
}

function ModalPerfil({ perfil, todasPermissoes, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    if (perfil) {
      const ids = new Set(
        todasPermissoes.filter((p) => perfil.permissoes.includes(p.codigo)).map((p) => p.id)
      );
      return { nome: perfil.nome, descricao: perfil.descricao ?? '', permissaoIds: ids };
    }
    return { ...FORM_VAZIO, permissaoIds: new Set() };
  });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const grupos = agruparPorModulo(todasPermissoes);

  // --- Lógica de negócio preservada integralmente ---
  const togglePermissao = (id) => {
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      const permissao = todasPermissoes.find((p) => p.id === id);
      if (ids.has(id)) {
        ids.delete(id);
        // Ao remover VISUALIZAR, remove todas as outras do mesmo módulo
        if (permissao?.acao === 'VISUALIZAR') {
          const idsModulo = grupos[permissao.modulo]?.map((p) => p.id) ?? [];
          idsModulo.forEach((mid) => ids.delete(mid));
        }
      } else {
        ids.add(id);
        // Ao adicionar qualquer ação não-VISUALIZAR, auto-adiciona VISUALIZAR do módulo
        if (permissao && permissao.acao !== 'VISUALIZAR') {
          const visualizar = grupos[permissao.modulo]?.find((p) => p.acao === 'VISUALIZAR');
          if (visualizar) ids.add(visualizar.id);
        }
      }
      return { ...prev, permissaoIds: ids };
    });
  };

  const toggleModulo = (modulo) => {
    const idsModulo = grupos[modulo].map((p) => p.id);
    const todosMarcados = idsModulo.every((id) => form.permissaoIds.has(id));
    setForm((prev) => {
      const ids = new Set(prev.permissaoIds);
      if (todosMarcados) idsModulo.forEach((id) => ids.delete(id));
      else idsModulo.forEach((id) => ids.add(id));
      return { ...prev, permissaoIds: ids };
    });
  };

  const submit = async () => {
    setErro('');
    if (!form.nome.trim()) {
      setErro('Dê um nome ao perfil.');
      return;
    }
    if (form.permissaoIds.size === 0) {
      setErro('Selecione pelo menos uma permissão para o perfil.');
      return;
    }
    setLoading(true);
    try {
      await onSave({ nome: form.nome, descricao: form.descricao, permissaoIds: [...form.permissaoIds] });
    } catch (e) {
      setErro(e?.message || 'Não foi possível salvar o perfil. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={perfil ? 'Editar perfil' : 'Novo perfil'} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="perfil-nome" className={LABEL_CLS}>Nome do perfil</label>
            <input
              id="perfil-nome"
              className={`${INPUT_CLS} uppercase`}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: VENDEDOR"
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="perfil-descricao" className={LABEL_CLS}>Descrição</label>
            <input
              id="perfil-descricao"
              className={INPUT_CLS}
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o perfil"
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-sm font-semibold text-text-primary">Permissões</span>
          </div>
          {/* Explica a dependência automática (comportamento já existente) */}
          <div className="flex items-start gap-2 rounded-xl bg-secondary/10 border border-secondary/20 px-3.5 py-2.5 mb-3">
            <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-text-primary/70 leading-relaxed">
              Ao marcar qualquer ação, a permissão <strong>Visualizar</strong> do mesmo grupo é adicionada
              automaticamente. Ao desmarcar <strong>Visualizar</strong>, as demais ações do grupo são removidas.
            </p>
          </div>

          <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
            {Object.entries(grupos).map(([modulo, perms]) => {
              const marcadas = perms.filter((p) => form.permissaoIds.has(p.id)).length;
              const todos = marcadas === perms.length;
              const alguns = !todos && marcadas > 0;
              return (
                <div key={modulo} className="bg-surface-medium border border-text-primary/5 rounded-xl p-4">
                  <button
                    type="button"
                    onClick={() => toggleModulo(modulo)}
                    aria-pressed={todos}
                    className="flex items-center gap-3 w-full text-left mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  >
                    <span
                      className={
                        'w-5 h-5 rounded-md grid place-items-center shrink-0 border-2 transition ' +
                        (todos
                          ? 'bg-primary border-primary'
                          : alguns
                            ? 'bg-warning/20 border-warning'
                            : 'border-text-primary/25 bg-transparent')
                      }
                    >
                      {todos && (
                        <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                          <path d="M1 4l3 3 5-6" stroke="var(--color-on-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {alguns && <span className="w-2 h-0.5 rounded-full bg-warning" />}
                    </span>
                    <span className="text-sm font-bold text-text-primary font-display">
                      {MODULO_LABEL[modulo] ?? modulo}
                    </span>
                    <span className="ml-auto text-xs font-mono text-text-primary/40">
                      {marcadas}/{perms.length}
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {perms.map((p) => {
                      const marcado = form.permissaoIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePermissao(p.id)}
                          aria-pressed={marcado}
                          className={
                            'inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg text-xs font-medium border transition ' +
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
                            (marcado
                              ? 'bg-primary/10 border-primary/40 text-primary'
                              : 'bg-transparent border-text-primary/10 text-text-primary/50 hover:border-text-primary/25 hover:text-text-primary/80')
                          }
                        >
                          <span className={'w-2 h-2 rounded-full shrink-0 ' + (marcado ? 'bg-primary' : 'bg-text-primary/20')} />
                          {acaoLabel(p.acao)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ErroBox>{erro}</ErroBox>

        <Modal.Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} loading={loading}>Salvar</Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}

function ErroBox({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-xl bg-error/10 border border-error/25 text-error text-sm px-3.5 py-2.5 leading-relaxed">
      {children}
    </div>
  );
}

export default function GestaoPerfis() {
  const toast = useToast();
  const confirm = useConfirm();

  const [perfis, setPerfis] = useState([]);
  const [todasPermissoes, setTodasPermissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    Promise.all([
      perfisAcesso.listar().catch(() => []),
      perfisAcesso.listarPermissoes().catch(() => []),
    ]).then(([p, pm]) => {
      setPerfis(Array.isArray(p) ? p : []);
      setTodasPermissoes(Array.isArray(pm) ? pm : []);
    }).catch(() => setErro('Não foi possível carregar os dados. Tente novamente em instantes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => { setEditando(null); setModalAberto(true); };
  const abrirEditar = (p) => { setEditando(p); setModalAberto(true); };

  // Lança erro para o modal exibir internamente; sucesso fecha o modal + toast.
  const salvar = async (dto) => {
    if (editando) await perfisAcesso.atualizar(editando.id, dto);
    else await perfisAcesso.criar(dto);
    setModalAberto(false);
    toast.success(editando ? 'Perfil atualizado.' : 'Perfil criado.');
    carregar();
  };

  const deletar = async (p) => {
    const ok = await confirm({
      title: 'Excluir perfil',
      message: `Deseja excluir o perfil "${p.nome}"? Esta ação não pode ser desfeita. Operadores que usam este perfil precisarão ser reatribuídos a outro.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await perfisAcesso.deletar(p.id);
      toast.success(`Perfil "${p.nome}" excluído.`);
      carregar();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir o perfil.');
    }
  };

  const colunas = [
    {
      key: 'nome',
      label: 'Perfil',
      sortable: true,
      render: (v, p) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className={'w-4 h-4 shrink-0 ' + (p.protegido ? 'text-warning' : 'text-primary')} aria-hidden="true" />
          <span className="font-bold text-text-primary">{v}</span>
        </div>
      ),
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (v) => <span className="text-text-primary/60 line-clamp-2">{v ?? '—'}</span>,
    },
    {
      key: 'permissoes',
      label: 'Permissões',
      render: (v) => <Badge variant="info">{v?.length ?? 0} permissões</Badge>,
    },
    {
      key: 'protegido',
      label: 'Tipo',
      render: (v) => (v
        ? <Badge variant="neutral"><Lock className="w-3 h-3" /> Sistema</Badge>
        : <Badge variant="success">Personalizado</Badge>),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (v, p) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => abrirEditar(p)}
            disabled={p.protegido}
            aria-label={p.protegido ? 'Perfil do sistema não pode ser editado' : `Editar perfil ${p.nome}`}
            title={p.protegido ? 'Perfil do sistema não pode ser editado' : 'Editar'}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deletar(p)}
            disabled={p.protegido}
            aria-label={p.protegido ? 'Perfil do sistema não pode ser excluído' : `Excluir perfil ${p.nome}`}
            title={p.protegido ? 'Perfil do sistema não pode ser excluído' : 'Excluir'}
            className={p.protegido ? '' : 'text-error hover:bg-error/10'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const vazio = (
    <EmptyState
      icon={ShieldQuestion}
      title="Nenhum perfil encontrado"
      description="Crie perfis para definir o que cada operador pode acessar na empresa."
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfis de Acesso"
        subtitle="Perfis e permissões dos operadores"
        actions={
          <Button onClick={abrirCriar} leftIcon={<Plus className="w-4 h-4" />}>
            Novo perfil
          </Button>
        }
      />

      {erro && (
        <div role="alert" className="rounded-xl bg-error/10 border border-error/25 text-error text-sm px-4 py-3">
          {erro}
        </div>
      )}

      <div className="hidden md:block">
        <DataTable columns={colunas} data={perfis} loading={loading} emptyState={vazio} keyExtractor={(r) => r.id} />
      </div>
      <div className="md:hidden">
        <DataTable columns={colunas} data={perfis} loading={loading} emptyState={vazio} cardView keyExtractor={(r) => r.id} />
      </div>

      {modalAberto && (
        <ModalPerfil
          perfil={editando}
          todasPermissoes={todasPermissoes}
          onClose={() => setModalAberto(false)}
          onSave={salvar}
        />
      )}
    </div>
  );
}
