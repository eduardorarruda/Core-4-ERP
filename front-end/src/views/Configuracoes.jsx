import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Accessibility, Lock, Palette, Settings, ShieldCheck, User } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import { FadeIn } from '../components/motion/Movimento';
import AbaPerfil from '../components/configuracoes/AbaPerfil';
import AbaSeguranca from '../components/configuracoes/AbaSeguranca';
import AbaPrivacidade from '../components/configuracoes/AbaPrivacidade';
import AbaAparencia from '../components/configuracoes/AbaAparencia';
import AbaAcessibilidade from '../components/configuracoes/AbaAcessibilidade';

const ID_BASE = 'cfg';

const ABAS = [
  { value: 'perfil', label: 'Perfil', icon: User },
  { value: 'seguranca', label: 'Segurança', icon: Lock },
  { value: 'privacidade', label: 'Privacidade e dados', icon: ShieldCheck },
  { value: 'aparencia', label: 'Aparência', icon: Palette },
  { value: 'acessibilidade', label: 'Acessibilidade', icon: Accessibility },
];

export default function Configuracoes() {
  const toast = useToast();
  const { senhaProvisoria } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaUrl = searchParams.get('aba');
  const padrao = senhaProvisoria ? 'seguranca' : 'perfil';
  const aba = ABAS.some((a) => a.value === abaUrl) ? abaUrl : padrao;

  const trocarAba = (valor) => setSearchParams({ aba: valor }, { replace: true });

  // No celular as abas rolam de lado: mantém a aba ativa à vista (ex.: ?aba=acessibilidade)
  useEffect(() => {
    document.getElementById(Tabs.abaId(ID_BASE, aba))?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [aba]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Sua conta, segurança e o jeito como o Core 4 aparece para você."
        icon={Settings}
      >
        <Tabs value={aba} onChange={trocarAba} label="Seções das configurações" idBase={ID_BASE} items={ABAS} />
      </PageHeader>

      <div role="tabpanel" id={Tabs.painelId(ID_BASE, aba)} aria-labelledby={Tabs.abaId(ID_BASE, aba)} tabIndex={-1} className="outline-none">
        <FadeIn key={aba}>
          {aba === 'perfil' && <AbaPerfil toast={toast} />}
          {aba === 'seguranca' && <AbaSeguranca toast={toast} senhaProvisoria={senhaProvisoria} />}
          {aba === 'privacidade' && <AbaPrivacidade toast={toast} />}
          {aba === 'aparencia' && <AbaAparencia />}
          {aba === 'acessibilidade' && <AbaAcessibilidade />}
        </FadeIn>
      </div>
    </div>
  );
}
