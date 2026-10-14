import React, { useState } from 'react';
import {
  AlertTriangle, Clock, MailPlus, MailQuestion, RotateCcw, Send, ShieldCheck, UserCog, UserMinus, Users,
} from 'lucide-react';
import { operadores, convites, perfisAcesso } from '../lib/api';
import { useCarga } from '../hooks/useCarga';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { usePermissao } from '../hooks/usePermissao';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Drawer from '../components/ui/Drawer';
import Avatar from '../components/ui/Avatar';
import Tabs from '../components/ui/Tabs';
import FilterBar from '../components/ui/FilterBar';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import FormField, { FormInput } from '../components/ui/FormField';
import SeletorPerfil from '../components/configuracoes/SeletorPerfil';
import { useConcessao } from '../components/configuracoes/useConcessao';
import { PERFIL_PROPRIETARIO, mensagemErroPermissao, nomePerfil, tomPerfil } from '../components/configuracoes/perfilUtils';

const ID_ABAS = 'op';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lista = (r) => (Array.isArray(r) ? r : r?.content ?? []);
const fmtData = (v) => (v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Perfis que podem ser atribuídos (nunca PROPRIETARIO). */
const atribuiveis = (perfis) => perfis.filter((p) => p.nome !== PERFIL_PROPRIETARIO);

function GavetaConvite({ perfis, faltam, onClose, onSave }) {
  const [email, setEmail] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e?.preventDefault();
    const t = email.trim();
    const novos = {};
    if (!t) novos.email = 'Informe o e-mail da pessoa.';
    else if (!EMAIL_RE.test(t)) novos.email = 'Esse e-mail parece incompleto. Confira e tente de novo.';
    if (!perfilId) novos.perfil = 'Escolha um perfil de acesso.';
    setErros(novos);
    if (Object.keys(novos).length) return;
    setEnviando(true);
    setErroGeral('');
    try {
      await onSave({ email: t, perfilId: Number(perfilId) });
    } catch (err) {
      setErroGeral(mensagemErroPermissao(err, 'Não foi possível enviar o convite. Tente novamente.'));
      setEnviando(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Convidar operador"
      description="A pessoa recebe um e-mail, cria a própria senha e entra com o perfil escolhido."
      closeOnEsc={!enviando}
      closeOnOverlay={!enviando}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} loading={enviando} leftIcon={<Send className="w-4 h-4" aria-hidden="true" />}>Enviar convite</Button>
        </>
      )}
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <FormField label="E-mail" required error={erros.email} help="O convite vale por alguns dias. Dá para reenviar depois.">
          <FormInput type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={erros.email} />
        </FormField>
        <SeletorPerfil perfis={atribuiveis(perfis)} valor={perfilId} onChange={setPerfilId} faltam={faltam} erro={erros.perfil} />
        {erroGeral && <AlertaErro titulo="Convite não enviado" mensagem={erroGeral} compacto />}
      </form>
    </Drawer>
  );
}

function GavetaPerfilMembro({ membro, perfis, faltam, onClose, onSave }) {
  const atual = perfis.find((p) => p.nome === membro.perfilNome);
  const [perfilId, setPerfilId] = useState(atual ? String(atual.id) : '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudou = perfilId && String(atual?.id) !== String(perfilId);

  async function salvar() {
    if (!mudou) { onClose(); return; }
    setSalvando(true);
    setErro('');
    try {
      await onSave(membro.usuarioId, Number(perfilId));
    } catch (err) {
      setErro(mensagemErroPermissao(err, 'Não foi possível trocar o perfil. Tente novamente.'));
      setSalvando(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Trocar perfil de acesso"
      description={`${membro.nome} · ${membro.email}`}
      closeOnEsc={!salvando}
      closeOnOverlay={!salvando}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} loading={salvando} disabled={!mudou}>Salvar</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <p className="text-sm text-text-primary/75 leading-relaxed">
          A troca vale na hora: na próxima ação, {membro.nome.split(' ')[0]} já usa os acessos do novo perfil.
        </p>
        <SeletorPerfil perfis={atribuiveis(perfis)} valor={perfilId} onChange={(v) => setPerfilId(String(v))} faltam={faltam} legenda="Novo perfil" />
        {erro && <AlertaErro titulo="Perfil não alterado" mensagem={erro} compacto />}
      </div>
    </Drawer>
  );
}

function Pessoa({ m, eu }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar nome={m.nome} size="md" />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold text-text-primary truncate">
          {m.nome}
          {eu && <Badge variant="primary" size="sm">Você</Badge>}
        </p>
        <p className="text-xs text-text-primary/65 truncate">{m.email}</p>
      </div>
    </div>
  );
}

function Situacao({ m }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={m.ativo ? 'success' : 'neutral'} dot>{m.ativo ? 'Ativo' : 'Desativado'}</Badge>
      {m.senhaProvisoria && (
        <span className="inline-flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Ainda com senha provisória
        </span>
      )}
    </div>
  );
}

