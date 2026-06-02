import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { convites } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';

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

  const senhaReqs = {
    tamanho: form.senha.length >= 8,
    maiuscula: /[A-Z]/.test(form.senha),
    numero: /[0-9]/.test(form.senha),
  };
  const senhaValida = senhaReqs.tamanho && senhaReqs.maiuscula && senhaReqs.numero;

  const handleAceitar = async (e) => {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não coincidem.'); return; }
    if (!senhaValida) { setErro('A senha não atende a todos os requisitos.'); return; }
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

  const S = {
    shell: { minHeight: '100vh', background: '#0c0c0c', color: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 24, padding: 40, maxWidth: 440, width: '100%' },
    submitBtn: { width: '100%', padding: '15px', borderRadius: 14, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, fontSize: 15, fontFamily: "'Sora', sans-serif", cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
    errBanner: { padding: '10px 14px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginTop: 12 },
  };

  if (loadingConvite) {
    return (
      <div style={S.shell}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6EFFC0' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}} body{background:#0c0c0c}'}</style>
      </div>
    );
  }

  if (erroConvite) {
    return (
      <div style={S.shell}>
        <style>{'body{background:#0c0c0c}'}</style>
        <div style={S.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,180,171,.1)', border: '1px solid rgba(255,180,171,.2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFB4AB" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="#FFB4AB"/></svg>
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#fafafa', marginBottom: 8 }}>Convite Inválido</h2>
            <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 24 }}>{erroConvite}</p>
            <a href="/login" style={{ color: '#6EFFC0', fontSize: 13, textDecoration: 'none' }}>Voltar ao login</a>
          </div>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div style={S.shell}>
        <style>{'body{background:#0c0c0c}'}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#6EFFC0', display: 'grid', placeItems: 'center', margin: '0 auto 20px', boxShadow: '0 0 50px rgba(110,255,192,.4)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#003824" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: '#fafafa', marginBottom: 8 }}>Conta criada!</h2>
          <p style={{ color: 'rgba(250,250,250,.5)', fontSize: 14 }}>Redirecionando para o login…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{'body{background:#0c0c0c} @keyframes spin{to{transform:rotate(360deg)}} .field-float{position:relative;margin-bottom:12px} .field-float input{display:block;width:100%;padding:22px 16px 10px;background:#131313;border:1px solid rgba(250,250,250,.1);border-radius:14px;color:#fafafa;font-size:14px;font-family:"DM Sans",sans-serif;outline:none;transition:border-color 200ms,box-shadow 200ms} .field-float input:focus{border-color:#6EFFC0;box-shadow:0 0 0 3px rgba(110,255,192,.12)} .field-float label{position:absolute;left:16px;top:8px;font-size:11px;color:rgba(250,250,250,.4);font-family:"DM Sans",sans-serif;pointer-events:none} .field-float input:focus ~ label{color:#6EFFC0} .field-float .field-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(250,250,250,.4);cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center}'}</style>
      <div style={S.shell}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', margin: '0 auto 20px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>

          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: '#fafafa', textAlign: 'center', marginBottom: 6 }}>
            Você foi convidado!
          </h1>

          {convite && (
            <div style={{ background: 'rgba(110,255,192,.06)', border: '1px solid rgba(110,255,192,.15)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(250,250,250,.5)', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
                Perfil: <strong style={{ color: '#6EFFC0' }}>{convite.perfilNome}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(250,250,250,.35)', fontFamily: 'monospace' }}>
                Expira em: {new Date(convite.expiraEm).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}

          <p style={{ fontSize: 13, color: 'rgba(250,250,250,.5)', marginBottom: 24, textAlign: 'center' }}>
            Crie sua conta para aceitar o convite e começar a usar o Core 4.
          </p>

          <form onSubmit={handleAceitar}>
            <FloatingInput id="nome" label="Seu nome completo" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
            <FloatingPasswordInput id="senha" label="Crie uma senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" required />

            {form.senha.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 12 }}>
                {[
                  { ok: senhaReqs.tamanho,   label: 'Mínimo 8 caracteres' },
                  { ok: senhaReqs.maiuscula, label: 'Pelo menos uma letra maiúscula' },
                  { ok: senhaReqs.numero,    label: 'Pelo menos um número' },
                ].map(({ ok, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: ok ? '#6EFFC0' : 'rgba(250,250,250,.4)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      {ok
                        ? <path d="M2 6l3 3 5-5" stroke="#6EFFC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        : <circle cx="6" cy="6" r="5" stroke="rgba(250,250,250,.2)" strokeWidth="1.5"/>}
                    </svg>
                    {label}
                  </div>
                ))}
              </div>
            )}

            <FloatingPasswordInput id="confirmarSenha" label="Confirmar senha" value={form.confirmarSenha} onChange={set('confirmarSenha')} autoComplete="new-password" required />

            {erro && <div style={S.errBanner}>{erro}</div>}

            <button type="submit" disabled={loading} style={S.submitBtn}>
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Criando conta…' : 'Aceitar Convite'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
