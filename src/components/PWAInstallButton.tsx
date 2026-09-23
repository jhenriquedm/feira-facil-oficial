import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Check } from 'lucide-react';
import { usePWAInstall } from '../usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'settings' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed, hide prompt or show installed badge in settings
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
          <Check size={14} />
          <span>Aplicativo PWA Instalado</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'settings') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-black shadow-md shadow-sky-500/20 transition-all cursor-pointer"
        >
          <Download size={15} />
          <span>{installing ? 'Instalando...' : 'Instalar no Dispositivo'}</span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className="p-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Download size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black">Instale o Feira Mensal</h4>
              <p className="text-xs text-sky-100">Acesse suas compras rapidamente mesmo sem internet.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full sm:w-auto px-4 py-2 bg-white text-sky-600 hover:bg-sky-50 text-xs font-black rounded-xl shadow-sm transition-all"
          >
            {installing ? 'Instalando...' : 'Instalar Agora'}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={installing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl text-xs font-bold border border-sky-200 transition-all shadow-sm"
        title="Instalar aplicativo no computador ou celular"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl text-xs font-bold border border-sky-200 transition-all shadow-sm"
          title="Instalar no iPhone / iPad"
        >
          <Share size={13} />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                    <PlusSquare size={20} />
                  </div>
                  <h3 className="text-base font-black text-neutral-900">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-neutral-600">
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-sky-500 text-white font-black shrink-0">1</span>
                  <p className="mt-0.5">Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta para cima) na barra do Safari.</p>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-sky-500 text-white font-black shrink-0">2</span>
                  <p className="mt-0.5">Role para baixo e selecione a opção <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-sky-500 text-white font-black shrink-0">3</span>
                  <p className="mt-0.5">Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-black text-neutral-800 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
