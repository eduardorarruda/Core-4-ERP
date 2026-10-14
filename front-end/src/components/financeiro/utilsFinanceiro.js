import { AlertTriangle, CalendarClock, CalendarDays, CalendarRange, CheckCircle2, Clock } from 'lucide-react';
import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/*
 * Utilidades das telas financeiras (Contas, Contas bancárias, Assinaturas, Investimentos).
 * Funções puras — sem estado e sem chamadas de API.
 */

/** Data local de hoje em 'yyyy-MM-dd' (não usa UTC: evita "ontem" depois das 21h). */
export function hojeIso(base = new Date()) {
  return format(base, 'yyyy-MM-dd');
}

/** Converte 'yyyy-MM-dd' para Date local (meia-noite). */
export function dataLocal(iso) {
  return iso ? parseISO(iso) : null;
}

/** Converte texto digitado ("1.234,56", "12.5") em número; vazio/ inválido → 0. */
export function paraNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor).trim();
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/** Arredonda para centavos (evita 0.1 + 0.2). */
export function centavos(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Status de conta → rótulo pt-BR, ícone e variante do Badge (status sempre com texto + ícone). */
export const STATUS_CONTA = {
  PENDENTE: { rotulo: 'Pendente', icon: Clock, variant: 'warning' },
  ATRASADO: { rotulo: 'Atrasada', icon: AlertTriangle, variant: 'error' },
  PAGO: { rotulo: 'Paga', icon: CheckCircle2, variant: 'success' },
  RECEBIDO: { rotulo: 'Recebida', icon: CheckCircle2, variant: 'info' },
};

export const estaAberta = (c) => c.status === 'PENDENTE' || c.status === 'ATRASADO';
export const estaBaixada = (c) => c.status === 'PAGO' || c.status === 'RECEBIDO';

/** "Vence hoje", "Venceu há 3 dias", "Vence em 4 dias · 10 out". */
export function textoVencimento(iso, hoje = new Date()) {
  const data = dataLocal(iso);
  if (!data) return '';
  const dias = differenceInCalendarDays(data, hoje);
  const curta = format(data, "d MMM", { locale: ptBR });
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  if (dias === -1) return 'Venceu ontem';
  if (dias < 0) return `Venceu há ${-dias} dias · ${curta}`;
  if (dias <= 30) return `Vence em ${dias} dias · ${curta}`;
  return `Vence em ${format(data, "d 'de' MMM yyyy", { locale: ptBR })}`;
}

/**
 * Agrupa contas em aberto por urgência (portado do Fluxo — contas-a-pagar/agrupar.ts):
 * Atrasadas (vencimento < hoje) · Esta semana (≤ 7 dias) · Este mês (até o fim do mês) · Próximas.
 * Ordena por vencimento dentro de cada grupo. O total do grupo é o saldo (receber − pagar)
 * quando há os dois tipos; com um tipo só, é a soma dele.
 */
export function agruparPorUrgencia(contas, hoje = new Date()) {
  const fimMes = endOfMonth(hoje);
  const grupos = {
    atrasadas: { id: 'atrasadas', titulo: 'Atrasadas', tom: 'critico', icon: AlertTriangle, itens: [] },
    semana: { id: 'semana', titulo: 'Próximos 7 dias', tom: 'atencao', icon: CalendarClock, itens: [] },
    mes: { id: 'mes', titulo: 'Até o fim do mês', tom: 'info', icon: CalendarDays, itens: [] },
    depois: { id: 'depois', titulo: 'Próximas', tom: 'neutro', icon: CalendarRange, itens: [] },
  };
  const ordenadas = [...contas].sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento)));
  ordenadas.forEach((c) => {
    const data = dataLocal(c.dataVencimento);
    const dias = data ? differenceInCalendarDays(data, hoje) : 0;
    if (dias < 0) grupos.atrasadas.itens.push(c);
    else if (dias <= 7) grupos.semana.itens.push(c);
    else if (data <= fimMes) grupos.mes.itens.push(c);
    else grupos.depois.itens.push(c);
  });
  return Object.values(grupos).map((g) => ({ ...g, total: totalPorTipo(g.itens).total }));
}

/** Soma separada por tipo: { pagar, receber, total (receber − pagar se misto) }. */
export function totalPorTipo(contas) {
  let pagar = 0;
  let receber = 0;
  contas.forEach((c) => {
    if (c.tipo === 'RECEBER') receber += Number(c.valorOriginal) || 0;
    else pagar += Number(c.valorOriginal) || 0;
  });
  pagar = centavos(pagar);
  receber = centavos(receber);
  let total;
  if (pagar && receber) total = centavos(receber - pagar);
  else total = pagar ? -pagar : receber;
  return { pagar, receber, total };
}

/** Só dígitos. */
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

/** CPF (11) → 000.000.000-00 · CNPJ (14) → 00.000.000/0000-00 · outro → como veio. */
export function formatarCpfCnpj(valor) {
  const d = soDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor ?? '';
}

/** Máscara progressiva enquanto digita (CPF até 11 dígitos, depois CNPJ). */
export function mascararCpfCnpj(valor) {
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Lê/grava preferências locais sem quebrar em modo privado (só conveniência por usuário). */
export function lerPreferencia(chave, padrao = null) {
  try {
    const v = window.localStorage.getItem(chave);
    return v === null ? padrao : v;
  } catch {
    return padrao;
  }
}

export function gravarPreferencia(chave, valor) {
  try {
    if (valor === null || valor === undefined || valor === '') window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, String(valor));
  } catch {
    /* armazenamento indisponível: segue sem lembrar */
  }
}

/** Chave da última conta bancária usada numa baixa (pré-seleção do "Paguei"). */
export const PREF_ULTIMA_CONTA_BANCARIA = 'c4.baixa.contaBancaria';

/**
 * Próxima data de cobrança de algo que vence todo mês no `dia` (1–31): este mês se ainda não
 * passou, senão o próximo. Em meses mais curtos, vale o último dia do mês.
 */
export function proximaCobranca(dia, hoje = new Date()) {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const naData = (ano, mes) => new Date(ano, mes, Math.min(dia, new Date(ano, mes + 1, 0).getDate()));
  const desteMes = naData(base.getFullYear(), base.getMonth());
  return desteMes >= base ? desteMes : naData(base.getFullYear(), base.getMonth() + 1);
}

/** Cobranças das assinaturas ativas nos próximos `dias` dias, ordenadas por data. */
export function cobrancasProximas(assinaturas, dias = 30, hoje = new Date()) {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  const itens = [];
  assinaturas.filter((a) => a.ativa && a.diaVencimento).forEach((a) => {
    let data = proximaCobranca(a.diaVencimento, base);
    while (data <= limite) {
      itens.push({ assinatura: a, data });
      data = proximaCobranca(a.diaVencimento, new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1));
    }
  });
  return itens.sort((x, y) => x.data - y.data);
}

/** Valida CPF ou CNPJ pelos dígitos verificadores (§20). Aceita com ou sem máscara. */
export function documentoValido(valor) {
  const d = soDigitos(valor);
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    const dv = (n) => {
      const soma = d.slice(0, n).split('').reduce((s, c, i) => s + Number(c) * (n + 1 - i), 0);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const dv = (n) => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0);
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
  }
  return false;
}
