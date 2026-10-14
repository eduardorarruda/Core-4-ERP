import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check, MailCheck, Mail } from 'lucide-react';
import { auth, setLoginState } from '../lib/api';
import { getFirstAccessibleRoute } from '../lib/routeUtils';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import Button from '../components/ui/Button';
import BrandMark from '../components/ui/BrandMark';
import AuthLayout from '../components/login/AuthLayout';
import AvisoFormulario from '../components/login/AvisoFormulario';
import { FadeIn, Stagger, StaggerItem } from '../components/motion/Movimento';
import { usePageMeta } from '../hooks/usePageMeta';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saudacao(h) {
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const LINK = 'text-primary font-semibold rounded hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const VOLTAR = 'inline-flex items-center gap-1.5 -ml-1 mb-6 min-h-11 px-1 rounded-lg text-sm text-text-primary/65 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Troca de "telas" do formulário com deslize suave (login ↔ recuperar senha). */
function Passo({ id, children }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      key={id}
      initial={reduzir ? { opacity: 0 } : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, x: -16, transition: { duration: 0.14 } }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Login() {
  usePageMeta({
    title: 'Entrar',
    canonical: '/login',
    description: 'Entre no Core 4 para controlar contas a pagar e receber, cartões, conciliação bancária e relatórios da sua vida financeira ou da sua empresa.',
  });
  const navigate = useNavigate();
  const { state: estadoNavegacao } = useLocation();
  const contaExcluida = Boolean(estadoNavegacao?.contaExcluida);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [hora] = useState(() => new Date().getHours());

  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetErro, setResetErro] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navTimer = useRef(null);

  // Limpa o timer de redirecionamento se o componente desmontar antes do navigate.
  useEffect(() => () => clearTimeout(navTimer.current), []);

  const emailValid = EMAIL_RE.test(email);

  function voltarParaLogin() {
    setView('login');
    setResetErro('');
    setResetEmail('');
  }

  const handleEsqueciSenha = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(resetEmail)) {
      setResetErro('Informe um e-mail válido.');
      return;
    }
    setResetErro('');
    setResetLoading(true);
    try {
      await auth.esqueciSenha(resetEmail);
      setView('forgot-sent');
    } catch (err) {
      setResetErro(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setErro('');
    if (!emailValid) { setErro('Informe um e-mail válido.'); return; }
    if (!senha) { setErro('Informe sua senha.'); return; }
    setCarregando(true);
    try {
      const result = await auth.login(email, senha);
      setLoginState(result);
      setSucesso(true);
      const permSet = new Set(result.empresas?.[0]?.permissoes ?? []);
      const check = (cod) => result.adminSistema || permSet.has(cod);
      navTimer.current = setTimeout(() => navigate(getFirstAccessibleRoute(check)), 700);
    } catch (err) {
      setErro(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait" initial={false}>
        {view === 'login' && (
          <Passo key="login" id="login">
            {contaExcluida && (
              <AvisoFormulario tipo="info" className="mb-6">
                Sua conta foi excluída e seus dados pessoais foram anonimizados.
              </AvisoFormulario>
            )}
            <Stagger>
              <StaggerItem>
                <p className="c4-eyebrow mb-3">{saudacao(hora)}</p>
              </StaggerItem>
              <StaggerItem>
                <h1 className="font-display text-[2rem] sm:text-[2.25rem] font-semibold tracking-[-0.03em] leading-tight">
                  Entre no <span className="c4-text-emerald">Core 4</span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-2 text-sm text-text-primary/65">Use o e-mail e a senha da sua conta.</p>
              </StaggerItem>

              <StaggerItem>
                <form onSubmit={handleLogin} noValidate className="mt-8 space-y-3">
                  <FloatingInput
                    id="email"
                    label="E-mail"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    validIcon={emailValid ? <Check className="w-4 h-4" strokeWidth={2.5} /> : null}
                  />
                  <FloatingPasswordInput
                    id="senha"
                    label="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      className="text-sm text-primary font-medium min-h-11 px-1 rounded hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => { setResetEmail(email); setResetErro(''); setView('forgot-email'); }}
                    >
                      Esqueci a senha
                    </button>
                  </div>

                  <AvisoFormulario>{erro}</AvisoFormulario>

                  <Button type="submit" size="lg" loading={carregando} fullWidth className="mt-2">
                    {carregando ? 'Entrando…' : 'Entrar'}
                  </Button>
                </form>
              </StaggerItem>

              <StaggerItem>
                <p className="mt-8 text-center text-sm text-text-primary/65">
                  Ainda não tem conta? <Link to="/register" className={LINK}>Criar conta grátis</Link>
                </p>
              </StaggerItem>
            </Stagger>
          </Passo>
        )}

        {view === 'forgot-email' && (
          <Passo key="forgot-email" id="forgot-email">
            <button type="button" onClick={voltarParaLogin} className={VOLTAR}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar ao login
            </button>
            <span aria-hidden="true" className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-5">
              <Mail className="w-6 h-6" />
            </span>
            <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] mb-2">Recuperar acesso</h1>
            <p className="text-sm text-text-primary/65 mb-7 leading-relaxed">
              Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.
            </p>
            <form onSubmit={handleEsqueciSenha} noValidate className="space-y-3">
              <FloatingInput
                id="reset-email"
                label="E-mail da conta"
                type="email"
                inputMode="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <AvisoFormulario>{resetErro}</AvisoFormulario>
              <Button type="submit" size="lg" loading={resetLoading} fullWidth>
                {resetLoading ? 'Enviando…' : 'Enviar link'}
              </Button>
            </form>
          </Passo>
        )}

        {view === 'forgot-sent' && (
          <Passo key="forgot-sent" id="forgot-sent">
            <button type="button" onClick={voltarParaLogin} className={VOLTAR}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar ao login
            </button>
            <span aria-hidden="true" className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-5">
              <MailCheck className="w-6 h-6" />
            </span>
            <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] mb-2">Confira seu e-mail</h1>
            <p className="text-sm text-text-primary/65 leading-relaxed mb-7" role="status">
              Se houver uma conta com <strong className="text-text-primary">{resetEmail}</strong>, enviamos um link para
              criar uma senha nova. O link vale por 60 minutos.
            </p>
            <Button type="button" variant="secondary" size="lg" onClick={voltarParaLogin} fullWidth>
              Voltar ao login
            </Button>
          </Passo>
        )}
      </AnimatePresence>

      {/* Confirmação breve antes de entrar */}
      <AnimatePresence>
        {sucesso && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-surface/85 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <FadeIn className="text-center p-10" y={12}>
              <motion.div
                className="mx-auto mb-6 w-24 h-24 grid place-items-center rounded-3xl c4-card c4-card--destaque"
                initial={{ scale: 0.8, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <BrandMark size={56} />
              </motion.div>
              <p className="font-display text-[1.75rem] font-semibold tracking-tight">Bem-vindo de volta</p>
              <p className="mt-1 text-sm text-text-primary/65" role="status">Abrindo o Core 4…</p>
            </FadeIn>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
