import React from 'react';
import { motion } from 'motion/react';
import { FileUp, MessageSquareText, ShieldCheck } from 'lucide-react';
import AureaAvatar from './AureaAvatar';
import { Stagger, StaggerItem } from '../motion/Movimento';
import { pressionar } from '../motion/presets';
import { SUGESTOES_AUREA, primeiroNome, saudacao } from './aureaUtils';
import { cn } from '../../lib/utils';

const COMO_FUNCIONA = [
  { icon: MessageSquareText, texto: 'Pergunte como falaria com uma pessoa: saldo, gastos, contas que vencem.' },
  { icon: FileUp, texto: 'Anexe planilha, extrato .ofx, PDF ou .md. Ela lê e propõe os lançamentos.' },
  { icon: ShieldCheck, texto: 'Baixas, transferências e exclusões só acontecem depois do seu OK.' },
];

/**
 * Tela de boas-vindas da Áurea (conversa vazia): saudação, sugestões com ícone e um
 * "Como funciona" curto. `compacto` = versão do painel flutuante (sem o bloco explicativo).
 * Props: nome (usuário), onSugestao(texto), desabilitado, compacto.
 */
export default function BoasVindasAurea({ nome, onSugestao, desabilitado = false, compacto = false }) {
  const ola = `${saudacao()}${nome ? `, ${primeiroNome(nome)}` : ''}!`;
  return (
    <div className={cn('flex flex-col items-center text-center', compacto ? 'gap-4 py-6' : 'gap-6 py-10 sm:py-14')}>
      <AureaAvatar size="lg" />
      <div>
        <p className={cn('font-display font-semibold text-text-primary tracking-tight', compacto ? 'text-lg' : 'text-2xl')}>{ola}</p>
        <p className="text-sm text-text-primary/70 max-w-md mt-1.5 leading-relaxed">
          Eu sou a Áurea. Consulto seus números, explico e faço lançamentos por conversa.
        </p>
      </div>

      <Stagger as="ul" className={cn('grid w-full gap-2', compacto ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 max-w-xl')} aria-label="Sugestões de pergunta">
        {SUGESTOES_AUREA.map((s) => {
          const Icone = s.icon;
          const conteudo = (
            <>
              <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20" aria-hidden="true">
                <Icone className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium text-text-primary/85 leading-snug">{s.texto}</span>
            </>
          );
          const classe = 'w-full flex items-center gap-3 text-left min-h-14 px-3 py-2.5 rounded-2xl border border-border bg-surface-low hover:border-primary/40 hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';
          return (
            <StaggerItem as="li" key={s.texto}>
              <motion.button type="button" whileTap={pressionar} disabled={desabilitado} onClick={() => onSugestao(s.texto)} className={classe}>
                {conteudo}
              </motion.button>
            </StaggerItem>
          );
        })}
      </Stagger>

      {!compacto && (
        <section aria-labelledby="aurea-como-funciona" className="w-full max-w-xl rounded-2xl border border-border bg-surface-low/60 p-4 text-left">
          <h2 id="aurea-como-funciona" className="c4-eyebrow mb-3">Como funciona</h2>
          <ul className="space-y-2.5">
            {COMO_FUNCIONA.map(({ icon: Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-text-primary/80 leading-relaxed">
                <Icone className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                {texto}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
