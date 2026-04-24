import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY = [110, 255, 192];   // #6EFFC0
const ON_PRIMARY = [0, 56, 36];    // #003824
const SURFACE = [42, 42, 42];      // #2A2A2A
const TEXT = [200, 200, 200];

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
  doc.text(`Período: ${periodo.inicio} a ${periodo.fim}`, 200, 13);

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
    doc.text(`Core 4 ERP — Gerado em ${geradoEm}`, 10, 205);
    doc.text(`Página ${i} de ${pageCount}`, 260, 205);
  }

  const nomeArquivo = `${titulo.replace(/ /g, '_')}_${periodo.inicio}_${periodo.fim}.pdf`;
  doc.save(nomeArquivo);
}
