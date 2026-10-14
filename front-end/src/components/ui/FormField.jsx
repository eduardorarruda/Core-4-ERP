import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

const FOCO = 'focus-visible:ring-2 focus-visible:ring-primary';

export const inputCls =
  `w-full bg-surface-low border border-text-primary/15 rounded-xl px-4 py-3 text-text-primary outline-none ${FOCO} text-sm transition-all placeholder:text-text-primary/50 font-body`;

export const inputSmCls =
  `w-full bg-surface-low border border-text-primary/15 rounded-xl px-4 py-2 min-h-11 text-text-primary outline-none ${FOCO} text-sm transition-all placeholder:text-text-primary/50 font-body`;

export const labelCls =
  'text-xs font-bold uppercase tracking-wider text-text-primary/70 font-body';

export const inputErrorCls =
  'w-full bg-surface-low border border-error/60 rounded-xl px-4 py-3 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-error text-sm transition-all placeholder:text-text-primary/50 font-body';

/** id da mensagem de erro de um campo (usado por aria-describedby). */
const idErro = (id) => (id ? `${id}-erro` : undefined);

/** Mensagem de erro de campo: anunciada pelo leitor de tela assim que aparece. */
function MensagemErro({ id, children }) {
  return <p id={id} role="alert" className="text-error text-xs mt-1">{children}</p>;
}

/** Junta ids de aria-describedby ignorando vazios. */
function juntarIds(...ids) {
  const lista = ids.flatMap((v) => (v ? String(v).split(' ') : [])).filter(Boolean);
  return lista.length ? [...new Set(lista)].join(' ') : undefined;
}

