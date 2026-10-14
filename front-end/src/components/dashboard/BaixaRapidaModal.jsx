import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import BaixaForm from '../forms/BaixaForm';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * "Paguei" / "Recebi" no Início e no Calendário: o formulário ÚNICO de baixa
 * (components/forms/BaixaForm — o mesmo de Contas a pagar e receber) dentro de um modal.
 *
 *   <BaixaRapidaModal key={conta?.id} conta={conta} onClose={fechar} onBaixada={recarregar} />
 *
 * Props: conta (ContaResponseDto | null = fechado), onClose, onBaixada(conta).
 * Sem CONTA_CORRENTE_VISUALIZAR não dá para escolher a conta bancária: o modal explica isso.
 */
export default function BaixaRapidaModal({ conta, onClose, onBaixada }) {
  const { temPermissao } = useAuth();
  const toast = useToast();
  const receber = conta?.tipo === 'RECEBER';
  const podeVerContas = temPermissao('CONTA_CORRENTE_VISUALIZAR');

  const concluir = (atualizada) => {
    toast.success(receber ? 'Recebimento registrado.' : 'Pagamento registrado.');
    onBaixada?.(atualizada ?? conta);
    onClose?.();
  };

  return (
    <Modal
      open={Boolean(conta)}
      onClose={onClose}
      size="sm"
      icon={CheckCircle2}
      title={receber ? 'Registrar recebimento' : 'Registrar pagamento'}
    >
      {conta && (podeVerContas ? (
        <BaixaForm conta={conta} onSalvo={concluir} onCancelar={onClose} />
      ) : (
        <p role="alert" className="text-sm text-warning">
          Você não tem acesso às contas bancárias, então não dá para escolher de onde o dinheiro {receber ? 'entrou' : 'saiu'}.
          Peça a permissão ao administrador da empresa.
        </p>
      ))}
    </Modal>
  );
}
