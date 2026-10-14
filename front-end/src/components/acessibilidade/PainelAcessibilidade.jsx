import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Accessibility, Eye, BookOpen, Pause, Keyboard, Palette, RotateCcw, Glasses, Brain, Wind, Droplets, MousePointerClick,
} from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import { ThemeContext } from '../../context/ThemeContext';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';
import { GrupoOpcoes, Interruptor, Teclas } from './Controles';
import { ATALHOS, PRESETS, TIPOS_TEXTO_ROTULO } from './textos';
import { estiloAmostraPadrao, TIPOS_PADRAO } from './padroesGrafico';

/**
 * Painel "Acessibilidade" (gaveta da direita). Abre pelo botão da barra superior, pela tela
 * de login, pela busca (Ctrl+K) ou por Alt+A. Cada mudança vale na hora, fica salva neste
 * navegador e é anunciada para leitores de tela.
 */

const ICONE_PRESET = { 'baixa-visao': Glasses, dislexia: Brain, movimento: Wind, daltonismo: Droplets, teclado: Keyboard };

// Amostras fixas para a prévia (o modo em si troca as variáveis CSS do app inteiro).
const amostras = (paleta) => [1, 2, 3, 4, 5, 6].map((n) => `var(--amostra-${paleta}-${n})`);
const AMOSTRAS_COR = {
  padrao: amostras('padrao'),
  protanopia: amostras('protanopia'),
  deuteranopia: amostras('protanopia'),
  tritanopia: amostras('tritanopia'),
  monocromia: amostras('monocromia'),
};

function Amostras({ cores, padroes }) {
  return (
    <span className="flex gap-1">
      {cores.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="c4-amostra w-5 h-5 rounded-[4px] ring-1 ring-text-primary/25"
          style={padroes ? estiloAmostraPadrao(c, TIPOS_PADRAO[i]) : { background: c }}
        />
      ))}
    </span>
  );
}

