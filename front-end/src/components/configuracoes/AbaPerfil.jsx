import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, Camera, ImageUp, RotateCcw, User } from 'lucide-react';
import { auth, getLoginState, setLoginState } from '../../lib/api';
import { useAuthContext, empresaAtivaDe } from '../../context/AuthContext';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';
import FormField, { FormInput } from '../ui/FormField';
import { iniciais } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { nomePerfil } from './perfilUtils';

const TIPOS_FOTO = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FOTO_MB = 5;

function validarFoto(file) {
  if (!TIPOS_FOTO.includes(file.type)) return 'Escolha uma imagem PNG, JPG, WebP ou GIF.';
  if (file.size > MAX_FOTO_MB * 1024 * 1024) return `A imagem passa de ${MAX_FOTO_MB} MB. Escolha uma menor.`;
  return null;
}

/** Foto de perfil com prévia antes de salvar (clique, toque ou arraste). */
function CampoFoto({ nome, foto, novaFoto, onEscolher, onDesfazer, erro }) {
  const inputRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const reduzir = useMovimentoReduzido();
  const exibida = novaFoto?.url ?? foto;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); onEscolher(e.dataTransfer.files?.[0]); }}
      className={cn(
        'flex flex-col sm:flex-row items-center sm:items-center gap-5 p-4 rounded-2xl border border-dashed transition-colors',
        arrastando ? 'border-primary bg-primary/5' : 'border-border-strong',
      )}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Trocar foto de perfil"
        aria-describedby="foto-ajuda"
        className="relative w-24 h-24 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface-low"
      >
        <span className="block w-full h-full rounded-full overflow-hidden ring-2 ring-primary/30 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-primary)_40%,transparent),var(--color-surface-medium)_75%)]">
          <AnimatePresence mode="popLayout" initial={false}>
            {exibida ? (
              <motion.img
                key={exibida.slice(-24)}
                src={exibida}
                alt=""
                className="w-full h-full object-cover"
                initial={reduzir ? false : { opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            ) : (
              <span className="grid place-items-center w-full h-full text-2xl font-semibold text-primary font-display select-none" aria-hidden="true">
                {iniciais(nome) || <User className="w-8 h-8" />}
              </span>
            )}
          </AnimatePresence>
        </span>
        <span className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-primary text-on-primary grid place-items-center ring-4 ring-surface-low" aria-hidden="true">
          <Camera className="w-4 h-4" />
        </span>
      </button>

      <div className="min-w-0 text-center sm:text-left space-y-2">
        <p className="text-sm font-semibold text-text-primary">Foto de perfil</p>
        <p id="foto-ajuda" className="text-sm text-text-primary/70 leading-relaxed">
          PNG, JPG, WebP ou GIF até {MAX_FOTO_MB} MB. Clique na foto ou arraste uma imagem para cá.
        </p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} leftIcon={<ImageUp className="w-4 h-4" aria-hidden="true" />}>
            Escolher imagem
          </Button>
          {novaFoto && (
            <Button variant="ghost" size="sm" onClick={onDesfazer} leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}>
              Desfazer
            </Button>
          )}
        </div>
        {novaFoto && <p className="text-xs text-primary" role="status">Prévia da nova foto. Clique em “Salvar perfil” para aplicar.</p>}
        {erro && <p className="text-xs text-error" role="alert">{erro}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_FOTO.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onEscolher(f); }}
      />
    </div>
  );
}

function CartaoEmpresa() {
  const { loginState } = useAuthContext();
  const empresa = empresaAtivaDe(loginState);
  const tipoConta = loginState?.usuario?.tipoConta;
  if (!empresa) return null;
  const pessoal = tipoConta === 'PESSOA_FISICA';
  return (
    <Card
      title={pessoal ? 'Sua conta' : 'Sua empresa'}
      subtitle={pessoal ? 'Conta pessoal: os dados financeiros são só seus.' : 'Empresa em que você está trabalhando agora.'}
      icon={Building2}
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="c4-eyebrow mb-1">{pessoal ? 'Nome da conta' : 'Empresa'}</dt>
          <dd className="font-medium text-text-primary">{empresa.nome}</dd>
        </div>
        <div>
          <dt className="c4-eyebrow mb-1">Seu perfil de acesso</dt>
          <dd><Badge variant="primary">{nomePerfil(empresa.perfilNome)}</Badge></dd>
        </div>
      </dl>
    </Card>
  );
}

/** Aba Perfil: nome, e-mail (só leitura), foto com prévia e dados da empresa. */
export default function AbaPerfil({ toast }) {
  const [form, setForm] = useState({ email: '', nome: '', fotoPerfil: null });
  const [carregado, setCarregado] = useState(false);
  const [novaFoto, setNovaFoto] = useState(null); // { file, url }
  const [erroFoto, setErroFoto] = useState('');
  const [erroNome, setErroNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vigente = true;
    auth.me()
      .then((u) => { if (vigente) setForm({ email: u.email, nome: u.nome ?? '', fotoPerfil: u.fotoPerfil || null }); })
      .catch((err) => toast.error(err.message || 'Não foi possível carregar seu perfil.'))
      .finally(() => { if (vigente) setCarregado(true); });
    return () => { vigente = false; };
  }, [toast]);

  // Libera a URL temporária da prévia quando ela muda ou a aba fecha
  useEffect(() => () => { if (novaFoto?.url) URL.revokeObjectURL(novaFoto.url); }, [novaFoto]);

  function escolherFoto(file) {
    if (!file) return;
    const erro = validarFoto(file);
    setErroFoto(erro ?? '');
    if (erro) return;
    setNovaFoto({ file, url: URL.createObjectURL(file) });
  }

  async function salvar(e) {
    e.preventDefault();
    const nome = form.nome.trim();
    if (nome.length < 2) { setErroNome('Informe seu nome (pelo menos 2 letras).'); return; }
    setErroNome('');
    setSalvando(true);
    try {
      let foto = form.fotoPerfil;
      if (novaFoto) {
        const resp = await auth.uploadFoto(novaFoto.file);
        foto = resp?.fotoPerfil ?? foto;
        setNovaFoto(null);
      }
      const atualizado = await auth.atualizarPerfil({ nome });
      setForm((f) => ({ ...f, nome, fotoPerfil: foto }));
      // Atualiza o estado de login para o cabeçalho e o menu refletirem na hora
      const st = getLoginState();
      if (st) setLoginState({ ...st, usuario: { ...st.usuario, ...atualizado, fotoPerfil: foto } });
      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  }

  if (!carregado) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card title="Dados pessoais" subtitle="Como você aparece para as outras pessoas da empresa." icon={User}>
        <form onSubmit={salvar} className="space-y-5" noValidate>
          <CampoFoto
            nome={form.nome}
            foto={form.fotoPerfil}
            novaFoto={novaFoto}
            onEscolher={escolherFoto}
            onDesfazer={() => { setNovaFoto(null); setErroFoto(''); }}
            erro={erroFoto}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome completo" required error={erroNome}>
              <FormInput
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                autoComplete="name"
                maxLength={120}
                error={erroNome}
              />
            </FormField>
            <FormField label="E-mail" help="Usado para entrar. Não dá para trocar por aqui.">
              <FormInput value={form.email} readOnly autoComplete="email" className="opacity-75 cursor-not-allowed" />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={salvando} className="w-full sm:w-auto">
              {salvando ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          </div>
        </form>
      </Card>
      <CartaoEmpresa />
    </div>
  );
}
