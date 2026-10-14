import React, { useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FileUp, FolderOpen, LoaderCircle, TriangleAlert, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import FormField, { FormSelect } from '../ui/FormField';
import { Revelar } from '../motion/Movimento';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

function validarArquivo(file) {
  if (!file) return 'Nenhum arquivo foi escolhido.';
  if (!file.name.toLowerCase().endsWith('.ofx')) return 'Esse arquivo não é um extrato OFX. Escolha um arquivo que termine em .ofx.';
  if (file.size > TAMANHO_MAXIMO) return 'O arquivo passa de 5 MB. Exporte um período menor no banco e tente de novo.';
  return '';
}

/**
 * Envio do extrato OFX. Processa assim que o arquivo é escolhido (arrastar e soltar OU botão
 * "Escolher arquivo" — WCAG 2.5.7: arrastar nunca é o único jeito). Se o backend não reconhecer
 * a conta/cartão do arquivo, pede o destino e reenvia o mesmo arquivo.
 *
 * Props: cfg (modos.js), onSessaoCriada(sessao), desabilitado (sem permissão de importar).
 */
export default function UploadOfx({ cfg, onSessaoCriada, desabilitado = false }) {
  const toast = useToast();
  const reduzir = useReducedMotion();
  const inputRef = useRef(null);
  const inputId = useId();
  const ajudaId = useId();
  const erroId = useId();
  const [arrastando, setArrastando] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [destino, setDestino] = useState(null); // { numero, opcoes: [{value,label}], escolhido }

  async function enviar(file, destinoId = null) {
    setEnviando(true);
    setErro('');
    try {
      const sessao = await cfg.api.upload(file, destinoId || null);
      setDestino(null);
      onSessaoCriada(sessao);
    } catch (e) {
      const msg = e?.message ?? '';
      if (msg.startsWith(cfg.destino.erroPrefixo)) {
        const numero = msg.slice(cfg.destino.erroPrefixo.length);
        const lista = await cfg.destino.listar().catch(() => []);
        setDestino({ numero, opcoes: (lista ?? []).map(cfg.destino.opcao), escolhido: '' });
      } else {
        setErro(msg || 'Não foi possível ler o extrato. Confira o arquivo e tente de novo.');
        toast.error(msg || 'Não foi possível ler o extrato.');
      }
    } finally {
      setEnviando(false);
    }
  }

  function escolher(file) {
    if (desabilitado || enviando) return;
    const problema = validarArquivo(file);
    if (problema) {
      setErro(problema);
      return;
    }
    setArquivo(file);
    setDestino(null);
    enviar(file);
  }

  function aoSoltar(e) {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer?.files?.[0]);
  }

  function abrirSeletor() {
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }

  const destinoId = `${inputId}-destino`;

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); if (!desabilitado) setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        animate={reduzir ? undefined : { scale: arrastando ? 1.01 : 1 }}
        transition={{ duration: 0.16 }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-4 py-8 sm:py-10 text-center transition-colors',
          arrastando ? 'border-primary bg-primary/[0.07]' : 'border-border-strong bg-surface-medium/50',
          desabilitado && 'opacity-60'
        )}
        aria-busy={enviando || undefined}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid place-items-center w-14 h-14 rounded-2xl border transition-colors',
            arrastando || enviando ? 'border-primary/40 bg-primary/[0.12] text-primary' : 'border-border-strong bg-surface-high text-text-primary/70'
          )}
        >
          {enviando ? <LoaderCircle className="w-7 h-7 motion-safe:animate-spin" /> : <FileUp className="w-7 h-7" />}
        </span>

        <div className="space-y-1 max-w-md">
          <p className="font-display font-semibold text-text-primary">
            {enviando ? `Lendo ${arquivo?.name ?? 'o extrato'}…` : arrastando ? 'Pode soltar o arquivo' : 'Arraste o arquivo .ofx para cá'}
          </p>
          <p id={ajudaId} className="text-sm text-text-primary/65">
            {enviando
              ? 'Estamos comparando cada movimento com o que já está cadastrado.'
              : 'Ou escolha no computador. Até 5 MB. A leitura começa assim que o arquivo é escolhido.'}
          </p>
        </div>

        <label htmlFor={inputId} className="sr-only">Arquivo OFX do extrato</label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".ofx"
          className="sr-only"
          tabIndex={-1}
          aria-describedby={ajudaId}
          disabled={desabilitado || enviando}
          onChange={(e) => escolher(e.target.files?.[0])}
        />
        <Button
          variant="secondary"
          onClick={abrirSeletor}
          disabled={desabilitado || enviando}
          leftIcon={<FolderOpen className="w-4 h-4" aria-hidden="true" />}
          aria-describedby={erro ? erroId : ajudaId}
        >
          Escolher arquivo
        </Button>
        {desabilitado && (
          <p className="text-xs text-text-primary/65">Você pode ver as conciliações, mas não tem permissão para importar extratos.</p>
        )}
      </motion.div>

      {erro && (
        <p id={erroId} role="alert" className="flex items-start gap-2 text-sm text-error">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}

      <Revelar aberto={Boolean(destino)}>
        {destino && (
          <div className="rounded-2xl border border-warning/30 bg-warning/[0.08] p-4 space-y-3">
            <p className="flex items-start gap-2 text-sm text-text-primary">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              {cfg.destino.aviso(destino.numero)}
            </p>
            <form
              className="flex flex-col sm:flex-row sm:items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); if (destino.escolhido && arquivo) enviar(arquivo, destino.escolhido); }}
            >
              <div className="flex-1 min-w-0">
                <FormField label={cfg.destino.rotulo} required htmlFor={destinoId}>
                  <FormSelect
                    id={destinoId}
                    value={destino.escolhido}
                    onChange={(e) => setDestino((d) => ({ ...d, escolhido: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {destino.opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </FormSelect>
                </FormField>
              </div>
              <Button
                type="submit"
                loading={enviando}
                disabled={!destino.escolhido}
                rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                Continuar
              </Button>
            </form>
          </div>
        )}
      </Revelar>
    </div>
  );
}