export function FormLabel({ children, required, htmlFor, id }) {
  return (
    <label className={labelCls} htmlFor={htmlFor} id={id}>
      {children}
      {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

export function FormInput({ error, small, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <input
        className={cn(base, className)}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={juntarIds(props['aria-describedby'], error && idErro(props.id))}
      />
      {error && <MensagemErro id={idErro(props.id)}>{error}</MensagemErro>}
    </div>
  );
}

export function PasswordInput({ error, className, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full relative">
      <input
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={juntarIds(props['aria-describedby'], error && idErro(props.id))}
        type={show ? 'text' : 'password'}
        className={cn(error ? inputErrorCls : inputCls, 'pr-12', className)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={show}
        className={cn('absolute right-0.5 top-0 min-w-11 h-[46px] grid place-items-center rounded-xl text-text-primary/60 hover:text-text-primary transition-colors outline-none', FOCO)}
      >
        {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      </button>
      {error && <MensagemErro id={idErro(props.id)}>{error}</MensagemErro>}
    </div>
  );
}

/* ── Floating label inputs (alinhados ao design system) ── */

export function FloatingInput({ id, label, value, onChange, type = 'text', error, className, validIcon, ...rest }) {
  return (
    <div className={cn('field-float', error && 'has-error', className)}>
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idErro(id) : undefined}
        {...rest}
      />
      <label htmlFor={id}>{label}</label>
      {validIcon && <span className="field-icon valid" aria-hidden="true">{validIcon}</span>}
      {error && <MensagemErro id={idErro(id)}>{error}</MensagemErro>}
    </div>
  );
}

export function FloatingPasswordInput({ id, label, value, onChange, error, className, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className={cn('field-float', error && 'has-error', className)}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder=" "
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idErro(id) : undefined}
        style={{ paddingRight: 52 }}
        {...rest}
      />
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        className={cn('field-icon min-w-11 min-h-11 justify-center rounded-xl outline-none', FOCO)}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={show}
        style={{ right: 4, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}
      >
        {show ? <EyeOff width={16} height={16} aria-hidden="true" /> : <Eye width={16} height={16} aria-hidden="true" />}
      </button>
      {error && <MensagemErro id={idErro(id)}>{error}</MensagemErro>}
    </div>
  );
}

export function FormSelect({ error, small, children, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <select
        className={cn(base, 'appearance-none', className)}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={juntarIds(props['aria-describedby'], error && idErro(props.id))}
      >
        {children}
      </select>
      {error && <MensagemErro id={idErro(props.id)}>{error}</MensagemErro>}
    </div>
  );
}

export function TextareaField({ error, className, rows = 3, ...props }) {
  return (
    <div className="w-full">
      <textarea
        rows={rows}
        className={cn(error ? inputErrorCls : inputCls, 'resize-none', className)}
        aria-invalid={error ? true : undefined}
        {...props}
        aria-describedby={juntarIds(props['aria-describedby'], error && idErro(props.id))}
      />
      {error && <MensagemErro id={idErro(props.id)}>{error}</MensagemErro>}
    </div>
  );
}

// Controles que recebem id/aria-* diretamente (nativos e os wrappers deste arquivo)
const CONTROLES_NATIVOS = new Set(['input', 'select', 'textarea']);
const CONTROLES_PROPRIOS = new Set([FormInput, FormSelect, TextareaField, PasswordInput]);

function ehControle(el) {
  return React.isValidElement(el) && (CONTROLES_NATIVOS.has(el.type) || CONTROLES_PROPRIOS.has(el.type));
}

/** Procura o 1º controle de formulário na árvore de children (sem entrar em <label>). */
function acharControle(children, profundidade = 0) {
  if (profundidade > 3) return null;
  let achado = null;
  // Children.forEach entrega os elementos originais (toArray clonaria e quebraria a comparação
  // por identidade usada em `injetar`)
  React.Children.forEach(children, (filho) => {
    if (achado || !React.isValidElement(filho)) return;
    if (ehControle(filho)) { achado = filho; return; }
    if (filho.type === 'label') return;
    if (typeof filho.type === 'string' && filho.props?.children) {
      achado = acharControle(filho.props.children, profundidade + 1);
    }
  });
  return achado;
}

/** Clona a árvore aplicando `extra` apenas no controle-alvo. */
function injetar(children, alvo, extra) {
  return React.Children.map(children, (filho) => {
    if (!React.isValidElement(filho)) return filho;
    if (filho === alvo) return React.cloneElement(filho, extra(filho));
    if (typeof filho.type === 'string' && filho.type !== 'label' && filho.props?.children) {
      return React.cloneElement(filho, undefined, injetar(filho.props.children, alvo, extra));
    }
    return filho;
  });
}

/**
 * Campo com rótulo acessível. Liga automaticamente o <label> ao controle filho (input,
 * select, textarea ou FormInput/FormSelect/...): gera um id com useId() quando o filho não
 * tem um, aplica aria-invalid/aria-required e aponta aria-describedby para o erro e a ajuda.
 *
 * Props: label, required, error, help (texto de apoio), htmlFor (força um id existente).
 */
export default function FormField({ label, required, error, help, htmlFor, children }) {
  const idGerado = useId();
  const controle = acharControle(children);
  const controleId = controle?.props?.id ?? htmlFor ?? idGerado;
  const ajudaId = help ? `${controleId}-ajuda` : undefined;
  const erroId = idErro(controleId);
  // Se o próprio controle recebe `error`, ele mesmo exibe a mensagem (com o mesmo id)
  const controleMostraErro = Boolean(controle?.props?.error) && CONTROLES_PROPRIOS.has(controle?.type);
  const temErro = Boolean(error || controle?.props?.error);

  const conteudo = controle
    ? injetar(children, controle, (el) => ({
      id: controleId,
      'aria-invalid': temErro ? true : el.props['aria-invalid'],
      'aria-required': required ? true : el.props['aria-required'],
      'aria-describedby': juntarIds(el.props['aria-describedby'], ajudaId, temErro && !controleMostraErro && erroId),
    }))
    : children;

  return (
    <div className="space-y-1.5">
      {label && (
        <FormLabel required={required} htmlFor={controle ? controleId : undefined}>
          {label}
        </FormLabel>
      )}
      {conteudo}
      {help && <p id={ajudaId} className="text-xs text-text-primary/70">{help}</p>}
      {error && !controleMostraErro && <MensagemErro id={erroId}>{error}</MensagemErro>}
    </div>
  );
}
