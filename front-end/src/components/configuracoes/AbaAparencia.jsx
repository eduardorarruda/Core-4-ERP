import React, { useContext } from 'react';
import { EyeOff, Moon, Palette, Sun } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { useModoPrivado } from '../../hooks/useAtalhos';
import Card from '../ui/Card';
import { GrupoOpcoes, Interruptor, Teclas } from '../acessibilidade/Controles';

/** Aba Aparência: tema (o mesmo controle da barra superior, Alt+T) e modo privacidade (Alt+P). */
export default function AbaAparencia() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { privado, alternarPrivado } = useModoPrivado();

  const escolherTema = (valor) => { if (valor !== theme) toggleTheme(); };

  return (
    <div className="space-y-5">
      <Card title="Tema" subtitle="Vale para este navegador. O tema escuro segue a identidade do Core 4." icon={Palette}>
        <GrupoOpcoes
          legenda="Cores da tela"
          explicacao="Também dá para trocar pela barra superior ou com o atalho abaixo."
          valor={theme}
          onChange={escolherTema}
          opcoes={[
            { valor: 'dark', rotulo: <span className="inline-flex items-center gap-1.5"><Moon className="w-4 h-4" aria-hidden="true" /> Escuro</span>, dica: 'Menos brilho, ideal à noite.' },
            { valor: 'light', rotulo: <span className="inline-flex items-center gap-1.5"><Sun className="w-4 h-4" aria-hidden="true" /> Claro</span>, dica: 'Mais luz, bom em ambientes claros.' },
          ]}
        />
        <p className="mt-3 flex items-center gap-2 text-xs text-text-primary/65">Atalho: <Teclas teclas={['Alt', 'T']} /></p>
      </Card>

      <Card title="Privacidade na tela" subtitle="Para usar o Core 4 em público sem mostrar valores." icon={EyeOff}>
        <Interruptor
          rotulo="Esconder valores"
          explicacao="Borra saldos e totais até você desligar. Útil em reuniões ou ao compartilhar a tela."
          ligado={privado}
          onChange={alternarPrivado}
        />
        <p className="flex items-center gap-2 text-xs text-text-primary/65">Atalho: <Teclas teclas={['Alt', 'P']} /></p>
      </Card>
    </div>
  );
}
