import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Lock, Camera, Check, ShieldCheck, Download, Trash2, AlertTriangle } from 'lucide-react';
import { auth, getLoginState, setLoginState } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import FormField, { PasswordInput, inputCls } from '../components/ui/FormField';
import PasswordRules from '../components/ui/PasswordRules';
import { senhaValida } from '../lib/senha';
import ExcluirContaModal from '../components/configuracoes/ExcluirContaModal';
import { cn } from '../lib/utils';

const ABAS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
  { id: 'privacidade', label: 'Privacidade', icon: ShieldCheck },
];

const SECAO_TITULO = 'flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-primary/70 font-mono';

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/** Dispara o download de um Blob como arquivo. */
function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AbaPerfil({ toast }) {
  const [form, setForm] = useState({ email: '', nome: '', fotoPerfil: null });
  const [fotoFile, setFotoFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const emailId = useId();

  useEffect(() => {
    auth.me()
      .then((u) => setForm((f) => ({ ...f, email: u.email, nome: u.nome, fotoPerfil: u.fotoPerfil || null })))
      .catch((err) => toast.error(err.message || 'Não foi possível carregar seu perfil.'));
  }, [toast]);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha uma imagem PNG, JPG ou WebP.');
      return;
    }
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, fotoPerfil: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (fotoFile) {
        await auth.uploadFoto(fotoFile);
        setFotoFile(null);
      }
      const atualizado = await auth.atualizarPerfil({ nome: form.nome });
      // Atualiza o estado de login (nome/foto) para o cabeçalho e o menu refletirem na hora
      const st = getLoginState();
      if (st) setLoginState({ ...st, usuario: { ...st.usuario, ...atualizado } });
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      <div
        className={cn(
          'flex items-center gap-5 p-4 rounded-xl border-2 border-dashed transition-colors',
          dragging ? 'border-primary/50 bg-primary/5' : 'border-text-primary/15'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Alterar foto de perfil"
          className="relative w-20 h-20 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
        >
          <span className="block w-full h-full rounded-full overflow-hidden bg-primary/15 border-2 border-primary/30">
            {form.fotoPerfil ? (
              <img src={form.fotoPerfil} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary select-none font-display flex items-center justify-center w-full h-full" aria-hidden="true">
                {getInitials(form.nome)}
              </span>
            )}
          </span>
          {/* Selo sempre visível: no toque não existe hover */}
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-on-primary grid place-items-center border-2 border-surface-low" aria-hidden="true">
            <Camera className="w-4 h-4" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary font-display">{form.nome || '—'}</p>
          <p className="text-xs text-text-primary/70 mt-0.5 font-mono truncate">{form.email}</p>
          <p className="text-xs text-text-primary/70 mt-2">Toque na foto ou arraste uma imagem PNG/JPG.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
      </div>

      <div className="space-y-4">
        <h2 className={SECAO_TITULO}>
          <User className="w-4 h-4 text-primary" aria-hidden="true" /> Dados pessoais
        </h2>
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="text-xs font-bold uppercase tracking-wider text-text-primary/70">E-mail</label>
          <input id={emailId} className={cn(inputCls, 'opacity-70 cursor-not-allowed')} value={form.email} readOnly aria-describedby={`${emailId}-ajuda`} />
          <p id={`${emailId}-ajuda`} className="text-xs text-text-primary/70">O e-mail é usado para entrar e não pode ser alterado aqui.</p>
        </div>
        <FormField label="Nome completo" required>
          <input
            className={inputCls}
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Seu nome completo"
            autoComplete="name"
            required
          />
        </FormField>
      </div>

      <Button type="submit" loading={salvando} className="w-full">
        {salvando ? 'Salvando...' : 'Salvar perfil'}
      </Button>
    </form>
  );
}

function AbaSeguranca({ toast, senhaProvisoria }) {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const novos = {};
    if (!form.senhaAtual) novos.senhaAtual = senhaProvisoria ? 'Informe a senha provisória que você recebeu.' : 'Informe sua senha atual.';
    if (!senhaValida(form.novaSenha)) novos.novaSenha = 'A nova senha não atende aos requisitos.';
    if (form.novaSenha !== form.confirmarSenha) novos.confirmarSenha = 'As senhas não coincidem.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setSalvando(true);
    try {
      await auth.trocarSenha(form.senhaAtual, form.novaSenha);
      const st = getLoginState();
      if (st?.senhaProvisoria) setLoginState({ ...st, senhaProvisoria: false });
      setForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setSalvo(true);
      toast.success('Senha alterada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4" noValidate>
      <h2 className={SECAO_TITULO}>
        <Lock className="w-4 h-4 text-primary" aria-hidden="true" /> Alterar senha
      </h2>
      {senhaProvisoria && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-text-primary">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          Você entrou com uma senha provisória. Defina uma senha sua para liberar o restante do sistema.
        </p>
      )}
      {salvo && (
        <p role="status" className="flex items-center gap-2 text-sm text-primary">
          <Check className="w-4 h-4" aria-hidden="true" /> Senha alterada com sucesso.
        </p>
      )}
      <FormField label={senhaProvisoria ? 'Senha provisória' : 'Senha atual'} required>
        <PasswordInput value={form.senhaAtual} onChange={set('senhaAtual')} autoComplete="current-password" error={erros.senhaAtual} />
      </FormField>
      <FormField label="Nova senha" required help="Use ao menos 8 caracteres, com letra maiúscula, minúscula e número.">
        <PasswordInput value={form.novaSenha} onChange={set('novaSenha')} autoComplete="new-password" error={erros.novaSenha} />
      </FormField>
      <PasswordRules senha={form.novaSenha} />
      <FormField label="Confirmar nova senha" required>
        <PasswordInput value={form.confirmarSenha} onChange={set('confirmarSenha')} autoComplete="new-password" error={erros.confirmarSenha} />
      </FormField>
      <Button type="submit" loading={salvando} className="w-full">
        {salvando ? 'Salvando...' : 'Alterar senha'}
      </Button>
    </form>
  );
}

function AbaPrivacidade({ toast }) {
  const [baixando, setBaixando] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);

  async function baixarDados() {
    setBaixando(true);
    try {
      const blob = await auth.exportarDados();
      if (!blob) throw new Error('O servidor não devolveu o arquivo. Tente novamente.');
      baixarArquivo(blob, 'core4-meus-dados.json');
      toast.success('Arquivo com seus dados baixado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar o arquivo com seus dados.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className={SECAO_TITULO}>
          <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" /> Privacidade e dados
        </h2>
        <p className="text-sm text-text-primary/80 leading-relaxed">
          Você pode consultar e levar seus dados ou pedir a exclusão da conta a qualquer momento,
          como garante a LGPD (art. 18). Detalhes na{' '}
          <Link to="/privacidade" className="text-primary underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Política de Privacidade</Link>
          {' '}e nos{' '}
          <Link to="/termos" className="text-primary underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Termos de Uso</Link>.
        </p>
      </div>

      <section aria-labelledby="titulo-baixar" className="rounded-xl border border-text-primary/10 p-4 space-y-3">
        <h3 id="titulo-baixar" className="text-sm font-bold text-text-primary">Baixar meus dados</h3>
        <p className="text-sm text-text-primary/80">
          Gera um arquivo JSON com seus dados pessoais e de uso guardados no Core 4.
        </p>
        <Button variant="secondary" loading={baixando} onClick={baixarDados} leftIcon={<Download className="w-4 h-4" aria-hidden="true" />}>
          {baixando ? 'Gerando arquivo...' : 'Baixar meus dados'}
        </Button>
      </section>

      <section aria-labelledby="titulo-excluir" className="rounded-xl border border-error/30 p-4 space-y-3">
        <h3 id="titulo-excluir" className="text-sm font-bold text-error">Excluir minha conta</h3>
        <p className="text-sm text-text-primary/80">
          Seus dados pessoais são anonimizados e a conta é desativada. Não dá para desfazer.
        </p>
        <Button variant="danger" onClick={() => setExcluirAberto(true)} leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}>
          Excluir minha conta
        </Button>
      </section>

      <ExcluirContaModal open={excluirAberto} onClose={() => setExcluirAberto(false)} />
    </div>
  );
}

export default function Configuracoes() {
  const toast = useToast();
  const { senhaProvisoria } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaUrl = searchParams.get('aba');
  const abaAtiva = ABAS.some((a) => a.id === abaUrl) ? abaUrl : (senhaProvisoria ? 'seguranca' : 'perfil');
  const baseId = useId();

  const trocarAba = (id) => setSearchParams({ aba: id }, { replace: true });

  // Setas esquerda/direita alternam as abas (padrão WAI-ARIA de tabs)
  const onTecla = (e, indice) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const proximo = (indice + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length;
    trocarAba(ABAS[proximo].id);
    document.getElementById(`${baseId}-aba-${ABAS[proximo].id}`)?.focus();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader title="Configurações" subtitle="Perfil, senha e privacidade da sua conta" />

      <div role="tablist" aria-label="Seções das configurações" className="flex gap-1 p-1 rounded-xl border border-text-primary/10 bg-surface-low">
        {ABAS.map((aba, i) => {
          const ativa = aba.id === abaAtiva;
          const Icone = aba.icon;
          return (
            <button
              key={aba.id}
              id={`${baseId}-aba-${aba.id}`}
              type="button"
              role="tab"
              aria-selected={ativa}
              aria-controls={`${baseId}-painel`}
              tabIndex={ativa ? 0 : -1}
              onClick={() => trocarAba(aba.id)}
              onKeyDown={(e) => onTecla(e, i)}
              className={cn(
                'flex-1 min-h-11 px-2 sm:px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-mono flex items-center justify-center gap-1.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                ativa ? 'bg-gradient-primary text-on-primary shadow-sm' : 'text-text-primary/70 hover:text-text-primary'
              )}
            >
              <Icone className="w-4 h-4 hidden sm:block" aria-hidden="true" />
              {aba.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-painel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-aba-${abaAtiva}`}
        className="rounded-[18px] p-6 border border-text-primary/10 bg-surface-low shadow-card anim-in"
      >
        {abaAtiva === 'perfil' && <AbaPerfil toast={toast} />}
        {abaAtiva === 'seguranca' && <AbaSeguranca toast={toast} senhaProvisoria={senhaProvisoria} />}
        {abaAtiva === 'privacidade' && <AbaPrivacidade toast={toast} />}
      </div>
    </div>
  );
}
