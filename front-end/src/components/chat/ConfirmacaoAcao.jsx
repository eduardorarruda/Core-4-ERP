import React from 'react';
import { motion } from 'motion/react';
import { Check, ShieldAlert, X } from 'lucide-react';
import Button from '../ui/Button';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { MOLA } from '../motion/presets';
import { cn } from '../../lib/utils';

/**
 * Cartão "Confirmação necessária": aparece embaixo da resposta da Áurea quando ela pede o seu OK
 * para uma ação que mexe em dinheiro ou exclui dados (portão de 2 turnos do backend).
 * Os botões enviam "sim" ou "não" como a sua próxima mensagem — o backend só executa com a
 * confirmação explícita no turno seguinte.
 *
 * Props: onConfirmar, onCancelar, desabilitado (enquanto há resposta em andamento), compacto.
 */
export default function ConfirmacaoAcao({ onConfirmar, onCancelar, desabilitado = false, compacto = false }) {
  const reduzir = useMovimentoReduzido();
  return (
    <motion.div
      role="group"
      aria-label="Confirmação necessária"
      initial={reduzir ? false : { opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOLA.suave}
      className={cn(
        'mt-3 rounded-2xl border border-warning/35 bg-warning/[0.07] shadow-[var(--shadow-card)]',
        compacto ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-warning/15 text-warning" aria-hidden="true">
          <ShieldAlert className="w-[1.125rem] h-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary font-display">Confirmação necessária</p>
          <p className="text-sm text-text-primary/75 mt-0.5 leading-relaxed">
            Confira o resumo acima. Nada foi feito ainda: a Áurea só executa depois do seu OK.
          </p>
        </div>
      </div>
      <div className={cn('mt-3 flex gap-2', compacto ? 'flex-col' : 'flex-col-reverse sm:flex-row sm:justify-end')}>
        <Button
          variant="secondary"
          size={compacto ? 'sm' : 'md'}
          onClick={onCancelar}
          disabled={desabilitado}
          leftIcon={<X className="w-4 h-4" aria-hidden="true" />}
        >
          Cancelar
        </Button>
        <Button
          size={compacto ? 'sm' : 'md'}
          onClick={onConfirmar}
          disabled={desabilitado}
          leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
        >
          Confirmar
        </Button>
      </div>
    </motion.div>
  );
}
