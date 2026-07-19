import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../lib/api';
import { FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules, { senhaValida } from '../components/ui/PasswordRules';
import Button from '../components/ui/Button';
import { BrandMark } from '../components/login/HeroPane';

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!senhaValida(novaSenha)) { setErro('A senha não atende aos requisitos mínimos de segurança.'); return; }
    if (novaSenha !== confirmaSenha) { setErro('As senhas não coincidem.'); return; }
    setErro('');
    setLoading(true);
    try {
      await auth.redefinirSenha(token, novaSenha);
      setSucesso(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setErro(err.message || 'Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  const shellCls = 'relative min-h-dvh flex items-center justify-center bg-surface text-text-primary px-4 py-8';
  const gridBg = (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: 'linear-gradient(to right,color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
      }}
    />
  );
  const orbBg = (
    <div className="fixed rounded-full bg-primary blur-[80px] opacity-20 -top-36 left-1/2 -translate-x-1/2 pointer-events-none z-0" style={{ width: 520, height: 520 }} />
  );
  const cardCls = 'relative z-[1] w-full max-w-[460px] bg-surface-low/85 border border-text-primary/10 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-[var(--shadow-elevated)]';

  if (sucesso) {
    return (
      <div className={shellCls}>
        {gridBg}
        {orbBg}
        <div className={`${cardCls} text-center`}>
          <div className="w-20 h-20 rounded-full bg-primary text-on-primary grid place-items-center mx-auto mb-6" style={{ boxShadow: '0 0 60px color-mix(in srgb, var(--color-primary) 40%, transparent)', animation: 'scaleSpring 600ms cubic-bezier(.34,1.56,.64,1) both' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2.5">
            Senha redefinida!
          </h2>
          <p className="text-sm text-text-primary/50 leading-relaxed">
            Sua senha foi alterada com sucesso.<br />Redirecionando para o login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellCls}>
      {gridBg}
      {orbBg}

      <div className={cardCls}>
        <div className="mb-8">
          <BrandMark />
        </div>

        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="font-display text-[26px] font-bold tracking-tight text-text-primary mb-2">
          Nova senha
        </h1>
        <p className="text-sm text-text-primary/50 mb-7 leading-relaxed">
          Escolha uma senha forte para proteger sua conta.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <FloatingPasswordInput
              id="nova-senha"
              label="Nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="mb-3">
            <FloatingPasswordInput
              id="confirma-senha"
              label="Confirmar nova senha"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <PasswordRules senha={novaSenha} className="mb-4" />

          {erro && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] mt-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" />
              </svg>
              {erro}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={loading || novaSenha !== confirmaSenha || !senhaValida(novaSenha)}
            className="w-full h-12 mt-4 text-[15px] font-display font-bold"
          >
            {loading ? 'Salvando…' : 'Redefinir senha'}
          </Button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs text-text-primary/40 hover:text-text-primary/70 transition-colors py-2"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
