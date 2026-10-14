import React from 'react';
import Tabs from '../ui/Tabs';
import { usePermissao } from '../../hooks/usePermissao';
import { MODOS } from './modos';

/**
 * Abas do módulo Conciliação: "Conta bancária" (/conciliacao) · "Cartão" (/cartoes/conciliacao).
 * Cada aba só aparece para quem pode abrir a rota dela; com uma só aba, não mostra nada.
 */
export default function ConciliacaoTabs({ className }) {
  const pode = usePermissao();
  const itens = Object.values(MODOS)
    .filter((m) => pode(m.permissoes.ver))
    .map((m) => ({ to: m.rotaBase, label: m.abaLabel, icon: m.icone }));

  if (itens.length < 2) return null;
  return <Tabs.Links label="Tipo de conciliação" items={itens} className={className} />;
}
