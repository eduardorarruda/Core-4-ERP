import React from 'react';
import { Accessibility, Brain, Droplets, Glasses, Keyboard, RotateCcw, SlidersHorizontal, Type, Wind } from 'lucide-react';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';
import { PRESETS, TAMANHOS_TEXTO } from '../acessibilidade/preferencias';
import { GrupoOpcoes, Interruptor } from '../acessibilidade/Controles';
import { ATALHOS, TIPOS_TEXTO_ROTULO } from '../acessibilidade/textos';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ListaAtalhos from './ListaAtalhos';

const ICONE_PRESET = { 'baixa-visao': Glasses, dislexia: Brain, movimento: Wind, daltonismo: Droplets, teclado: Keyboard };

/**
 * Aba Acessibilidade das Configurações. Usa o MESMO estado do painel "Acessibilidade"
 * (Alt+A): conjuntos prontos, os ajustes mais usados e um botão para abrir todas as opções.
 */
export default function AbaAcessibilidade() {
  const { preferencias: p, definir, aplicarPreset, restaurar, anunciar, abrirPainel } = useAcessibilidade();

  const mudar = (chave, valor, frase) => { definir({ [chave]: valor }); anunciar(frase); };

  return (
    <div className="space-y-5">
      <Card
        title="Conjuntos prontos"
        subtitle="Um clique ajusta várias opções de uma vez. Dá para refinar depois."
        icon={Accessibility}
        footer={(
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-text-primary/70">Fonte, cores para daltonismo, guia de leitura e mais.</p>
            <Button variant="secondary" size="sm" onClick={abrirPainel} leftIcon={<SlidersHorizontal className="w-4 h-4" aria-hidden="true" />} className="shrink-0">
              Todas as opções
            </Button>
          </div>
        )}
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESETS.map((preset) => {
            const Icone = ICONE_PRESET[preset.id] ?? Accessibility;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => aplicarPreset(preset.id)}
                  className="w-full h-full flex items-start gap-3 text-left p-3 rounded-xl border border-border-strong bg-surface hover:border-primary/50 hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                    <Icone className="w-[1.125rem] h-[1.125rem]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">{preset.nome}</span>
                    <span className="block text-xs text-text-primary/70 leading-relaxed mt-0.5">{preset.descricao}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Leitura" subtitle="Tamanho do texto e contraste." icon={Type}>
        <div className="space-y-6">
          <GrupoOpcoes
            legenda="Tamanho do texto"
            valor={p.tamanhoTexto}
            colunas={3}
            onChange={(v) => mudar('tamanhoTexto', Number(v), `Texto em ${TIPOS_TEXTO_ROTULO[v] ?? `${v}%`}.`)}
            opcoes={TAMANHOS_TEXTO.map((t) => ({ valor: t, rotulo: TIPOS_TEXTO_ROTULO[t] ?? `${t}%` }))}
          />
          <GrupoOpcoes
            legenda="Contraste"
            valor={p.contraste}
            colunas={3}
            onChange={(v) => mudar('contraste', v, v === 'alto' ? 'Alto contraste ligado.' : 'Contraste padrão.')}
            opcoes={[
              { valor: 'sistema', rotulo: 'Igual ao sistema' },
              { valor: 'padrao', rotulo: 'Padrão' },
              { valor: 'alto', rotulo: 'Alto contraste' },
            ]}
          />
          <GrupoOpcoes
            legenda="Movimento"
            explicacao="Animações ajudam a perceber mudanças, mas podem incomodar."
            valor={p.movimento}
            colunas={3}
            onChange={(v) => mudar('movimento', v, v === 'sistema' ? 'Movimento igual ao sistema.' : 'Animações reduzidas.')}
            opcoes={[
              { valor: 'sistema', rotulo: 'Igual ao sistema' },
              { valor: 'reduzido', rotulo: 'Reduzido' },
              { valor: 'desligado', rotulo: 'Sem animação' },
            ]}
          />
          <div className="divide-y divide-border">
            <Interruptor
              rotulo="Sublinhar links"
              explicacao="Links ficam sublinhados, sem depender da cor."
              ligado={p.sublinharLinks}
              onChange={(v) => mudar('sublinharLinks', v, `Sublinhar links ${v ? 'ligado' : 'desligado'}.`)}
            />
            <Interruptor
              rotulo="Foco bem visível"
              explicacao="Contorno grosso em volta do item selecionado pelo teclado."
              ligado={p.focoDestacado}
              onChange={(v) => mudar('focoDestacado', v, `Foco destacado ${v ? 'ligado' : 'desligado'}.`)}
            />
          </div>
        </div>
      </Card>

      <Card title="Atalhos de teclado" subtitle="Funcionam em qualquer tela depois de entrar." icon={Keyboard}>
        <ListaAtalhos atalhos={ATALHOS} />
        <div className="mt-4 divide-y divide-border border-t border-border">
          <Interruptor
            rotulo="Atalhos com Alt"
            explicacao="Desligue se eles atrapalham seu leitor de tela ou outro programa."
            ligado={p.atalhos}
            onChange={(v) => mudar('atalhos', v, `Atalhos ${v ? 'ligados' : 'desligados'}.`)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={restaurar} leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}>
          Restaurar padrão
        </Button>
      </div>
    </div>
  );
}
