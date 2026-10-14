import React, { useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { cartoes as cartoesApi } from '../../lib/api';
import { formatarNumero } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/*
 * Importar lançamentos de uma planilha (.xlsx) para um cartão.
 * Escolher (ou arrastar) o arquivo → Importar → resumo com o que entrou e o que ficou de fora.
 * Props: open, cartao, onImportado(resultado) (chamado quando algo foi criado), onFechar.
 */

const COLUNAS = ['Data da Compra', 'Descrição', 'Valor', 'Categoria', 'CGC PARCEIRO', 'Número de Parcelas'];
const TAMANHO_MAX = 10 * 1024 * 1024;

const tamanho = (bytes) => (bytes < 1024 * 1024
  ? `${formatarNumero(bytes / 1024, 'number', { casas: 0 })} KB`
  : `${formatarNumero(bytes / (1024 * 1024), 'number', { casas: 1 })} MB`);

function Numero({ valor, rotulo, tom = 'neutro' }) {
  return (
    <div className={cn('rounded-xl p-3 border', tom === 'primary' ? 'bg-primary/10 border-primary/25' : 'bg-surface-medium/60 border-border')}>
      <p className={cn('font-display text-2xl font-semibold tabular-nums', tom === 'primary' ? 'text-primary' : 'text-text-primary')}>{valor}</p>
      <p className="text-xs text-text-primary/70">{rotulo}</p>
    </div>
  );
}

function Conteudo({ cartao, onImportado, onFechar, ocupado, setOcupado }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState(null);

  function escolher(f) {
    setErro('');
    if (!f) return;
    if (!/\.xlsx?$/i.test(f.name)) { setErro('Escolha um arquivo do Excel (.xlsx).'); return; }
    if (f.size > TAMANHO_MAX) { setErro('O arquivo passa de 10 MB. Divida a planilha e tente de novo.'); return; }
    setArquivo(f);
  }

  async function importar() {
    if (!arquivo) return;
    setOcupado(true);
    setErro('');
    try {
      const res = await cartoesApi.lancamentos.importar(cartao.id, arquivo);
      setResultado(res);
      if (res.lancamentosCriados > 0) onImportado?.(res);
    } catch (err) {
      setErro(err?.message || 'Não foi possível importar a planilha. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  if (resultado) {
    return (
      <div className="space-y-4" role="status">
        <div className="grid grid-cols-2 gap-3">
          <Numero valor={resultado.lancamentosCriados} rotulo="lançamentos criados (com parcelas)" tom="primary" />
          <Numero valor={`${resultado.linhasImportadas}/${resultado.totalLinhas}`} rotulo="linhas da planilha importadas" />
        </div>
        <ul className="space-y-1.5 text-sm text-text-primary/80">
          {resultado.categoriasCriadas > 0 && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-income" aria-hidden="true" />{resultado.categoriasCriadas} categoria(s) nova(s) criada(s)</li>}
          {resultado.parceirosCriados > 0 && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-income" aria-hidden="true" />{resultado.parceirosCriados} parceiro(s) novo(s), com dados da Receita</li>}
          {resultado.ignorados > 0 && <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-text-primary/50" aria-hidden="true" />{resultado.ignorados} linha(s) já existiam e foram ignoradas</li>}
        </ul>
        {resultado.erros?.length > 0 && (
          <div className="rounded-xl p-3 bg-error/10 border border-error/25 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold text-error mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />{resultado.erros.length} linha(s) não entraram
            </p>
            <ul className="space-y-1 text-xs text-text-primary/75">
              {resultado.erros.map((er) => <li key={`${er.linha}-${er.motivo}`}><span className="font-medium">Linha {er.linha}:</span> {er.motivo}</li>)}
            </ul>
          </div>
        )}
        <Modal.Footer>
          <Button variant="ghost" onClick={() => { setResultado(null); setArquivo(null); }}>Importar outra</Button>
          <Button onClick={onFechar}>Concluir</Button>
        </Modal.Footer>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-3.5 bg-surface-medium/60 border border-border text-sm text-text-primary/75 space-y-2">
        <p className="flex items-center gap-2 font-medium text-text-primary">
          <FileSpreadsheet className="w-4 h-4 text-primary" aria-hidden="true" /> Colunas esperadas
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Colunas da planilha">
          {COLUNAS.map((c) => <li key={c} className="px-2 py-0.5 rounded-md bg-surface-high/70 border border-border text-xs">{c}</li>)}
        </ul>
        <p className="text-xs">Categorias e parceiros que não existirem são criados (parceiro pelo CNPJ, com dados da Receita).</p>
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files?.[0]); }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 min-h-36 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
          'focus-within:ring-2 focus-within:ring-primary',
          arrastando ? 'border-primary bg-primary/10' : 'border-border-strong hover:border-primary/50 hover:bg-primary/[0.04]',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => escolher(e.target.files?.[0])}
        />
        <span className="grid place-items-center w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20" aria-hidden="true">
          <Upload className="w-5 h-5" />
        </span>
        <span className="text-sm font-medium text-text-primary">Escolha a planilha ou arraste para cá</span>
        <span className="text-xs text-text-primary/60">Arquivo .xlsx de até 10 MB</span>
      </label>

      {arquivo && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-medium/60 px-3 py-2">
          <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-primary truncate">{arquivo.name}</p>
            <p className="text-xs text-text-primary/60">{tamanho(arquivo.size)}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remover arquivo" disabled={ocupado} onClick={() => { setArquivo(null); if (inputRef.current) inputRef.current.value = ''; }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      {erro && <p role="alert" className="text-sm text-error">{erro}</p>}

      <Modal.Footer>
        <Button variant="ghost" onClick={onFechar} disabled={ocupado}>Cancelar</Button>
        <Button onClick={importar} loading={ocupado} disabled={!arquivo} leftIcon={<Upload className="w-4 h-4" aria-hidden="true" />}>
          Importar
        </Button>
      </Modal.Footer>
    </div>
  );
}

export default function ImportarPlanilhaModal({ open, cartao, onImportado, onFechar }) {
  const [ocupado, setOcupado] = useState(false);
  const fechar = () => { if (!ocupado) onFechar?.(); };
  return (
    <Modal
      open={open}
      onClose={fechar}
      closeOnEsc={!ocupado}
      closeOnOverlay={!ocupado}
      title="Importar planilha"
      description={cartao ? `Os lançamentos entram no ${cartao.nome}.` : undefined}
      icon={FileSpreadsheet}
    >
      {open && cartao && (
        <Conteudo key={cartao.id} cartao={cartao} onImportado={onImportado} onFechar={fechar} ocupado={ocupado} setOcupado={setOcupado} />
      )}
    </Modal>
  );
}
