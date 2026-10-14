import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { auth, clearAuth } from '../../lib/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FormField, { PasswordInput } from '../ui/FormField';

/**
 * Confirmação de exclusão de conta (LGPD art. 18, VI). Pede a senha e explica o que
 * acontece com os dados. Em caso de sucesso o backend anonimiza a conta e limpa o cookie.
 */
export default function ExcluirContaModal({ open, onClose }) {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const fechar = () => {
    if (excluindo) return;
    setSenha('');
    setErro('');
    onClose();
  };

  async function confirmar(e) {
    e.preventDefault();
    if (!senha) { setErro('Digite sua senha para confirmar.'); return; }
    setExcluindo(true);
    setErro('');
    try {
      await auth.excluirConta(senha);
      clearAuth();
      navigate('/login', { replace: true, state: { contaExcluida: true } });
    } catch (err) {
      // 409: proprietário de empresa com outros membros ativos; 400/401: senha incorreta.
      // A mensagem do backend explica o motivo — exibimos como veio.
      setErro(err.message || 'Não foi possível excluir a conta. Tente novamente.');
      setExcluindo(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      closeOnEsc={!excluindo}
      closeOnOverlay={!excluindo}
      title="Excluir minha conta"
      size="md"
    >
      <form onSubmit={confirmar} className="space-y-4" noValidate>
        <div className="space-y-2 text-sm text-text-primary/80 leading-relaxed">
          <p>Ao confirmar:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>seus dados pessoais (nome, e-mail, telefone e foto) são anonimizados;</li>
            <li>você perde o acesso e não consegue mais entrar com este e-mail e senha;</li>
            <li>só fica guardado o que a lei obriga a manter, pelo prazo exigido.</li>
          </ul>
          <p>
            Se você é proprietário de uma empresa que ainda tem outros membros ativos, transfira a
            propriedade ou remova os membros antes de excluir a conta.
          </p>
          <p className="font-semibold text-text-primary">Esta ação não pode ser desfeita.</p>
        </div>

        <FormField label="Sua senha" required error={erro}>
          <PasswordInput
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(''); }}
            autoComplete="current-password"
          />
        </FormField>

        <Modal.Footer className="flex-col-reverse sm:flex-row">
          <Button variant="ghost" onClick={fechar} disabled={excluindo} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={excluindo}
            leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
            className="w-full sm:w-auto"
          >
            {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
