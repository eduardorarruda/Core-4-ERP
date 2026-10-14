import React, { useState } from 'react';
import { Download, Share, Plus, X, Smartphone } from 'lucide-react';
import { usePwa } from '../../hooks/usePwa';

const CHAVE_DISPENSA = 'pwa-instalar-dispensado-ate';
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

// Usuário dispensou há menos de 7 dias? Então não incomodamos de novo tão cedo.
function foiDispensadoRecentemente() {
  try {
    const ate = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
    return ate > Date.now();
  } catch {
    return false;
  }
}

/**
 * Convite para instalar o app na tela inicial.
 *  - Android/Chrome: botão que dispara o prompt nativo de instalação.
 *  - iOS/Safari: instruções (o iOS não expõe prompt — a instalação é manual).
 * Dispensável por 7 dias para não virar ruído. Some assim que o app é instalado.
 */
export default function InstalarPwaBanner() {
  const { podeInstalar, instalar, isIOS, jaInstalado } = usePwa();
  const [dispensado, setDispensado] = useState(foiDispensadoRecentemente);

  const mostrarAndroid = podeInstalar;
  const mostrarIOS = isIOS && !jaInstalado && !podeInstalar;

  if (jaInstalado || dispensado || (!mostrarAndroid && !mostrarIOS)) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now() + SETE_DIAS));
    } catch {
      /* localStorage indisponível — dispensa só nesta sessão */
    }
    setDispensado(true);
  };

  const aoInstalar = async () => {
    const aceitou = await instalar();
    if (!aceitou) dispensar(); // recusou o prompt nativo — não reoferecemos por 7 dias
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[900] p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-primary/30 bg-surface shadow-2xl shadow-black/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
            <Smartphone className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary">Instalar o Core 4 ERP</p>

            {mostrarAndroid ? (
              <>
                <p className="mt-0.5 text-xs text-text-primary/60">
                  Adicione o app à tela inicial para abrir rápido, em tela cheia e usar offline.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={aoInstalar}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" /> Instalar app
                  </button>
                  <button
                    type="button"
                    onClick={dispensar}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary/60 hover:text-text-primary transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-text-primary/60">
                  No Safari, toque em{' '}
                  <Share className="inline w-3.5 h-3.5 -mt-0.5 text-primary" />{' '}
                  <span className="font-semibold text-text-primary">Compartilhar</span> e depois em{' '}
                  <Plus className="inline w-3.5 h-3.5 -mt-0.5 text-primary" />{' '}
                  <span className="font-semibold text-text-primary">Adicionar à Tela de Início</span>.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={dispensar}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary/60 hover:text-text-primary transition-colors"
                  >
                    Entendi
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar"
            className="flex-shrink-0 rounded-lg p-1 text-text-primary/60 hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
