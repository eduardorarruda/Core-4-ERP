import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, KeyRound, LogOut, MonitorSmartphone } from 'lucide-react';
import { auth, clearAuth, getLoginState, setLoginState } from '../../lib/api';
import { useConfirm } from '../../hooks/useConfirm';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FormField, { PasswordInput } from '../ui/FormField';
import PasswordRules from '../ui/PasswordRules';
import { senhaValida } from '../../lib/senha';

/*
 * "Sair de todos os dispositivos": POST /api/auth/logout-todos revoga todos os tokens já
 * emitidos (incrementa a versão do token) e apaga o cookie desta sessão. Um 401 aqui quer dizer
 * que a sessão já tinha caído — o resultado é o mesmo.
 */
async function sairDeTodosOsDispositivos() {
  try {
    await auth.logoutTodos();
  } catch (err) {
    if (err?.status !== 401) throw err;
  }
}

function TrocarSenha({ toast, senhaProvisoria }) {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const set = (campo) => (e) => { setSalvo(false); setForm((f) => ({ ...f, [campo]: e.target.value })); };

  async function salvar(e) {
    e.preventDefault();
    const novos = {};
    if (!form.senhaAtual) novos.senhaAtual = senhaProvisoria ? 'Informe a senha provisória que você recebeu.' : 'Informe sua senha atual.';
    if (!senhaValida(form.novaSenha)) novos.novaSenha = 'A nova senha não atende aos requisitos abaixo.';
    if (form.novaSenha !== form.confirmarSenha) novos.confirmarSenha = 'As duas senhas não são iguais. Digite de novo.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setSalvando(true);
    try {
      await auth.trocarSenha(form.senhaAtual, form.novaSenha);
      const st = getLoginState();
      if (st?.senhaProvisoria) setLoginState({ ...st, senhaProvisoria: false });
      setForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setSalvo(true);
      toast.success('Senha alterada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card title="Alterar senha" subtitle="Use uma senha que você não usa em outros sites." icon={KeyRound}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        {senhaProvisoria && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-warning/35 bg-warning/10 p-3 text-sm text-text-primary">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            Você entrou com uma senha provisória. Crie uma senha sua para liberar o resto do sistema.
          </p>
        )}
        {salvo && (
          <p role="status" className="flex items-center gap-2 text-sm text-primary">
            <Check className="w-4 h-4" aria-hidden="true" /> Senha alterada com sucesso.
          </p>
        )}
        <FormField label={senhaProvisoria ? 'Senha provisória' : 'Senha atual'} required error={erros.senhaAtual}>
          <PasswordInput value={form.senhaAtual} onChange={set('senhaAtual')} autoComplete="current-password" error={erros.senhaAtual} />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nova senha" required error={erros.novaSenha}>
            <PasswordInput value={form.novaSenha} onChange={set('novaSenha')} autoComplete="new-password" error={erros.novaSenha} />
          </FormField>
          <FormField label="Confirmar nova senha" required error={erros.confirmarSenha}>
            <PasswordInput value={form.confirmarSenha} onChange={set('confirmarSenha')} autoComplete="new-password" error={erros.confirmarSenha} />
          </FormField>
        </div>
        <PasswordRules senha={form.novaSenha} />
        <div className="flex justify-end">
          <Button type="submit" loading={salvando} className="w-full sm:w-auto">
            {salvando ? 'Salvando…' : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Sessoes({ toast }) {
  const confirmar = useConfirm();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  async function sairDeTodos() {
    const ok = await confirmar({
      title: 'Sair de todos os dispositivos?',
      message: 'Você sai do Core 4 em todos os aparelhos e navegadores, inclusive neste. Vai ser preciso entrar de novo com e-mail e senha.',
      confirmLabel: 'Sair de todos',
      variant: 'warning',
    });
    if (!ok) return;
    setSaindo(true);
    try {
      await sairDeTodosOsDispositivos();
      clearAuth();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setSaindo(false);
    }
  }

  return (
    <Card
      title="Sessões"
      subtitle="Perdeu o celular ou entrou num computador que não é seu? Encerre todas as sessões."
      icon={MonitorSmartphone}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <p className="text-sm text-text-primary/75 leading-relaxed max-w-md">
          Encerra o acesso em todos os aparelhos onde sua conta está aberta. Seus dados continuam iguais.
        </p>
        <Button variant="secondary" onClick={sairDeTodos} loading={saindo} leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />} className="shrink-0">
          Sair de todos os dispositivos
        </Button>
      </div>
    </Card>
  );
}

/** Aba Segurança: trocar senha e encerrar todas as sessões. */
export default function AbaSeguranca({ toast, senhaProvisoria }) {
  return (
    <div className="space-y-5">
      <TrocarSenha toast={toast} senhaProvisoria={senhaProvisoria} />
      {!senhaProvisoria && <Sessoes toast={toast} />}
    </div>
  );
}
