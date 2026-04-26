import React, { useEffect, useRef, useState } from 'react';
import { User, Lock, Camera, Loader2, Check } from 'lucide-react';
import { auth } from '../lib/api';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/ui/PageHeader';
import { PasswordInput } from '../components/ui/FormField';
import { cn } from '../lib/utils';

const inputCls = 'w-full bg-surface border border-text-primary/10 rounded-xl px-4 py-3 text-text-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm font-body placeholder:text-text-primary/30';
const labelCls = 'block text-xs font-bold uppercase tracking-widest text-text-primary/50 mb-1.5 font-body';

const TABS = ['Perfil', 'Segurança'];

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function Configuracoes() {
  const toast = useToast();
  const [form, setForm] = useState({ email: '', nome: '', novaSenha: '', confirmarSenha: '', fotoPerfil: null });
  const [fotoFile, setFotoFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [activeTab, setActiveTab] = useState('Perfil');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    auth.me().then((u) => {
      setForm((f) => ({ ...f, email: u.email, nome: u.nome, fotoPerfil: u.fotoPerfil || null }));
    }).catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, fotoPerfil: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleFoto = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (form.novaSenha && form.novaSenha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSalvando(true);
    try {
      if (fotoFile) {
        await auth.uploadFoto(fotoFile);
        setFotoFile(null);
      }
      const dto = { nome: form.nome, novaSenha: form.novaSenha || null };
      const atualizado = await auth.atualizarPerfil(dto);
      sessionStorage.setItem('usuario', JSON.stringify(atualizado));
      setForm((f) => ({ ...f, novaSenha: '', confirmarSenha: '' }));
      setSavedOk(true);
      toast.success('Perfil atualizado com sucesso!');
      setTimeout(() => setSavedOk(false), 2000);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil e credenciais de acesso" />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-medium p-1 rounded-xl border border-text-primary/5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all',
              activeTab === tab
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-primary/50 hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSalvar} className="space-y-6 bg-surface-medium rounded-2xl p-6 border border-text-primary/5 animate-fade-in">
        {activeTab === 'Perfil' && (
          <>
            {/* Avatar com drag-and-drop */}
            <div
              className={cn(
                'flex items-center gap-5 p-4 rounded-xl border-2 border-dashed transition-colors',
                dragging ? 'border-primary/40 bg-primary/5' : 'border-text-primary/10'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Alterar foto de perfil"
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-text-primary/10 hover:border-primary/60 transition-colors group bg-surface-highest flex items-center justify-center shrink-0"
              >
                {form.fotoPerfil ? (
                  <img src={form.fotoPerfil} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-text-primary select-none font-display">
                    {getInitials(form.nome)}
                  </span>
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </span>
              </button>
              <div>
                <p className="text-sm font-semibold text-text-primary">{form.nome || '—'}</p>
                <p className="text-xs text-text-primary/40 mt-0.5">{form.email}</p>
                <p className="text-xs text-text-primary/30 mt-1">Clique ou arraste uma imagem</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
                  Alterar foto
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            </div>

            <hr className="border-text-primary/5" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-primary/50">Dados Pessoais</span>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={cn(inputCls, 'opacity-50 cursor-not-allowed')} value={form.email} readOnly />
              </div>
              <div>
                <label className={labelCls}>Nome</label>
                <input
                  className={inputCls}
                  value={form.nome}
                  onChange={set('nome')}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'Segurança' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-text-primary/50">Alterar Senha</span>
            </div>
            <p className="text-xs text-text-primary/40">Deixe em branco para manter a senha atual.</p>
            <div>
              <label className={labelCls}>Nova Senha</label>
              <PasswordInput
                value={form.novaSenha}
                onChange={set('novaSenha')}
                placeholder="Mín. 8 chars — maiúscula, minúscula e número"
                minLength={form.novaSenha ? 8 : undefined}
              />
            </div>
            <div>
              <label className={labelCls}>Confirmar Nova Senha</label>
              <PasswordInput
                value={form.confirmarSenha}
                onChange={set('confirmarSenha')}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className={cn(
            'w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2',
            savedOk
              ? 'bg-primary text-on-primary'
              : 'bg-primary hover:opacity-90 text-on-primary disabled:opacity-50'
          )}
        >
          {salvando ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gravando...</>
          ) : savedOk ? (
            <><Check className="w-4 h-4" /> Salvo!</>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </form>
    </div>
  );
}
