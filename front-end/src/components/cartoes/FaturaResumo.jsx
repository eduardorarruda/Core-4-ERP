import React from 'react';
import { CalendarClock, CircleDot, Lock, Upload } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import PermissaoGuard from '../ui/PermissaoGuard';
import { AnimatedNumber } from '../motion/Movimento';
import { formatDate } from '../../lib/formatters';
import BarraCategorias from './BarraCategorias';
import { rotuloFatura, totaisPorCategoria, vencimentoDaFatura } from './faturas';

/*
 * Detalhe da fatura escolhida: total grande, situação (texto + ícone), vencimento, quantidade,
 * barra empilhada por categoria e as ações da fatura (Fechar fatura, Importar planilha).
 *
 * Props: cartao, fatura (de agruparFaturas), lancamentos (todos os da fatura), fechando,
 *        onFechar(fatura), onImportar(), className.
 */

const SITUACAO = {
  aberta: { rotulo: 'Aberta', variant: 'primary', icon: CircleDot, texto: 'Recebe compras até o fechamento.' },
  futura: { rotulo: 'Próxima', variant: 'info', icon: CalendarClock, texto: 'Compras parceladas e lançamentos depois do fechamento.' },
  fechada: { rotulo: 'Fechada', variant: 'neutral', icon: Lock, texto: 'Já virou conta a pagar. Não aceita mudanças.' },
};

export default function FaturaResumo({ cartao, fatura, lancamentos = [], fechando, onFechar, onImportar, className }) {
  const s = SITUACAO[fatura.situacao];
  const Icone = s.icon;
  const vence = vencimentoDaFatura(fatura.ano, fatura.mes, cartao.diaVencimento);
  const categorias = totaisPorCategoria(lancamentos, 6);
  const podeFechar = fatura.situacao !== 'fechada' && fatura.total > 0;

  return (
    <Card
      className={className}
      eyebrow={`Fatura de ${rotuloFatura(fatura.ano, fatura.mes, { curto: false })}`}
      title={
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <AnimatedNumber value={fatura.total} format="currency" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums" />
          <Badge variant={s.variant}><Icone className="w-3 h-3" aria-hidden="true" /> {s.rotulo}</Badge>
        </span>
      }
      subtitle={`Vence ${formatDate(vence)} · ${fatura.qtd} lançamento${fatura.qtd === 1 ? '' : 's'} · ${s.texto}`}
    >
      {categorias.length > 0 ? (
        <BarraCategorias itens={categorias} titulo={`Gastos por categoria na fatura de ${rotuloFatura(fatura.ano, fatura.mes, { curto: false })}`} />
      ) : (
        <p className="text-sm text-text-primary/65">Sem compras nesta fatura.</p>
      )}
      <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onImportar} leftIcon={<Upload className="w-4 h-4" aria-hidden="true" />}>
          Importar planilha
        </Button>
        {podeFechar && (
          <PermissaoGuard permissao="CARTAO_FECHAR_FATURA">
            <Button variant="secondary" size="sm" onClick={() => onFechar(fatura)} loading={fechando} leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}>
              Fechar fatura
            </Button>
          </PermissaoGuard>
        )}
      </div>
    </Card>
  );
}
