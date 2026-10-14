import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, AlertTriangle, RotateCcw, Pencil, Users, MailQuestion } from 'lucide-react';
import { operadores, convites, perfisAcesso } from '../lib/api';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const INPUT_CLS =
  'block w-full h-11 px-3.5 bg-surface border border-text-primary/10 rounded-xl text-sm text-text-primary ' +
  'placeholder:text-text-primary/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition';
const LABEL_CLS = 'block text-xs font-medium text-text-primary/60 mb-1.5';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ErroModal({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-xl bg-error/10 border border-error/25 text-error text-sm px-3.5 py-2.5 leading-relaxed"
    >
      {children}
    </div>
  );
}

function ModalConvite({ perfis, onClose, onSave }) {
  const [form, setForm] = useState({ email: '', perfilId: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = async () => {
    setErro('');
    const email = form.email.trim();
    if (!email || !form.perfilId) {
      setErro('Informe o e-mail e selecione um perfil de acesso.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setErro('O e-mail informado não parece válido. Verifique e tente novamente.');
      return;
    }
    setLoading(true);
    try {
      await onSave({ email, perfilId: form.perfilId });
      // Sucesso: o componente pai fecha o modal.
    } catch (e) {
      setErro(e?.message || 'Não foi possível enviar o convite. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Convidar operador" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-primary/60 leading-relaxed">
          Enviaremos um convite por e-mail. A pessoa entra na empresa com o perfil de acesso que você escolher.
        </p>

        <div>
          <label htmlFor="convite-email" className={LABEL_CLS}>E-mail</label>
          <input
            id="convite-email"
            className={INPUT_CLS}
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="operador@empresa.com"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="convite-perfil" className={LABEL_CLS}>Perfil de acesso</label>
          <select
            id="convite-perfil"
            className={`${INPUT_CLS} appearance-none`}
            value={form.perfilId}
            onChange={set('perfilId')}
          >
            <option value="">Selecione um perfil…</option>
            {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <ErroModal>{erro}</ErroModal>

        <Modal.Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} loading={loading} leftIcon={<UserPlus className="w-4 h-4" />}>
            Convidar
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}

function ModalEditarPerfil({ membro, perfis, onClose, onSave }) {
  const perfisDisponiveis = perfis.filter((p) => p.nome !== 'PROPRIETARIO');
  const perfilAtual = perfis.find((p) => p.nome === membro.perfilNome);
  const [perfilId, setPerfilId] = useState(perfilAtual ? String(perfilAtual.id) : '');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErro('');
    if (!perfilId) {
      setErro('Selecione um perfil de acesso.');
      return;
    }
    setLoading(true);
    try {
      await onSave(membro.usuarioId, Number(perfilId));
    } catch (e) {
      setErro(e?.message || 'Não foi possível alterar o perfil. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Alterar perfil de acesso" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-primary/60">
          Alterando o perfil de <span className="text-text-primary font-medium">{membro.nome}</span>.
        </p>

        <div>
          <label htmlFor="editar-perfil" className={LABEL_CLS}>Novo perfil</label>
          <select
            id="editar-perfil"
            className={`${INPUT_CLS} appearance-none`}
            value={perfilId}
            onChange={(e) => setPerfilId(e.target.value)}
          >
            <option value="">Selecione um perfil…</option>
            {perfisDisponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <ErroModal>{erro}</ErroModal>

        <Modal.Footer>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} loading={loading}>Salvar</Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}

export default function GestaoOperadores() {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState('ativos');
  const [membros, setMembros] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalConvite, setModalConvite] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(null);
  const [reenvId, setReenvId] = useState(null);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro('');
    Promise.all([
      operadores.listar({ size: 50 }).catch(() => ({ content: [] })),
      convites.pendentes({ size: 50 }).catch(() => ({ content: [] })),
      perfisAcesso.listar().catch(() => []),
    ]).then(([m, p, pf]) => {
      setMembros(Array.isArray(m) ? m : (m?.content ?? []));
      setPendentes(Array.isArray(p) ? p : (p?.content ?? []));
      setPerfis(Array.isArray(pf) ? pf : (pf?.content ?? []));
    }).catch(() => setErro('Não foi possível carregar os dados. Tente novamente em instantes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // --- Ações ---

  const remover = async (usuarioId, nome) => {
    const ok = await confirm({
      title: 'Desativar operador',
      message: `Deseja desativar o acesso de ${nome}? A pessoa deixa de acessar a empresa, mas o histórico é mantido e o acesso pode ser reativado depois.`,
      confirmLabel: 'Desativar',
      cancelLabel: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await operadores.remover(usuarioId);
      toast.success(`${nome} foi desativado.`);
      carregar();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível desativar o operador.');
    }
  };

  const reativar = async (usuarioId, nome) => {
    const ok = await confirm({
      title: 'Reativar operador',
      message: `Deseja reativar o acesso de ${nome} à empresa?`,
      confirmLabel: 'Reativar',
      cancelLabel: 'Cancelar',
      variant: 'default',
    });
    if (!ok) return;
    try {
      await operadores.reativar(usuarioId);
      toast.success(`${nome} foi reativado.`);
      carregar();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível reativar o operador.');
    }
  };

  const reenviarConvite = async (id, email) => {
    setReenvId(id);
    try {
      await convites.reenviar(id);
      toast.success(`Convite reenviado${email ? ` para ${email}` : ''}.`);
      carregar();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível reenviar o convite.');
    } finally {
      setReenvId(null);
    }
  };

  // Lançam erro para o modal exibir internamente; sucesso fecha o modal + toast.
  const enviarConvite = async (form) => {
    await convites.convidar({ email: form.email, perfilId: Number(form.perfilId) });
    setModalConvite(false);
    toast.success(`Convite enviado para ${form.email}.`);
    carregar();
  };

  const alterarPerfilHandler = async (usuarioId, perfilId) => {
    await operadores.alterarPerfil(usuarioId, perfilId);
    setEditandoPerfil(null);
    toast.success('Perfil de acesso atualizado.');
    carregar();
  };

  // --- Colunas ---

  const colunasAtivos = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (v, m) => (
        <div className="flex items-center gap-2">
          {m.senhaProvisoria && (
            <AlertTriangle
              className="w-3.5 h-3.5 text-warning shrink-0"
              aria-label="Senha provisória"
            />
          )}
          <span className="font-semibold text-text-primary">{m.nome}</span>
        </div>
      ),
    },
    { key: 'email', label: 'E-mail', sortable: true, render: (v) => <span className="text-text-primary/60">{v}</span> },
    { key: 'perfilNome', label: 'Perfil', render: (v) => <Badge variant="info">{v}</Badge> },
    {
      key: 'ativo',
      label: 'Status',
      render: (v) => (
        <Badge variant={v ? 'success' : 'neutral'} dot>{v ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (v, m) => (
        <div className="flex items-center gap-2">
          {m.perfilNome !== 'PROPRIETARIO' && (
            <PermissaoGuard permissao="USUARIO_EDITAR">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setEditandoPerfil(m)}
                aria-label={`Alterar perfil de ${m.nome}`}
                title="Alterar perfil"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </PermissaoGuard>
          )}
          {m.ativo ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remover(m.usuarioId, m.nome)}
              aria-label={`Desativar ${m.nome}`}
              title="Desativar operador"
              className="text-error hover:bg-error/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reativar(m.usuarioId, m.nome)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reativar
            </Button>
          )}
        </div>
      ),
    },
  ];

  const colunasPendentes = [
    { key: 'emailConvidado', label: 'E-mail', sortable: true, render: (v) => <span className="font-semibold text-text-primary">{v}</span> },
    { key: 'perfilNome', label: 'Perfil', render: (v) => <Badge variant="info">{v}</Badge> },
    {
      key: 'expiraEm',
      label: 'Expira em',
      render: (v) => <span className="text-text-primary/60">{v ? new Date(v).toLocaleString('pt-BR') : '—'}</span>,
    },
    { key: 'convidadoPorEmail', label: 'Convidado por', render: (v) => <span className="text-text-primary/60">{v ?? '—'}</span> },
    {
      key: 'acoes',
      label: 'Ações',
      render: (v, c) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => reenviarConvite(c.id, c.emailConvidado)}
          loading={reenvId === c.id}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reenviar
        </Button>
      ),
    },
  ];

  const abas = [
    { id: 'ativos', label: `Ativos (${membros.length})` },
    { id: 'pendentes', label: `Convites pendentes (${pendentes.length})` },
  ];

  const colunas = tab === 'ativos' ? colunasAtivos : colunasPendentes;
  const dados = tab === 'ativos' ? membros : pendentes;
  const vazio = tab === 'ativos'
    ? <EmptyState icon={Users} title="Nenhum operador ativo" description="Convide pessoas para colaborar na gestão financeira da empresa." />
    : <EmptyState icon={MailQuestion} title="Nenhum convite pendente" description="Os convites enviados que ainda não foram aceitos aparecem aqui." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operadores"
        subtitle="Membros e convites da empresa"
        actions={
          <PermissaoGuard permissao="USUARIO_CONVIDAR">
            <Button onClick={() => setModalConvite(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
              Convidar
            </Button>
          </PermissaoGuard>
        }
      />

      {erro && (
        <div role="alert" className="rounded-xl bg-error/10 border border-error/25 text-error text-sm px-4 py-3">
          {erro}
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar operadores">
        {abas.map((a) => {
          const ativo = tab === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => setTab(a.id)}
              className={
                'h-11 px-4 rounded-xl text-sm font-medium transition focus-visible:outline-none ' +
                'focus-visible:ring-2 focus-visible:ring-primary ' +
                (ativo
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-medium text-text-primary/50 hover:text-text-primary hover:bg-surface-high')
              }
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Tabela (desktop) + cards (mobile) — mesmo conteúdo, responsivo */}
      <div className="hidden md:block">
        <DataTable columns={colunas} data={dados} loading={loading} emptyState={vazio} keyExtractor={(r) => r.usuarioId ?? r.id} />
      </div>
      <div className="md:hidden">
        <DataTable columns={colunas} data={dados} loading={loading} emptyState={vazio} cardView keyExtractor={(r) => r.usuarioId ?? r.id} />
      </div>

      {modalConvite && (
        <ModalConvite
          perfis={perfis}
          onClose={() => setModalConvite(false)}
          onSave={enviarConvite}
        />
      )}

      {editandoPerfil && (
        <ModalEditarPerfil
          membro={editandoPerfil}
          perfis={perfis}
          onClose={() => setEditandoPerfil(null)}
          onSave={alterarPerfilHandler}
        />
      )}
    </div>
  );
}
