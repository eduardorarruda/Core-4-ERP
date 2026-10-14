import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// O PDF é impresso (fundo branco): cores fixas em RGB, da marca Core 4 (esmeralda) com contraste
// AA para texto escuro sobre a faixa. Não dependem do tema da tela.
const PRIMARY = [20, 226, 156];   // esmeralda da marca
const ON_PRIMARY = [3, 26, 20];   // petróleo quase preto

/** 'yyyy-MM-dd' → 'dd/MM/yyyy' (texto já em outro formato passa direto). */
function dataBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? '');
}

/**
 * PDF de um relatório em tabela.
 * @param {string} titulo
 * @param {{inicio: string, fim: string} | null} periodo  null = relatório sem período (situação de hoje)
 * @param {{cabecalho: string[], linhas: any[][], totais?: any[]}} dados
 */
export function gerarPDF(titulo, periodo, dados) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 297, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...ON_PRIMARY);
  doc.text(titulo, 10, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const hoje = new Date().toLocaleDateString('pt-BR');
  doc.text(periodo ? `Período: ${dataBr(periodo.inicio)} a ${dataBr(periodo.fim)}` : `Situação em ${hoje}`, 200, 13);

  // ── Tabela ─────────────────────────────────────────────────────────────────
  const bodyRows = dados.linhas.map(row =>
    row.map(cell => {
      if (typeof cell === 'number') {
        return cell.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return cell ?? '';
    })
  );

  const footRows = dados.totais
    ? [dados.totais.map(cell => {
        if (cell == null) return '';
        if (typeof cell === 'number') return cell.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        return cell;
      })]
    : [];

  autoTable(doc, {
    head: [dados.cabecalho],
    body: bodyRows,
    foot: footRows,
    startY: 25,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [60, 60, 60],
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: ON_PRIMARY,
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: [230, 230, 230],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  });

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const geradoEm = new Date().toLocaleString('pt-BR');
    doc.text(`Core 4 — Gerado em ${geradoEm}`, 10, 205);
    doc.text(`Página ${i} de ${pageCount}`, 260, 205);
  }

  const sufixo = periodo ? `${periodo.inicio}_${periodo.fim}` : new Date().toISOString().slice(0, 10);
  const nomeArquivo = `${titulo.replace(/ /g, '_')}_${sufixo}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Gera o PDF de um relatório de conciliação (bancária ou de cartão).
 *
 * Centraliza o cabeçalho, a tabela e o rodapé que antes estavam duplicados
 * byte-a-byte em ConciliacaoRelatorio.jsx e ConciliacaoCartaoRelatorio.jsx.
 * A montagem das linhas (que depende dos rótulos de status de cada fluxo)
 * permanece em cada view — aqui recebemos apenas o resultado pronto.
 *
 * @param {Object}   opts
 * @param {string}   opts.titulo       Título do cabeçalho (ex.: "Relatório de Conciliação #12").
 * @param {string}  [opts.subtitulo]   Texto alinhado à direita (conta/cartão).
 * @param {string[]} opts.cabecalho    Cabeçalho da tabela.
 * @param {Array[]}  opts.linhas       Linhas já formatadas da tabela.
 * @param {string}   opts.nomeArquivo  Nome do arquivo salvo (.pdf).
 */
export function exportarRelatorioConciliacaoPdf({ titulo, subtitulo, cabecalho, linhas, nomeArquivo }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 297, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...ON_PRIMARY);
  doc.text(titulo, 10, 13);
  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitulo, 200, 13);
  }

  // ── Tabela ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    head: [cabecalho],
    body: linhas,
    startY: 25,
    styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 60] },
    headStyles: { fillColor: PRIMARY, textColor: ON_PRIMARY, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Core 4 — Gerado em ${new Date().toLocaleString('pt-BR')}`, 10, 205);
    doc.text(`Página ${i} de ${pages}`, 260, 205);
  }

  doc.save(nomeArquivo);
}
