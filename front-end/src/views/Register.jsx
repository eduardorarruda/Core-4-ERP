import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, ShieldCheck, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/api';
import { inputCls, labelCls, PasswordInput } from '../components/ui/FormField';

const stagger = (i) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: i * 0.07 } });

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErro('');
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não coincidem'); return; }
    if (form.senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres'); return; }
    setCarregando(true);
    try {
      const telefone = form.telefone ? Number(form.telefone.replace(/\D/g, '')) : null;
      await auth.registrar(form.nome, form.email, form.senha, telefone);
      const usuario = await auth.login(form.email, form.senha);
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      navigate('/dashboard');
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-surface">
      {/* Left: Form */}
      <section className="w-full lg:w-[450px] xl:w-[550px] flex flex-col justify-between p-8 md:p-16 bg-surface z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl shadow-lg shadow-primary/20">
            <Layout className="w-6 h-6 text-on-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-text-primary font-display">Core 4 ERP</h1>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <motion.header {...stagger(0)} className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary font-display mb-2">Criar conta</h2>
            <p className="text-text-primary/50 text-sm">Comece agora a gerenciar suas finanças.</p>
          </motion.header>

          <form className="space-y-4" onSubmit={handleRegistrar}>
            <motion.div {...stagger(1)} className="space-y-1.5">
              <label className={labelCls} htmlFor="nome">Nome completo</label>
              <input id="nome" className={inputCls} placeholder="Seu nome" type="text" value={form.nome} onChange={set('nome')} required />
            </motion.div>

            <motion.div {...stagger(2)} className="space-y-1.5">
              <label className={labelCls} htmlFor="email">Email</label>
              <input id="email" className={inputCls} placeholder="nome@empresa.com" type="email" value={form.email} onChange={set('email')} required />
            </motion.div>

            <motion.div {...stagger(3)} className="space-y-1.5">
              <label className={labelCls} htmlFor="telefone">
                Telefone <span className="normal-case text-text-primary/40">(opcional)</span>
              </label>
              <input id="telefone" className={inputCls} placeholder="(11) 99999-9999" type="tel" value={form.telefone} onChange={set('telefone')} />
            </motion.div>

            <motion.div {...stagger(4)} className="space-y-1.5">
              <label className={labelCls} htmlFor="senha">Senha</label>
              <PasswordInput id="senha" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={set('senha')} required />
            </motion.div>

            <motion.div {...stagger(5)} className="space-y-1.5">
              <label className={labelCls} htmlFor="confirmarSenha">Confirmar senha</label>
              <PasswordInput id="confirmarSenha" placeholder="Repita a senha" value={form.confirmarSenha} onChange={set('confirmarSenha')} required />
            </motion.div>

            {erro && (
              <motion.p
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3"
              >
                {erro}
              </motion.p>
            )}

            <motion.button
              {...stagger(6)}
              className="w-full bg-primary hover:opacity-90 text-on-primary font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              type="submit"
              disabled={carregando}
            >
              {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
              {carregando ? 'Criando conta…' : 'Criar conta'}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t border-text-primary/5 text-center">
            <p className="text-sm text-text-primary/50">
              Já tem uma conta?{' '}
              <a className="text-primary font-semibold hover:underline" href="/login">Fazer login</a>
            </p>
          </div>
        </div>

        <footer className="text-[10px] uppercase tracking-widest font-bold text-text-primary/40">
          © 2026 Core 4 ERP
        </footer>
      </section>

      {/* Right: Hero */}
      <section className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface/95 to-primary/5" />

        <div className="relative z-10 max-w-2xl px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1 mb-6 rounded-full border border-primary/20 bg-primary/5"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Comece hoje</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl xl:text-7xl font-bold tracking-tighter leading-[1.1] text-text-primary font-display mb-8"
          >
            Controle Total das Suas{' '}
            <span className="text-gradient-primary italic">Finanças</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <p className="text-lg xl:text-xl text-text-primary/60 font-light max-w-lg leading-relaxed">
              Gerencie contas, cartões, investimentos e parceiros em um único lugar.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-12">
              <div className="p-6 rounded-2xl bg-surface-highest/40 backdrop-blur-md border border-text-primary/5">
                <ShieldCheck className="w-8 h-8 text-primary mb-3" />
                <div className="text-xs font-bold uppercase tracking-widest text-text-primary/50 mb-1">Segurança</div>
                <div className="text-lg font-bold text-text-primary font-display">JWT + BCrypt</div>
              </div>
              <div className="p-6 rounded-2xl bg-surface-highest/40 backdrop-blur-md border border-text-primary/5">
                <TrendingUp className="w-8 h-8 text-secondary mb-3" />
                <div className="text-xs font-bold uppercase tracking-widest text-text-primary/50 mb-1">Módulos</div>
                <div className="text-2xl font-bold text-text-primary font-display">6+</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
