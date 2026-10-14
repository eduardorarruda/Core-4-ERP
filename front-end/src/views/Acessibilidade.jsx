import React from 'react';
import { Accessibility } from 'lucide-react';
import LegalLayout, { LegalSection, LegalEmail, LegalLink } from '../components/legal/LegalLayout';
import Button from '../components/ui/Button';
import { Teclas } from '../components/acessibilidade/Controles';
import { ATALHOS, PRESETS } from '../components/acessibilidade/textos';
import { useAcessibilidade } from '../hooks/useAcessibilidade';
import { usePageMeta } from '../hooks/usePageMeta';
import { CONTATO_EMAIL } from '../content/legal';
import {
  DATA_DECLARACAO, META_CONFORMIDADE, SECOES_ACESSIBILIDADE, MODOS,
  PRINCIPIOS_UNIVERSAL, PRINCIPIOS_INCLUSIVO, LIMITACOES,
} from '../content/acessibilidade';

/** Lista de termo + explicação (dl) usada nas seções. */
function ListaDefinicoes({ itens }) {
  return (
    <dl className="mt-3 grid gap-3">
      {itens.map((i) => (
        <div key={i.nome ?? i.titulo} className="rounded-xl border border-border p-3 sm:p-4">
          <dt className="font-semibold text-text-primary">{i.nome ?? i.titulo}</dt>
          <dd className="mt-1">{i.texto}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Declaração de Acessibilidade (pública). Linguagem simples, honesta sobre limitações.
 */
export default function Acessibilidade() {
  const { abrirPainel } = useAcessibilidade();
  usePageMeta({
    title: 'Acessibilidade',
    description: 'Declaração de acessibilidade do Core 4: meta WCAG 2.2 AA, modos de acessibilidade, atalhos de teclado, limitações conhecidas e como relatar barreiras.',
    canonical: '/acessibilidade',
  });

  return (
    <LegalLayout
      titulo="Declaração de Acessibilidade"
      eyebrow="Acessibilidade"
      meta={(
        <>
          <span className="rounded-full border border-border-strong px-2.5 py-0.5">Meta: {META_CONFORMIDADE}</span>
          <span>Atualizada em {DATA_DECLARACAO}</span>
        </>
      )}
      resumo="O Core 4 deve funcionar para todo mundo: com mouse, toque, teclado, leitor de tela ou voz, com pouca visão, daltonismo, dislexia ou sensibilidade a movimento. Aqui contamos o que já fizemos, o que ainda falta e como falar com a gente."
      secoes={SECOES_ACESSIBILIDADE}
    >
      <LegalSection id="compromisso" titulo="Nosso compromisso">
        <p>
          Nossa meta é atender às <strong>Diretrizes de Acessibilidade para Conteúdo Web (WCAG) 2.2, nível AA</strong>,
          em todas as telas. No modo de <strong>alto contraste</strong>, buscamos o nível AAA de contraste (7:1) sempre que possível.
        </p>
        <p>
          Hoje consideramos o Core 4 <strong>parcialmente conforme</strong>: a maior parte das telas atende à meta, mas ainda há
          pontos listados em <a href="#limitacoes">Limitações conhecidas</a>.
        </p>
      </LegalSection>

      <LegalSection id="modos" titulo="Modos de acessibilidade">
        <p>
          Abra as opções pelo botão <Accessibility className="inline w-4 h-4 align-[-2px]" aria-label="de acessibilidade" /> no
          topo de qualquer tela, pela busca (Ctrl + K, digite &quot;acessibilidade&quot;) ou com <Teclas teclas={['Alt', 'A']} />.
          As mudanças valem na hora e ficam salvas neste navegador.
        </p>
        <div className="mt-4">
          <Button onClick={abrirPainel} leftIcon={<Accessibility className="w-4 h-4" aria-hidden="true" />}>
            Abrir as opções de acessibilidade
          </Button>
        </div>
        <ListaDefinicoes itens={MODOS} />
      </LegalSection>

      <LegalSection id="conjuntos" titulo="Conjuntos prontos">
        <p>Um clique liga várias opções de uma vez. Depois, você ajusta cada uma como preferir.</p>
        <ListaDefinicoes itens={PRESETS.map((p) => ({ nome: p.nome, texto: p.descricao }))} />
      </LegalSection>

      <LegalSection id="teclado" titulo="Teclado e atalhos">
        <p>
          Tudo funciona só com o teclado. Ao apertar <Teclas teclas={['Tab']} /> pela primeira vez aparecem os links
          &quot;Pular para o conteúdo&quot;, &quot;Pular para a navegação&quot; e &quot;Abrir opções de acessibilidade&quot;.
          Ao trocar de tela, o foco vai para o título da página nova e o leitor de tela avisa qual página carregou.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">Atalhos de teclado do Core 4</caption>
            <thead>
              <tr className="border-b border-border-strong text-left">
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">Teclas</th>
                <th scope="col" className="py-2 font-semibold text-text-primary">O que fazem</th>
              </tr>
            </thead>
            <tbody>
              {ATALHOS.map((a) => (
                <tr key={a.acao} className="border-b border-border">
                  <td className="py-2 pr-4 whitespace-nowrap"><Teclas teclas={a.teclas} /></td>
                  <td className="py-2">{a.acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Nenhum atalho usa uma tecla sozinha (todos com Alt ou Ctrl), então não disparam sem querer ao ditar texto por voz.
          Mesmo assim, você pode desligá-los no painel.
        </p>
      </LegalSection>

      <LegalSection id="tecnologias" titulo="Leitores de tela e outras tecnologias">
        <p>
          O Core 4 usa HTML semântico (títulos em ordem, regiões de cabeçalho, navegação, conteúdo e rodapé), rótulos em todos os
          campos, mensagens de erro ligadas ao campo e avisos lidos automaticamente. Janelas e painéis prendem o foco e fecham com Esc.
        </p>
        <p>
          O login aceita colar a senha e gerenciadores de senha (nada de copiar caracteres ou resolver quebra-cabeças). Formulários não
          têm limite de tempo e não pedem de novo o que você já informou na mesma tarefa.
        </p>
        <p>
          Respeitamos as preferências do sistema: reduzir movimento, aumentar contraste, cores forçadas (Windows) e tema claro/escuro.
        </p>
      </LegalSection>

      <LegalSection id="principios" titulo="Princípios que seguimos">
        <h3>Design Universal — os 7 princípios</h3>
        <ListaDefinicoes itens={PRINCIPIOS_UNIVERSAL} />
        <h3>Design Inclusivo</h3>
        <ListaDefinicoes itens={PRINCIPIOS_INCLUSIVO} />
      </LegalSection>

      <LegalSection id="limitacoes" titulo="Limitações conhecidas">
        <p>Sendo transparentes sobre o que ainda não está bom:</p>
        <ListaDefinicoes itens={LIMITACOES} />
      </LegalSection>

      <LegalSection id="avaliacao" titulo="Como avaliamos">
        <ul>
          <li>Verificação automática com axe-core (regras WCAG 2.0, 2.1 e 2.2, níveis A e AA) nas telas principais, nos temas claro e escuro e no alto contraste.</li>
          <li>Navegação completa só com teclado, com foco visível em todos os controles.</li>
          <li>Telas com 320 pixels de largura e texto ampliado a 200%, sem perda de conteúdo nem rolagem lateral.</li>
          <li>Cálculo de contraste de todas as cores do sistema, nos dois temas e no alto contraste.</li>
        </ul>
        <p>Última avaliação: {DATA_DECLARACAO}.</p>
      </LegalSection>

      <LegalSection id="contato" titulo="Encontrou uma barreira?">
        <p>
          Se algo no Core 4 não funcionou para você, queremos saber. Escreva para <LegalEmail email={CONTATO_EMAIL} /> contando:
        </p>
        <ul>
          <li>em qual tela você estava e o que tentou fazer;</li>
          <li>o que aconteceu (uma frase basta);</li>
          <li>se quiser, o aparelho, o navegador e a tecnologia assistiva que você usa.</li>
        </ul>
        <p>
          Vamos responder e, se possível, oferecer a informação em outro formato enquanto corrigimos. Veja também a{' '}
          <LegalLink to="/privacidade">Política de Privacidade</LegalLink> e os <LegalLink to="/termos">Termos de Uso</LegalLink>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
