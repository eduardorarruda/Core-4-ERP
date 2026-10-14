import React from 'react';
import { TriangleAlert, CircleHelp } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmação — construído sobre o Modal base (herda a animação de entrada).
 *
 * API pública preservada (não alterar sem revisar os chamadores):
 * - title, message: textos exibidos ao usuário
 * - confirmLabel / cancelLabel: rótulos dos botões
 * - variant: 'danger' | 'error' | 'warning' | 'default'  → cor do ícone e do botão
 * - details: lista opcional de itens afetados (exibidos em destaque)
 * - onConfirm / onCancel: callbacks das ações
 * - loading: quando true, o botão de confirmar mostra o giro e é desabilitado
 *
 * O componente é montado condicionalmente pelos chamadores
 * ({condicao && <ConfirmModal .../>}), portanto sempre aparece aberto.
 */
const TONS = {
  destrutivo: { caixa: 'bg-error/[0.12] text-error border-error/25', Icone: TriangleAlert },
  aviso: { caixa: 'bg-warning/[0.12] text-warning border-warning/25', Icone: TriangleAlert },
  neutro: { caixa: 'bg-primary/[0.12] text-primary border-primary/20', Icone: CircleHelp },
};

export default function ConfirmModal({
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  details,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const destrutivo = variant === 'danger' || variant === 'error';
  const tom = destrutivo ? TONS.destrutivo : variant === 'warning' ? TONS.aviso : TONS.neutro;
  const { Icone } = tom;

  return (
    <Modal open onClose={onCancel} title={title} size="sm" closeOnOverlay={!loading} closeOnEsc={!loading}>
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className={cn('grid place-items-center shrink-0 w-11 h-11 rounded-xl border', tom.caixa)}>
            <Icone className="w-5 h-5" />
          </span>
          <p className="text-sm text-text-primary/75 leading-relaxed pt-0.5 text-pretty">{message}</p>
        </div>

        {details && details.length > 0 && (
          <ul className="rounded-xl border border-text-primary/[0.08] bg-text-primary/[0.03] p-3 space-y-1.5">
            {details.map((d, i) => (
              <li key={i} className="text-sm text-text-primary/75 flex items-start gap-2">
                <span aria-hidden="true" className="mt-2 w-1 h-1 rounded-full bg-text-primary/40 shrink-0" />
                <span className="min-w-0">{d}</span>
              </li>
            ))}
          </ul>
        )}

        <Modal.Footer className="flex-col-reverse sm:flex-row">
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={destrutivo ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}