function Secao({ icone: Icone, titulo, children }) {
  const id = `a11y-secao-${titulo.toLowerCase().replace(/[^a-z]/g, '')}`;
  return (
    <div role="group" aria-labelledby={id} className="pt-5 mt-5 border-t border-border first:mt-0 first:pt-0 first:border-0">
      <h3 id={id} className="flex items-center gap-2 text-base font-semibold font-display text-text-primary mb-3">
        <Icone className="w-5 h-5 text-primary" aria-hidden="true" />
        {titulo}
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export default function PainelAcessibilidade() {
  const { preferencias: p, definir, aplicarPreset, restaurar, anunciar, painelAberto, fecharPainel, sistema } = useAcessibilidade();
  const tema = useContext(ThemeContext);

  // Muda e avisa o leitor de tela com uma frase curta.
  const mudar = (chave, valor, frase) => {
    definir({ [chave]: valor });
    anunciar(frase);
  };
  const ligarDesligar = (chave, nome) => (v) => mudar(chave, v, `${nome} ${v ? 'ligado' : 'desligado'}.`);

  return (
    <Drawer
      open={painelAberto}
      onClose={fecharPainel}
      title="Acessibilidade"
      description="Ajuste o Core 4 ao seu jeito. Vale na hora e fica salvo neste navegador."
      size="md"
      footer={(
        <>
          <Button variant="ghost" leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />} onClick={restaurar}>
            Restaurar padrão
          </Button>
          <Button onClick={fecharPainel}>Concluir</Button>
        </>
      )}
    >
      {/* Conjuntos prontos */}
      <div role="group" aria-labelledby="a11y-presets" className="mb-6">
        <h3 id="a11y-presets" className="text-base font-semibold font-display text-text-primary">Conjuntos prontos</h3>
        <p className="mt-1 text-sm text-text-primary/75">Um clique liga várias opções de uma vez. Depois, ajuste o que quiser.</p>
        <ul className="mt-3 grid gap-2">
          {PRESETS.map((preset) => {
            const Icone = ICONE_PRESET[preset.id] ?? Accessibility;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => aplicarPreset(preset.id)}
                  className="w-full flex items-start gap-3 text-left px-3 py-2.5 min-h-12 rounded-xl border border-border-strong bg-surface hover:border-primary hover:bg-primary/[0.06] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span aria-hidden="true" className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-primary/[0.12] text-primary">
                    <Icone className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">{preset.nome}</span>
                    <span className="block text-xs text-text-primary/75 leading-snug">{preset.descricao}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Secao icone={Eye} titulo="Visão">
        <GrupoOpcoes
          legenda="Tamanho do texto"
          explicacao="Aumenta todas as letras e o que está em volta. A tela se reorganiza, sem rolar para o lado."
          valor={p.tamanhoTexto}
          colunas={3}
          onChange={(v) => mudar('tamanhoTexto', Number(v), `Tamanho do texto: ${TIPOS_TEXTO_ROTULO[v] ?? `${v}%`}.`)}
          opcoes={[100, 112.5, 125, 150, 175].map((v) => ({
            valor: v,
            rotulo: TIPOS_TEXTO_ROTULO[v],
            previa: <span className="font-semibold leading-none text-text-primary" style={{ fontSize: `${v / 100}rem` }}>Aa</span>,
          }))}
        />
        <GrupoOpcoes
          legenda="Contraste"
          explicacao="Alto contraste usa fundo sólido, letras mais fortes (7:1) e bordas bem marcadas."
          valor={p.contraste}
          colunas={3}
          onChange={(v) => mudar('contraste', v, v === 'alto' ? 'Alto contraste ligado.' : v === 'padrao' ? 'Contraste padrão.' : 'Contraste segue o sistema.')}
          opcoes={[
            { valor: 'sistema', rotulo: 'Seguir o sistema', dica: sistema.maisContraste ? 'Seu sistema pede mais contraste.' : 'Hoje: padrão.' },
            { valor: 'padrao', rotulo: 'Padrão' },
            { valor: 'alto', rotulo: 'Alto', previa: <span className="inline-block px-2 py-0.5 rounded bg-black text-white border-2 border-white text-xs font-bold">Aa</span> },
          ]}
        />
        {tema && (
          <GrupoOpcoes
            legenda="Tema"
            explicacao="Escuro cansa menos à noite; claro costuma ser melhor com muita luz. Atalho: Alt + T."
            valor={tema.theme}
            onChange={(v) => { if (v !== tema.theme) { tema.toggleTheme(); anunciar(v === 'dark' ? 'Tema escuro.' : 'Tema claro.'); } }}
            opcoes={[{ valor: 'dark', rotulo: 'Escuro' }, { valor: 'light', rotulo: 'Claro' }]}
          />
        )}
      </Secao>

      <Secao icone={BookOpen} titulo="Leitura">
        <GrupoOpcoes
          legenda="Fonte para leitura"
          explicacao="Letras com formas bem diferentes entre si ajudam quem tem baixa visão ou dislexia."
          valor={p.fonte}
          colunas={1}
          onChange={(v) => mudar('fonte', v, `Fonte: ${v === 'padrao' ? 'padrão' : v === 'legibilidade' ? 'Atkinson Hyperlegible' : 'Lexend'}.`)}
          opcoes={[
            { valor: 'padrao', rotulo: 'Padrão (DM Sans)' },
            { valor: 'legibilidade', rotulo: 'Atkinson Hyperlegible', dica: 'Feita para baixa visão: I, l e 1 nunca se confundem.', previa: <span style={{ fontFamily: '"Atkinson Hyperlegible Next Variable", sans-serif' }}>Il1 O0 rn m</span> },
            { valor: 'dislexia', rotulo: 'Lexend', dica: 'Letras largas e espaçadas, que ajudam na fluência de leitura.', previa: <span style={{ fontFamily: '"Lexend Variable", sans-serif' }}>Il1 O0 rn m</span> },
          ]}
        />
        <Interruptor
          rotulo="Espaçamento de texto ampliado"
          explicacao="Mais espaço entre linhas, letras, palavras e parágrafos."
          ligado={p.espacamento}
          onChange={ligarDesligar('espacamento', 'Espaçamento ampliado')}
        />
        <Interruptor
          rotulo="Leitura simplificada"
          explicacao="Tira enfeites (brilhos, fundo animado, ilustrações) e deixa só a informação."
          ligado={p.leituraSimplificada}
          onChange={ligarDesligar('leituraSimplificada', 'Leitura simplificada')}
        />
        <Interruptor
          rotulo="Guia de leitura"
          explicacao="Uma faixa acompanha o mouse ou o foco e escurece o resto, para não perder a linha."
          ligado={p.guiaLeitura}
          onChange={ligarDesligar('guiaLeitura', 'Guia de leitura')}
        />
      </Secao>

      <Secao icone={Pause} titulo="Movimento">
        <GrupoOpcoes
          legenda="Animações"
          explicacao="Para quem sente tontura, enjoo ou se distrai com coisas se mexendo."
          valor={p.movimento}
          colunas={3}
          onChange={(v) => mudar('movimento', v, v === 'sistema' ? 'Animações seguem o sistema.' : v === 'reduzido' ? 'Animações reduzidas.' : 'Animações desligadas.')}
          opcoes={[
            { valor: 'sistema', rotulo: 'Seguir o sistema', dica: sistema.menosMovimento ? 'Seu sistema pede menos movimento.' : 'Hoje: com animações.' },
            { valor: 'reduzido', rotulo: 'Reduzidas', dica: 'Só esmaecer, sem deslizar.' },
            { valor: 'desligado', rotulo: 'Desligadas', dica: 'Tudo aparece direto.' },
          ]}
        />
        <Interruptor
          rotulo="Pausar tudo que se move"
          explicacao="Para indicadores girando, brilhos e números que contam. Vale também para atualizações automáticas."
          ligado={p.pausarAnimacoes}
          onChange={ligarDesligar('pausarAnimacoes', 'Pausar tudo que se move')}
        />
      </Secao>

      <Secao icone={MousePointerClick} titulo="Navegação">
        <Interruptor
          rotulo="Destacar o foco"
          explicacao="Contorno grosso preto e amarelo em volta do item selecionado pelo teclado."
          ligado={p.focoDestacado}
          onChange={ligarDesligar('focoDestacado', 'Foco destacado')}
        />
        <Interruptor
          rotulo="Alvos amplos"
          explicacao="Botões e links com pelo menos 48 pixels, mais fáceis de acertar com o dedo ou com tremor."
          ligado={p.alvosAmplos}
          onChange={ligarDesligar('alvosAmplos', 'Alvos amplos')}
        />
        <Interruptor
          rotulo="Sublinhar links"
          explicacao="Mostra o que é link sem depender da cor."
          ligado={p.sublinharLinks}
          onChange={ligarDesligar('sublinharLinks', 'Sublinhar links')}
        />
        <Interruptor
          rotulo="Cursor grande"
          explicacao="Ponteiro do mouse bem maior, com contorno."
          ligado={p.cursorGrande}
          onChange={ligarDesligar('cursorGrande', 'Cursor grande')}
        />
        <Interruptor
          rotulo="Atalhos de teclado"
          explicacao="Desligue se você usa comandos de voz ou se aperta teclas sem querer. Ctrl + K continua valendo."
          ligado={p.atalhos}
          onChange={ligarDesligar('atalhos', 'Atalhos de teclado')}
        />
        <div>
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" aria-hidden="true" /> Atalhos disponíveis
          </h4>
          <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
            {ATALHOS.map((a) => (
              <div key={a.acao} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <dt className="text-sm text-text-primary/85">{a.acao}</dt>
                <dd><Teclas teclas={a.teclas} /></dd>
              </div>
            ))}
          </dl>
        </div>
      </Secao>

      <Secao icone={Palette} titulo="Cores">
        <GrupoOpcoes
          legenda="Visão de cores"
          explicacao="Troca as cores de gráficos, entradas e saídas por paletas que continuam diferentes para quem tem daltonismo."
          valor={p.visaoCor}
          colunas={1}
          onChange={(v) => mudar('visaoCor', v, `Visão de cores: ${v === 'padrao' ? 'padrão' : v}.`)}
          opcoes={[
            { valor: 'padrao', rotulo: 'Padrão', previa: <Amostras cores={AMOSTRAS_COR.padrao} /> },
            { valor: 'protanopia', rotulo: 'Protanopia', dica: 'Pouca percepção do vermelho.', previa: <Amostras cores={AMOSTRAS_COR.protanopia} padroes /> },
            { valor: 'deuteranopia', rotulo: 'Deuteranopia', dica: 'Pouca percepção do verde (a mais comum).', previa: <Amostras cores={AMOSTRAS_COR.deuteranopia} padroes /> },
            { valor: 'tritanopia', rotulo: 'Tritanopia', dica: 'Pouca percepção do azul e do amarelo.', previa: <Amostras cores={AMOSTRAS_COR.tritanopia} padroes /> },
            { valor: 'monocromia', rotulo: 'Monocromia', dica: 'Sem cores: diferença por claro/escuro e textura.', previa: <Amostras cores={AMOSTRAS_COR.monocromia} padroes /> },
          ]}
        />
        <Interruptor
          rotulo="Padrões nos gráficos"
          explicacao={p.visaoCor !== 'padrao'
            ? 'Cada série ganha uma textura (listras, pontos…) além da cor. Com a visão de cores escolhida acima, as texturas já aparecem.'
            : 'Cada série ganha uma textura (listras, pontos…) além da cor.'}
          ligado={p.padroesGraficos}
          onChange={ligarDesligar('padroesGraficos', 'Padrões nos gráficos')}
          previa={<Amostras cores={AMOSTRAS_COR.padrao} padroes />}
        />
      </Secao>

      <p className="mt-8 pt-5 border-t border-border text-sm text-text-primary/80">
        Encontrou alguma barreira?{' '}
        <Link to="/acessibilidade" onClick={fecharPainel} className="text-primary font-medium underline underline-offset-2 rounded focus-visible:outline-2 focus-visible:outline-primary">
          Leia a declaração de acessibilidade
        </Link>{' '}
        e fale com a gente.
      </p>
    </Drawer>
  );
}
