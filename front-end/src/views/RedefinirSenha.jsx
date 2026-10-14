import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check, KeyRound } from 'lucide-react';
import { auth } from '../lib/api';
import { FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules from '../components/ui/PasswordRules';
import { senhaValida } from '../lib/senha';
import Button from '../components/ui/Button';
import AuthLayout from '../components/login/AuthLayout';
import AvisoFormulario from '../components/login/AvisoFormulario';
import { FadeIn } from '../components/motion/Movimento';
import { usePageMeta } from '../hooks/usePageMeta';

export default function RedefinirSenha() {
  usePageMeta({ title: 'Redefinir senha', noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!senhaValida(novaSenha)) { setErro('A senha não atende aos requisitos de segurança.'); return; }
    if (novaSenha !== confirmaSenha) { setErro('As senhas não coincidem.'); return; }
    setErro('');
    setLoading(true);
    try {
      await auth.redefinirSenha(token, novaSenha);
      setSucesso(true);
      timer.current = setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setErro(err.message || 'O link é inválido ou expirou. Peça um novo na tela de login.');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <AuthLayout>
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
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight mb-2">Senha redefinida</h1>
          <p className="text-sm text-text-primary/65 leading-relaxed" role="status">
            Tudo certo. Levando você para o login…
          </p>
          <Link to="/login" replace className="inline-block mt-6 text-sm font-semibold text-primary hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Ir para o login agora
          </Link>
        </FadeIn>
      </AuthLayout>
    );
  }

  const pronto = senhaValida(novaSenha) && novaSenha === confirmaSenha;

  return (
    <AuthLayout heroTitulo={<>Uma senha nova, <span className="c4-text-emerald">e pronto</span>.</>}>
      <FadeIn>
        <Link to="/login" className="inline-flex items-center gap-1.5 -ml-1 mb-6 min-h-11 px-1 rounded-lg text-sm text-text-primary/65 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar ao login
        </Link>
        <span aria-hidden="true" className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-5">
          <KeyRound className="w-6 h-6" />
        </span>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] mb-2">Criar senha nova</h1>
        <p className="text-sm text-text-primary/65 mb-7 leading-relaxed">
          Escolha uma senha que você não usa em outros sites.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <FloatingPasswordInput
            id="nova-senha"
            label="Nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            autoComplete="new-password"
            aria-describedby="regras-senha"
            required
          />
          <PasswordRules id="regras-senha" senha={novaSenha} className="pl-1" />
          <FloatingPasswordInput
            id="confirma-senha"
            label="Confirmar nova senha"
            value={confirmaSenha}
            onChange={(e) => setConfirmaSenha(e.target.value)}
            autoComplete="new-password"
            error={confirmaSenha && novaSenha !== confirmaSenha ? 'As senhas não coincidem.' : undefined}
            required
          />

          <AvisoFormulario>{erro}</AvisoFormulario>

          <Button type="submit" size="lg" fullWidth loading={loading} disabled={loading || !pronto} className="mt-2">
            {loading ? 'Salvando…' : 'Salvar senha nova'}
          </Button>
        </form>
      </FadeIn>
    </AuthLayout>
  );
}