export default function GestaoOperadores() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const concessao = useConcessao();
  const [aba, setAba] = useState('membros');
  const [busca, setBusca] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [reenvId, setReenvId] = useState(null);

  const { dados, erro, carregando, recarregar } = useCarga(
    () => Promise.all([
      operadores.listar({ size: 100 }),
      convites.pendentes({ size: 100 }).catch(() => ({ content: [] })),
      perfisAcesso.listar().catch(() => []),
    ]),
    [],
  );
  const membros = lista(dados?.[0]);
  const pendentes = lista(dados?.[1]);
  const perfis = Array.isArray(dados?.[2]) ? dados[2] : [];
  const faltam = (perfil) => concessao.faltam(perfil.permissoes);

  const eu = (m) => m.usuarioId === concessao.usuarioId || (concessao.email && m.email === concessao.email);
  const termo = busca.trim().toLowerCase();
  const filtra = (txt) => !termo || txt.some((t) => (t || '').toLowerCase().includes(termo));
  const membrosVis = membros
    .filter((m) => filtra([m.nome, m.email, nomePerfil(m.perfilNome)]))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
  const pendentesVis = pendentes.filter((c) => filtra([c.emailConvidado, nomePerfil(c.perfilNome)]));

  async function desativar(m) {
    const ok = await confirmar({
      title: `Desativar ${m.nome}?`,
      message: 'A pessoa deixa de entrar na empresa. O histórico do que ela fez continua guardado e dá para reativar depois.',
      confirmLabel: 'Desativar',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await operadores.remover(m.usuarioId);
      toast.success(`${m.nome} foi desativado.`);
      recarregar();
    } catch (err) {
      toast.error(mensagemErroPermissao(err, 'Não foi possível desativar o operador.'));
    }
  }

  async function reativar(m) {
    const ok = await confirmar({ title: `Reativar ${m.nome}?`, message: 'A pessoa volta a entrar na empresa com o perfil que tinha.', confirmLabel: 'Reativar' });
    if (!ok) return;
    try {
      await operadores.reativar(m.usuarioId);
      toast.success(`${m.nome} foi reativado.`);
      recarregar();
    } catch (err) {
      toast.error(mensagemErroPermissao(err, 'Não foi possível reativar o operador.'));
    }
  }

  async function reenviar(c) {
    setReenvId(c.id);
    try {
      await convites.reenviar(c.id);
      toast.success(`Convite reenviado para ${c.emailConvidado}.`);
      recarregar();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível reenviar o convite.');
    } finally {
      setReenvId(null);
    }
  }

  const enviarConvite = async (dto) => {
    await convites.convidar(dto);
    setConvidando(false);
    toast.success(`Convite enviado para ${dto.email}.`);
    setAba('pendentes');
    recarregar();
  };

  const trocarPerfil = async (usuarioId, perfilId) => {
    await operadores.alterarPerfil(usuarioId, perfilId);
    setEditando(null);
    toast.success('Perfil de acesso atualizado.');
    recarregar();
  };

  // Ações por linha: ninguém altera o próprio vínculo nem o do proprietário (regra do backend)
  function acoesDe(m) {
    if (eu(m)) return <span className="text-xs text-text-primary/55">Você não altera o próprio acesso</span>;
    if (m.perfilNome === PERFIL_PROPRIETARIO) return <span className="text-xs text-text-primary/55">O proprietário não muda por aqui</span>;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {m.ativo && (
          <PermissaoGuard permissao="USUARIO_EDITAR">
            <Button variant="secondary" size="sm" onClick={() => setEditando(m)} leftIcon={<UserCog className="w-4 h-4" aria-hidden="true" />}>
              Trocar perfil <span className="sr-only">de {m.nome}</span>
            </Button>
          </PermissaoGuard>
        )}
        {m.ativo ? (
          <PermissaoGuard permissao="USUARIO_REMOVER">
            <Button variant="danger-ghost" size="sm" onClick={() => desativar(m)} leftIcon={<UserMinus className="w-4 h-4" aria-hidden="true" />}>
              Desativar <span className="sr-only">{m.nome}</span>
            </Button>
          </PermissaoGuard>
        ) : (
          <PermissaoGuard permissao="USUARIO_EDITAR">
            <Button variant="secondary" size="sm" onClick={() => reativar(m)} leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}>
              Reativar <span className="sr-only">{m.nome}</span>
            </Button>
          </PermissaoGuard>
        )}
      </div>
    );
  }

  const colunasMembros = [
    { key: 'nome', label: 'Pessoa', sortable: true, render: (_v, m) => <Pessoa m={m} eu={eu(m)} /> },
    { key: 'perfilNome', label: 'Perfil', render: (v) => <Badge variant={tomPerfil(v)}><ShieldCheck className="w-3 h-3" aria-hidden="true" /> {nomePerfil(v)}</Badge> },
    { key: 'ativo', label: 'Situação', render: (_v, m) => <Situacao m={m} /> },
    { key: 'dataIngresso', label: 'Desde', render: (v) => <span className="text-sm text-text-primary/70 tabular-nums">{fmtData(v)}</span> },
    { key: 'acoes', label: 'Ações', render: (_v, m) => acoesDe(m) },
  ];

  const colunasPendentes = [
    { key: 'emailConvidado', label: 'E-mail', sortable: true, render: (v) => <span className="font-semibold text-text-primary break-all">{v}</span> },
    { key: 'perfilNome', label: 'Perfil', render: (v) => <Badge variant={tomPerfil(v)}>{nomePerfil(v)}</Badge> },
    { key: 'expiraEm', label: 'Expira em', render: (v) => <span className="inline-flex items-center gap-1.5 text-sm text-text-primary/70"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{fmtData(v)}</span> },
    { key: 'convidadoPorEmail', label: 'Convidado por', render: (v) => <span className="text-sm text-text-primary/70 break-all">{v ?? '—'}</span> },
    {
      key: 'acoes',
      label: 'Ações',
      render: (_v, c) => (
        <PermissaoGuard permissao="USUARIO_CONVIDAR">
          <Button variant="secondary" size="sm" loading={reenvId === c.id} onClick={() => reenviar(c)} leftIcon={<Send className="w-4 h-4" aria-hidden="true" />}>
            Reenviar <span className="sr-only">convite para {c.emailConvidado}</span>
          </Button>
        </PermissaoGuard>
      ),
    },
  ];

  const podeConvidar = pode('USUARIO_CONVIDAR');
  const vazioMembros = termo
    ? <EmptyState compact icon={Users} title="Ninguém com esse nome ou e-mail" description="Confira a busca ou limpe o filtro." />
    : <EmptyState icon={Users} title="Só você por aqui" description="Convide quem cuida das finanças com você. Cada pessoa entra com o perfil que você escolher." action={podeConvidar ? { label: 'Convidar operador', onClick: () => setConvidando(true), icon: MailPlus } : undefined} />;
  const vazioPendentes = <EmptyState compact icon={MailQuestion} title="Nenhum convite esperando resposta" description="Convites enviados e ainda não aceitos aparecem aqui." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operadores"
        subtitle="Quem acessa a empresa e com qual perfil."
        icon={Users}
        actions={(
          <PermissaoGuard permissao="USUARIO_CONVIDAR">
            <Button onClick={() => setConvidando(true)} disabled={carregando && !dados} leftIcon={<MailPlus className="w-4 h-4" aria-hidden="true" />}>
              Convidar
            </Button>
          </PermissaoGuard>
        )}
      >
        <Tabs
          value={aba}
          onChange={setAba}
          label="Operadores"
          idBase={ID_ABAS}
         
          items={[
            { value: 'membros', label: 'Membros', icon: Users, badge: membros.length || undefined },
            { value: 'pendentes', label: 'Convites pendentes', icon: MailQuestion, badge: pendentes.length || undefined },
          ]}
        />
      </PageHeader>

      {erro && <AlertaErro mensagem={erro.message} onTentarNovamente={recarregar} />}

      <FilterBar busca={{ value: busca, onChange: setBusca, placeholder: aba === 'membros' ? 'Buscar por nome, e-mail ou perfil' : 'Buscar por e-mail ou perfil' }} />

      <div role="tabpanel" id={Tabs.painelId(ID_ABAS, aba)} aria-labelledby={Tabs.abaId(ID_ABAS, aba)}>
        {aba === 'membros' ? (
          <DataTable
            caption="Membros da empresa"
            columns={colunasMembros}
            data={membrosVis}
            loading={carregando && !dados}
            emptyState={vazioMembros}
            keyExtractor={(r) => r.usuarioId}
          />
        ) : (
          <DataTable
            caption="Convites pendentes"
            columns={colunasPendentes}
            data={pendentesVis}
            loading={carregando && !dados}
            emptyState={vazioPendentes}
            keyExtractor={(r) => r.id}
          />
        )}
      </div>

      {convidando && <GavetaConvite perfis={perfis} faltam={faltam} onClose={() => setConvidando(false)} onSave={enviarConvite} />}
      {editando && <GavetaPerfilMembro membro={editando} perfis={perfis} faltam={faltam} onClose={() => setEditando(null)} onSave={trocarPerfil} />}
    </div>
  );
}
