import React, { useId, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Zona de upload de arquivo .OFX compartilhada (conciliação bancária e de cartão).
 * Parametrizável por textos; acessível (label associado ao input, erro com role="alert").
 *
 * Props:
 * - onFile(file | null): callback quando um arquivo válido é escolhido ou removido
 * - titulo / subtitulo: textos do estado vazio
 */
export default function UploadZoneBase({ onFile, titulo, subtitulo }) {
  const inputRef = useRef(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState('');

  function validar(file) {
    if (!file) return 'Nenhum arquivo selecionado';
    if (!file.name.toLowerCase().endsWith('.ofx')) return 'Apenas arquivos .ofx são aceitos';
    if (file.size > 5 * 1024 * 1024) return 'Arquivo excede 5 MB';
    return '';
  }

  function selecionarArquivo(file) {
    const err = validar(file);
    if (err) { setErro(err); return; }
    setErro('');
    setArquivo(file);
    onFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    selecionarArquivo(e.dataTransfer.files[0]);
  }

  function limpar(e) {
    e.stopPropagation();
    setArquivo(null);
    setErro('');
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <div
        onClick={() => !arquivo && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 sm:p-10 cursor-pointer transition-all',
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : arquivo
            ? 'border-primary/40 bg-primary/5 cursor-default'
            : 'border-text-primary/20 bg-surface-medium hover:border-primary/40 hover:bg-primary/5'
        )}
      >
        <label htmlFor={inputId} className="sr-only">Selecionar arquivo .OFX</label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".ofx"
          className="sr-only"
          onChange={(e) => selecionarArquivo(e.target.files[0])}
        />

        {arquivo ? (
          <>
            <FileText className="w-10 h-10 text-primary" />
            <div className="text-center min-w-0 px-8">
              <p className="font-bold text-text-primary break-words">{arquivo.name}</p>
              <p className="text-xs text-text-primary/50">{(arquivo.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={limpar}
              aria-label="Remover arquivo selecionado"
              className="absolute top-2 right-2 w-11 h-11 grid place-items-center rounded-xl text-text-primary/40 hover:text-error hover:bg-error/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className={cn('w-10 h-10 transition-colors', dragging ? 'text-primary' : 'text-text-primary/30')} />
            <div className="text-center">
              <p className="font-bold text-text-primary">{titulo}</p>
              <p className="text-sm text-text-primary/50">{subtitulo}</p>
            </div>
          </>
        )}
      </div>

      {erro && <p role="alert" className="text-xs text-error mt-2">{erro}</p>}
    </div>
  );
}
