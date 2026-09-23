import React, { useState } from 'react';
import { Camera, Image as ImageIcon, ShieldCheck, X, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { PermissionStateStatus } from '../useMediaPermissions';

interface MediaPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCamera: () => Promise<boolean>;
  onSelectFromGallery: () => void;
  cameraStatus: PermissionStateStatus;
  errorMessage?: string | null;
}

export const MediaPermissionModal: React.FC<MediaPermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestCamera,
  onSelectFromGallery,
  cameraStatus,
  errorMessage,
}) => {
  const [requesting, setRequesting] = useState(false);
  const [showHowToUnlock, setShowHowToUnlock] = useState(false);

  if (!isOpen) return null;

  const handleAllowCamera = async () => {
    setRequesting(true);
    try {
      const granted = await onRequestCamera();
      if (granted) {
        onClose();
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleOpenGallery = () => {
    onSelectFromGallery();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 animate-in fade-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-900 leading-tight">
                Permissões do Dispositivo
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                Câmera e Galeria de Fotos
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-xl text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error / Denied notice */}
        {(cameraStatus === 'denied' || errorMessage) && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2 font-bold">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Acesso à câmera bloqueado no navegador</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {errorMessage || 'O navegador ou sistema bloqueou o acesso à câmera. Você pode usar a galeria de fotos ou liberar a permissão nas configurações.'}
            </p>
            <button
              type="button"
              onClick={() => setShowHowToUnlock(!showHowToUnlock)}
              className="text-[11px] font-bold text-sky-600 underline flex items-center gap-1"
            >
              <span>Como desbloquear a câmera no smartphone</span>
              <ExternalLink size={11} />
            </button>
          </div>
        )}

        {/* Instructions for unblocking */}
        {showHowToUnlock && (
          <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-700 space-y-2">
            <p className="font-bold text-neutral-900 text-[11px]">Passo a passo no seu celular:</p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-neutral-600">
              <li>Toque no ícone de <strong>cadeado ou configurações</strong> ao lado do endereço do site (barra superior).</li>
              <li>Procure por <strong>Permissões</strong> ou <strong>Câmera</strong>.</li>
              <li>Altere para <strong>Permitir</strong> e recarregue a página.</li>
            </ol>
          </div>
        )}

        {/* Permissions details cards */}
        <div className="space-y-3 mb-6">
          {/* Camera Card */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-start gap-3.5">
            <div className="p-2.5 bg-white text-sky-600 rounded-xl shadow-xs border border-neutral-200/60 shrink-0">
              <Camera size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-neutral-900">Câmera do Smartphone</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  cameraStatus === 'granted' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : cameraStatus === 'denied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {cameraStatus === 'granted' ? 'Permitida' : cameraStatus === 'denied' ? 'Bloqueada' : 'Pendente'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Utilizada para <strong>escanear códigos de barras</strong> das embalagens em tempo real no supermercado e preencher produtos automaticamente.
              </p>
            </div>
          </div>

          {/* Gallery Card */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-start gap-3.5">
            <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-xs border border-neutral-200/60 shrink-0">
              <ImageIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-neutral-900">Galeria de Fotos</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Disponível
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Permite <strong>selecionar fotos de embalagens ou notas</strong> já salvas na sua galeria para reconhecer o código de barras ou anexar aos produtos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {cameraStatus !== 'granted' && cameraStatus !== 'denied' && (
            <button
              type="button"
              onClick={handleAllowCamera}
              disabled={requesting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white rounded-2xl font-bold text-sm shadow-sm transition-all"
            >
              <Camera size={16} />
              <span>{requesting ? 'Solicitando...' : 'Conceder Acesso à Câmera'}</span>
            </button>
          )}

          {cameraStatus === 'granted' && (
            <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-800 rounded-2xl font-bold text-xs border border-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Permissão da câmera concedida com sucesso!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenGallery}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 rounded-2xl font-bold text-sm transition-all"
          >
            <ImageIcon size={16} className="text-emerald-600" />
            <span>Abrir Galeria de Fotos do Celular</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Agora Não / Continuar Manualmente
          </button>
        </div>
      </div>
    </div>
  );
};
