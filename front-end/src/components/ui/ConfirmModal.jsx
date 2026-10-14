import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmação — construído sobre o Modal base.
 *
 * API pública preservada (não alterar sem revisar os chamadores):
 * - title, message: textos exibidos ao usuário
 * - confirmLabel / cancelLabel: rótulos dos botões
 * - variant: 'danger' | 'error' | 'warning' | 'default'  → controla a cor do botão/ícone
 * - details: lista opcional de itens exibidos em destaque
 * - onConfirm / onCancel: callbacks das ações
 * - loading: quando true, o botão de confirmar mostra spinner e é desabilitado
 *
 * O componente é montado condicionalmente pelos chamadores
 * ({condicao && <ConfirmModal .../>}), portanto sempre aparece aberto.
 */
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
  // Variantes destrutivas (danger/error) usam o token de erro; as demais, o acento primário.
  const destrutivo = variant === 'danger' || variant === 'error';

  return (
    <Modal open onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              destrutivo ? 'bg-error/15' : 'bg-secondary/15'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 ${destrutivo ? 'text-error' : 'text-secondary'}`} />
          </div>
          <p className="text-text-primary/70 text-sm mt-1 leading-relaxed">{message}</p>
        </div>

        {details && details.length > 0 && (
          <ul className="bg-surface rounded-xl p-3 space-y-1.5">
            {details.map((d, i) => (
              <li key={i} className="text-xs text-text-primary/60 flex items-center gap-2">
                <span className="w-1 h-1 bg-text-primary/30 rounded-full shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        )}

        <Modal.Footer>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destrutivo ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}
