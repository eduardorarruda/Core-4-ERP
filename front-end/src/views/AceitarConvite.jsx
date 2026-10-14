import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, MailX, UsersRound } from 'lucide-react';
import { convites } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules from '../components/ui/PasswordRules';
import Skeleton from '../components/ui/Skeleton';
import { senhaValida } from '../lib/senha';
import { formatDate } from '../lib/formatters';
import Button from '../components/ui/Button';
import AuthLayout from '../components/login/AuthLayout';
import AvisoFormulario from '../components/login/AvisoFormulario';
import { FadeIn, Stagger, StaggerItem } from '../components/motion/Movimento';
import { useCarga } from '../hooks/useCarga';
import { usePageMeta } from '../hooks/usePageMeta';
import { VERSAO_TERMOS } from '../content/legal';

const LINK_TEXTO = 'text-primary font-medium underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const HERO = <>Sua equipe já está no <span className="c4-text-emerald">Core 4</span>.</>;

export default function AceitarConvite() {
  usePageMeta({ title: 'Aceitar convite', noindex: true });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const { dados: convite, erro: falhaConvite, carregando: loadingConvite } = useCarga(
    () => convites.buscarPorToken(token),
    [token],
    { ativo: Boolean(token) },
  );
  const erroConvite = !token
    ? 'O link do convite está incompleto. Abra de novo o link recebido por e-mail.'
    : falhaConvite ? (falhaConvite.message || 'Convite inválido ou expirado.') : '';

  const [form, setForm] = useState({ nome: '', senha: '', confirmarSenha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erroAceite, setErroAceite] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAceitar = async (e) => {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não coincidem.'); return; }
    if (!senhaValida(form.senha)) { setErro('A senha não atende a todos os requisitos.'); return; }
    if (!aceite) {
      setErroAceite('Para criar a conta, é preciso aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setLoading(true);
    try {
      await convites.aceitar({ token, nome: form.nome, senha: form.senha, aceiteTermos: true, versaoTermos: VERSAO_TERMOS });
      setSucesso(true);
      timer.current = setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErro(err.message || 'Não foi possível aceitar o convite.');
    } finally {
      setLoading(false);
    }
  };

  if (token && loadingConvite) {
    return (
      <AuthLayout heroTitulo={HERO}>
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Carregando convite…</span>
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (erroConvite) {
    return (
      <AuthLayout heroTitulo={HERO}>
        <FadeIn className="text-center">
          <span aria-hidden="true" className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-2xl bg-error/10 border border-error/25 text-error">
            <MailX className="w-7 h-7" />
          </span>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight mb-2">Convite indisponível</h1>
          <p className="text-sm text-text-primary/65 mb-7 leading-relaxed" role="alert">{erroConvite}</p>
          <p className="text-sm text-text-primary/65 mb-6">Peça a quem convidou você para enviar um novo convite.</p>
          <Link to="/login" className="text-sm font-semibold text-primary hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Ir para o login
          </Link>
        </FadeIn>
      </AuthLayout>
    );
  }

  if (sucesso) {
    return (
      <AuthLayout heroTitulo={HERO}>
        <FadeIn className="text-center" y={12}>
          <motion.span
            aria-hidden="true"
            className="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-3xl bg-gradient-primary text-on-primary shadow-[var(--shadow-primary)]"
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <Check className="w-10 h-10" strokeWidth={2.75} />
          </motion.span>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight mb-2">Conta criada</h1>
          <p className="text-sm text-text-primary/65" role="status">Levando você para o login…</p>
        </FadeIn>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout heroTitulo={HERO} heroSubtitulo="Crie seu acesso para trabalhar nas contas, cartões e relatórios da empresa que convidou você.">
      <Stagger>
        <StaggerItem>
          <span aria-hidden="true" className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-5">
            <UsersRound className="w-6 h-6" />
          </span>
        </StaggerItem>
        <StaggerItem>
          <h1 className="font-display text-[2rem] font-semibold tracking-[-0.03em] leading-tight">Você foi convidado</h1>
          <p className="mt-2 text-sm text-text-primary/65">Crie sua senha para aceitar o convite.</p>
        </StaggerItem>

        {convite && (
          <StaggerItem>
            <dl className="c4-card c4-card--destaque mt-6 p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {convite.emailConvidado && (<><dt className="text-text-primary/55">E-mail</dt><dd className="font-medium break-all">{convite.emailConvidado}</dd></>)}
              <dt className="text-text-primary/55">Perfil</dt><dd className="font-semibold text-primary">{convite.perfilNome}</dd>
              {convite.convidadoPorEmail && (<><dt className="text-text-primary/55">Convidado por</dt><dd className="break-all">{convite.convidadoPorEmail}</dd></>)}
              {convite.expiraEm && (<><dt className="text-text-primary/55">Vale até</dt><dd className="tabular-nums">{formatDate(String(convite.expiraEm).slice(0, 10))}</dd></>)}
            </dl>
          </StaggerItem>
        )}

        <StaggerItem>
          <form onSubmit={handleAceitar} noValidate className="mt-6 space-y-3">
            <FloatingInput id="nome" label="Seu nome" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
            <FloatingPasswordInput id="senha" label="Crie uma senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" aria-describedby="regras-senha" required />
            <PasswordRules id="regras-senha" senha={form.senha} className="pl-1" />
            <FloatingPasswordInput
              id="confirmarSenha"
              label="Confirmar senha"
              value={form.confirmarSenha}
              onChange={set('confirmarSenha')}
              autoComplete="new-password"
              error={form.confirmarSenha && form.senha !== form.confirmarSenha ? 'As senhas não coincidem.' : undefined}
              required
            />

            {/* Consentimento (LGPD art. 8º): caixa desmarcada por padrão, obrigatória — mesmo padrão do cadastro */}
            <div className="pt-2">
              <div className="flex items-start gap-3">
                <input
                  id="aceiteTermos"
                  type="checkbox"
                  checked={aceite}
                  onChange={(e) => { setAceite(e.target.checked); setErroAceite(''); }}
                  required
                  aria-invalid={erroAceite ? true : undefined}
                  aria-describedby={erroAceite ? 'aceiteTermos-erro' : undefined}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--color-primary)] cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <label htmlFor="aceiteTermos" className="text-sm text-text-primary/80 leading-relaxed cursor-pointer">
                  Li e aceito os{' '}
                  <Link to="/termos" target="_blank" rel="noopener" className={LINK_TEXTO}>
                    Termos de Uso<span className="sr-only"> (abre em nova aba)</span>
                  </Link>
                  {' '}e a{' '}
                  <Link to="/privacidade" target="_blank" rel="noopener" className={LINK_TEXTO}>
                    Política de Privacidade<span className="sr-only"> (abre em nova aba)</span>
                  </Link>.
                </label>
              </div>
              {erroAceite && (
                <p id="aceiteTermos-erro" role="alert" className="text-xs text-error mt-1.5 font-medium">{erroAceite}</p>
              )}
            </div>

            <AvisoFormulario>{erro}</AvisoFormulario>

            <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading || !senhaValida(form.senha) || form.senha !== form.confirmarSenha} className="mt-2">
              {loading ? 'Criando conta…' : 'Aceitar convite'}
            </Button>
          </form>
        </StaggerItem>
      </Stagger>
    </AuthLayout>
  );
}
