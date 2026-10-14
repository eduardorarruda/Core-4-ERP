import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, User } from 'lucide-react';
import { auth, setLoginState } from '../lib/api';
import { getFirstAccessibleRoute } from '../lib/routeUtils';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules from '../components/ui/PasswordRules';
import { SegmentedControl } from '../components/ui/Tabs';
import { senhaValida } from '../lib/senha';
import Button from '../components/ui/Button';
import AuthLayout from '../components/login/AuthLayout';
import AvisoFormulario from '../components/login/AvisoFormulario';
import { Revelar, Stagger, StaggerItem } from '../components/motion/Movimento';
import { VERSAO_TERMOS } from '../content/legal';
import { usePageMeta } from '../hooks/usePageMeta';

const LINK_TEXTO = 'text-primary font-medium underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const TIPOS_CONTA = [
  { value: 'EMPRESA', label: 'Empresa', icon: Building2 },
  { value: 'PESSOA_FISICA', label: 'Uso pessoal', icon: User },
];

export default function Register() {
  usePageMeta({
    title: 'Criar conta',
    canonical: '/register',
    description: 'Crie sua conta gratuita no Core 4 e organize contas a pagar e receber, cartões de crédito, conciliação bancária e relatórios.',
  });
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', tipoConta: 'EMPRESA', nomeEmpresa: '' });
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [erroAceite, setErroAceite] = useState('');
  const [carregando, setCarregando] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const empresaFaltando = form.tipoConta === 'EMPRESA' && !form.nomeEmpresa.trim();

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErro('');
    setErroConfirmacao('');
    setErroEmpresa('');
    setErroAceite('');
    if (empresaFaltando) {
      setErroEmpresa('Informe o nome da empresa para criar uma conta empresarial.');
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setErroConfirmacao('As senhas não coincidem.');
      return;
    }
    if (!senhaValida(form.senha)) {
      setErro('A senha não atende aos requisitos de segurança.');
      return;
    }
    if (!aceite) {
      setErroAceite('Para criar a conta, é preciso aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setCarregando(true);
    try {
      const telefone = form.telefone ? form.telefone.replace(/\D/g, '') : null;
      const nomeEmpresa = form.tipoConta === 'EMPRESA' ? form.nomeEmpresa.trim() : undefined;
      await auth.registrar(form.nome, form.email, form.senha, telefone, form.tipoConta, nomeEmpresa, VERSAO_TERMOS);
      const result = await auth.login(form.email, form.senha);
      setLoginState(result);
      const permSet = new Set(result.empresas?.[0]?.permissoes ?? []);
      const check = (cod) => result.adminSistema || permSet.has(cod);
      navigate(getFirstAccessibleRoute(check));
    } catch (err) {
      setErro(err.message || 'Não foi possível criar a conta.');
    } finally {
      setCarregando(false);
    }
  };

  const submitDisabled = carregando || empresaFaltando || !senhaValida(form.senha) || form.senha !== form.confirmarSenha;

  return (
    <AuthLayout
      larguraForm="max-w-[420px]"
      heroTitulo={<>Comece <span className="c4-text-emerald">organizado</span> desde o primeiro lançamento.</>}
      heroSubtitulo="Para uso pessoal ou para a sua empresa, com perfis de acesso para quem trabalha com você. Grátis."
    >
      <Stagger>
        <StaggerItem>
          <h1 className="font-display text-[2rem] sm:text-[2.25rem] font-semibold tracking-[-0.03em] leading-tight">
            Criar sua <span className="c4-text-emerald">conta</span>
          </h1>
        </StaggerItem>
        <StaggerItem>
          <p className="mt-2 text-sm text-text-primary/65">É grátis e leva menos de um minuto.</p>
        </StaggerItem>

        <StaggerItem>
          <form onSubmit={handleRegistrar} noValidate className="mt-7 space-y-3">
            <fieldset>
              <legend className="text-[0.8125rem] font-medium text-text-primary/75 mb-2">Como você vai usar o Core 4?</legend>
              <SegmentedControl
                label="Tipo de conta"
                fullWidth
                items={TIPOS_CONTA}
                value={form.tipoConta}
                onChange={(v) => { setForm((f) => ({ ...f, tipoConta: v })); setErroEmpresa(''); }}
              />
            </fieldset>

            <Revelar aberto={form.tipoConta === 'EMPRESA'}>
              <div className="pt-1">
                <FloatingInput
                  id="nomeEmpresa"
                  label="Nome da empresa"
                  type="text"
                  value={form.nomeEmpresa}
                  onChange={(e) => { set('nomeEmpresa')(e); setErroEmpresa(''); }}
                  autoComplete="organization"
                  error={erroEmpresa || undefined}
                  required
                />
              </div>
            </Revelar>

            <FloatingInput id="nome" label="Seu nome" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
            <FloatingInput id="email" label="E-mail" type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            <FloatingInput id="telefone" label="Telefone (opcional)" type="tel" inputMode="tel" value={form.telefone} onChange={set('telefone')} autoComplete="tel" />

            <FloatingPasswordInput id="senha" label="Senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" aria-describedby="regras-senha" required />
            <PasswordRules id="regras-senha" senha={form.senha} className="pl-1" />
            <FloatingPasswordInput
              id="confirmarSenha"
              label="Confirmar senha"
              value={form.confirmarSenha}
              onChange={(e) => { set('confirmarSenha')(e); setErroConfirmacao(''); }}
              autoComplete="new-password"
              error={erroConfirmacao || undefined}
              required
            />

            {/* Consentimento (LGPD art. 8º): caixa desmarcada por padrão, obrigatória */}
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

            <Button type="submit" size="lg" fullWidth loading={carregando} disabled={submitDisabled} className="mt-2">
              {carregando ? 'Criando conta…' : 'Criar minha conta'}
            </Button>
          </form>
        </StaggerItem>

        <StaggerItem>
          <p className="mt-7 text-center text-sm text-text-primary/65">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary font-semibold rounded hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Entrar</Link>
          </p>
        </StaggerItem>
      </Stagger>
    </AuthLayout>
  );
}
