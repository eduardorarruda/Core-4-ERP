import React, { useEffect, useRef, useState } from 'react';
import { User, Lock, Camera } from 'lucide-react';
import { auth } from '../lib/api';
import Toast from '../components/ui/Toast';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Configuracoes() {
  const [form, setForm] = useState({ email: '', nome: '', novaSenha: '', confirmarSenha: '', fotoPerfil: null });
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    auth.me().then((u) => {
      setForm((f) => ({ ...f, email: u.email, nome: u.nome, fotoPerfil: u.fotoPerfil || null }));
    }).catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, fotoPerfil: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (form.novaSenha && form.novaSenha !== form.confirmarSenha) {
      setToast({ message: 'As senhas não coincidem', type: 'error' });
      return;
    }
    setSalvando(true);
    try {
      const dto = {
        nome: form.nome,
        novaSenha: form.novaSenha || null,
        fotoPerfil: form.fotoPerfil || null,
      };
      const atualizado = await auth.atualizarPerfil(dto);
      localStorage.setItem('usuario', JSON.stringify(atualizado));
      setForm((f) => ({ ...f, novaSenha: '', confirmarSenha: '' }));
      setToast({ message: 'Perfil atualizado com sucesso!', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Erro ao salvar', type: 'error' });
    } finally {
      setSalvando(false);
    }
  };

  const inputClass = 'w-full bg-surface-low border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-sm';
  const labelClass = 'block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5';

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações da Conta</h1>
        <p className="text-zinc-500 text-sm mt-1">Gerencie seu perfil e credenciais de acesso.</p>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6 bg-surface-medium rounded-2xl p-6 border border-white/5">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 hover:border-primary/60 transition-colors group bg-surface-highest flex items-center justify-center shrink-0"
          >
            {form.fotoPerfil ? (
              <img src={form.fotoPerfil} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-white select-none">{getInitials(form.nome)}</span>
            )}
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </span>
          </button>
          <div>
            <p className="text-sm font-semibold text-white">{form.nome || '—'}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{form.email}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-primary hover:underline mt-1"
            >
              Alterar foto
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
        </div>

        <hr className="border-white/5" />

        {/* Dados */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Dados Pessoais</span>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input className={`${inputClass} opacity-50 cursor-not-allowed`} value={form.email} readOnly />
          </div>

          <div>
            <label className={labelClass}>Nome</label>
            <input
              className={inputClass}
              value={form.nome}
              onChange={set('nome')}
              placeholder="Seu nome completo"
              required
            />
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Senha */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Alterar Senha</span>
          </div>
          <p className="text-xs text-zinc-600">Deixe em branco para manter a senha atual.</p>

          <div>
            <label className={labelClass}>Nova Senha</label>
            <input
              className={inputClass}
              type="password"
              value={form.novaSenha}
              onChange={set('novaSenha')}
              placeholder="Mínimo 6 caracteres"
              minLength={form.novaSenha ? 6 : undefined}
            />
          </div>

          <div>
            <label className={labelClass}>Confirmar Nova Senha</label>
            <input
              className={inputClass}
              type="password"
              value={form.confirmarSenha}
              onChange={set('confirmarSenha')}
              placeholder="Repita a nova senha"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-primary hover:opacity-90 text-on-primary font-bold py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {salvando ? 'GRAVANDO...' : 'Salvar Alterações'}
        </button>
      </form>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
