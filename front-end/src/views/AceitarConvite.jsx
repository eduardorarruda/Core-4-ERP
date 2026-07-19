import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { convites } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules, { senhaValida } from '../components/ui/PasswordRules';
import Button from '../components/ui/Button';
import { BrandMark } from '../components/login/HeroPane';

export default function AceitarConvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [convite, setConvite] = useState(null);
  const [loadingConvite, setLoadingConvite] = useState(true);
  const [erroConvite, setErroConvite] = useState('');

  const [form, setForm] = useState({ nome: '', senha: '', confirmarSenha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) { setErroConvite('Token de convite não informado.'); setLoadingConvite(false); return; }
    convites.buscarPorToken(token)
      .then(setConvite)
      .catch((err) => setErroConvite(err.message || 'Convite inválido ou expirado.'))
      .finally(() => setLoadingConvite(false));
  }, [token]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAceitar = async (e) => {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não coincidem.'); return; }
    if (!senhaValida(form.senha)) { setErro('A senha não atende a todos os requisitos.'); return; }
    setLoading(true);
    try {
      await convites.aceitar({ token, nome: form.nome, senha: form.senha });
      setSucesso(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErro(err.message || 'Erro ao aceitar convite.');
    } finally {
      setLoading(false);
    }
  };

  const shellCls = 'min-h-dvh bg-surface text-text-primary flex items-center justify-center px-4 py-8';
  const cardCls = 'w-full max-w-[440px] bg-surface-low border border-text-primary/10 rounded-3xl p-6 sm:p-10';

  if (loadingConvite) {
    return (
      <div className={shellCls}>
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (erroConvite) {
    return (
      <div className={shellCls}>
        <div className={cardCls}>
          <div className="text-center">
            <div className="w-[60px] h-[60px] rounded-full bg-error/10 border border-error/20 grid place-items-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-error"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
            </div>
            <h2 className="font-display text-[22px] font-bold text-text-primary mb-2">Convite Inválido</h2>
            <p className="text-sm text-text-primary/50 mb-6">{erroConvite}</p>
            <Link to="/login" className="text-primary text-[13px] hover:opacity-80 transition-opacity">Voltar ao login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className={shellCls}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary text-on-primary grid place-items-center mx-auto mb-5" style={{ boxShadow: '0 0 50px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2 className="font-display text-[28px] font-bold text-text-primary mb-2">Conta criada!</h2>
          <p className="text-text-primary/50 text-sm">Redirecionando para o login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellCls}>
      <div className={cardCls}>
        <div className="flex justify-center mb-6">
          <BrandMark />
        </div>

        <div className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-primary/10 border border-primary/20 mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>

        <h1 className="font-display text-2xl font-bold text-text-primary text-center mb-1.5">
          Você foi convidado!
        </h1>

        {convite && (
          <div className="bg-primary/[.06] border border-primary/15 rounded-2xl px-4 py-3.5 mt-4 mb-6 text-center">
            {convite.emailConvidado && (
              <div className="text-[13px] text-text-primary/80 font-body mb-1 break-all">
                <span className="text-text-primary/50">E-mail: </span>
                <strong className="text-text-primary">{convite.emailConvidado}</strong>
              </div>
            )}
            <div className="text-xs text-text-primary/50 font-body mb-1">
              Perfil: <strong className="text-primary">{convite.perfilNome}</strong>
            </div>
            {convite.convidadoPorEmail && (
              <div className="text-xs text-text-primary/50 font-body mb-1 break-all">
                Convidado por: <strong className="text-text-primary/80">{convite.convidadoPorEmail}</strong>
              </div>
            )}
            <div className="text-[11px] text-text-primary/35 font-mono">
              Expira em: {new Date(convite.expiraEm).toLocaleDateString('pt-BR')}
            </div>
          </div>
        )}

        <p className="text-[13px] text-text-primary/50 mb-6 text-center">
          Crie sua conta para aceitar o convite e começar a usar o Core 4.
        </p>

        <form onSubmit={handleAceitar}>
          <div className="mb-3">
            <FloatingInput id="nome" label="Seu nome completo" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
          </div>
          <div className="mb-3">
            <FloatingPasswordInput id="senha" label="Crie uma senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" required />
          </div>

          <PasswordRules senha={form.senha} className="mb-3 px-1" />

          <div className="mb-3">
            <FloatingPasswordInput id="confirmarSenha" label="Confirmar senha" value={form.confirmarSenha} onChange={set('confirmarSenha')} autoComplete="new-password" required />
          </div>

          {erro && (
            <div className="px-3.5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] mt-3">
              {erro}
            </div>
          )}

          <Button type="submit" loading={loading} disabled={loading || !senhaValida(form.senha) || form.senha !== form.confirmarSenha} className="w-full h-12 mt-4 text-[15px] font-display font-bold">
            {loading ? 'Criando conta…' : 'Aceitar Convite'}
          </Button>
        </form>
      </div>
    </div>
  );
}
