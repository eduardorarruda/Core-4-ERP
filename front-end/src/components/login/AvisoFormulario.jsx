import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Aviso de formulário das telas públicas (erro/sucesso/info) com entrada animada e leve
 * "tremida" no erro. Anunciado ao leitor de tela (role alert/status).
 * Props: tipo ('erro' | 'sucesso' | 'info'), children (mensagem; vazio = some), className.
 */
const TIPOS = {
  erro: { Icone: CircleAlert, classe: 'bg-error/10 border-error/25 text-error', papel: 'alert' },
  sucesso: { Icone: CircleCheck, classe: 'bg-primary/10 border-primary/25 text-primary', papel: 'status' },
  info: { Icone: Info, classe: 'bg-text-primary/[0.05] border-border-strong text-text-primary/80', papel: 'status' },
};

export default function AvisoFormulario({ tipo = 'erro', children, className }) {
  const reduzir = useReducedMotion();
  const t = TIPOS[tipo] ?? TIPOS.erro;
  const { Icone } = t;
  return (
    <div role={t.papel} aria-live={t.papel === 'alert' ? 'assertive' : 'polite'}>
      <AnimatePresence initial={false}>
        {children && (
          <motion.div
            key={String(children)}
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, x: tipo === 'erro' && !reduzir ? [0, -5, 5, -3, 3, 0] : 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.3 }}
            className={cn('flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-sm leading-snug', t.classe, className)}
          >
            <Icone className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
