import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, X, Flashlight, RefreshCw, Upload, CheckCircle2, 
  AlertCircle, Sparkles, Loader2, Barcode as BarcodeIcon, Search,
  Image as ImageIcon, ShieldCheck, ExternalLink, Smartphone
} from 'lucide-react';
import { useMediaPermissions, PermissionStateStatus } from '../useMediaPermissions';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (data: {
    barcode: string;
    suggestedName?: string;
    suggestedBrand?: string;
    suggestedCategory?: string;
    suggestedUnit?: string;
  }) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  title = 'Ler Código de Barras'
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [showHowToUnlock, setShowHowToUnlock] = useState(false);
  const [detectedResult, setDetectedResult] = useState<{
    barcode: string;
    name?: string;
    brand?: string;
    category?: string;
    unit?: string;
    found?: boolean;
  } | null>(null);

  const {
    cameraStatus,
    requestCameraPermission,
    checkCameraPermission,
    errorMessage: permissionError,
  } = useMediaPermissions();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = 'barcode-reader-viewport';

  // Sound beep & haptic feedback on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext maybe blocked or unsupported
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch {
        // ignore
      }
    }
  };

  const lookupBarcode = async (rawCode: string) => {
    const clean = rawCode.trim().replace(/\D/g, '');
    if (!clean) return;

    setIsLookingUp(true);
    setDetectedResult({ barcode: clean });

    try {
      const res = await fetch(`/api/barcode/lookup?code=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setDetectedResult({
          barcode: clean,
          name: data.name || '',
          brand: data.brand || '',
          category: data.categorySuggestion || '',
          unit: data.unit || 'Un',
          found: Boolean(data.found)
        });
      }
    } catch (e) {
      console.warn('Erro ao consultar código de barras:', e);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    playBeep();
    stopCamera();
    await lookupBarcode(decodedText);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333333
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        undefined
      );

      // Check flashlight capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera init error:', err);
      setIsScanning(false);
      if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setCameraError('Permissão de acesso à câmera negada. Você pode escolher uma foto da galeria ou digitar o código.');
      } else {
        setCameraError('Não foi possível iniciar a câmera ao vivo. Use a galeria do celular ou digite o código.');
      }
    }
  };

  const handleRequestAndStartCamera = async () => {
    const granted = await requestCameraPermission();
    if (granted) {
      startCamera();
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch {
      // torch unsupported
    }
  };

  // Process image from smartphone gallery or photo file
  const handleProcessImageFile = async (file: File) => {
    setIsDecodingFile(true);
    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode('barcode-file-hidden-canvas', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39
        ],
        verbose: false
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      playBeep();
      await lookupBarcode(decodedText);
    } catch (err) {
      setCameraError('Nenhum código de barras legível foi encontrado nesta foto. Tente uma foto mais nítida com boa iluminação.');
    } finally {
      setIsDecodingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProcessImageFile(file);
    e.target.value = ''; // Reset input
  };

  const confirmApply = () => {
    if (!detectedResult?.barcode) return;
    onDetected({
      barcode: detectedResult.barcode,
      suggestedName: detectedResult.name,
      suggestedBrand: detectedResult.brand,
      suggestedCategory: detectedResult.category,
      suggestedUnit: detectedResult.unit
    });
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setDetectedResult(null);
      setCameraError(null);
      setManualCode('');
      setActiveTab('camera');
      checkCameraPermission();

      // If camera is already granted, auto-start camera after modal transition
      const t = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(t);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-900 leading-tight">{title}</h3>
              <p className="text-xs text-neutral-500 font-medium">
                Câmera, galeria de fotos ou digitação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        {!detectedResult && (
          <div className="flex border-b border-neutral-200 bg-neutral-50/70 p-1.5 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'camera'
                  ? 'bg-white text-sky-600 shadow-sm border border-neutral-200/80 font-black'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              <Camera size={15} />
              <span>Câmera ao Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('gallery');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'gallery'
                  ? 'bg-white text-emerald-600 shadow-sm border border-neutral-200/80 font-black'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              <ImageIcon size={15} />
              <span>Galeria de Fotos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'manual'
                  ? 'bg-white text-sky-600 shadow-sm border border-neutral-200/80 font-black'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              <BarcodeIcon size={15} />
              <span>Digitar</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center bg-white">
          {detectedResult ? (
            /* Result Confirmation Card */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      Código Identificado
                    </span>
                    {detectedResult.found && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-800 rounded-full flex items-center gap-1">
                        <Sparkles size={10} /> Base Oficial Encontrada
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xl font-black text-neutral-950 mt-1">
                    {detectedResult.barcode}
                  </p>
                </div>
              </div>

              {isLookingUp ? (
                <div className="p-5 border border-neutral-200 rounded-2xl flex items-center justify-center gap-3 text-neutral-500 bg-neutral-50">
                  <Loader2 className="animate-spin text-sky-500" size={20} />
                  <span className="text-xs font-semibold">Buscando detalhes do produto...</span>
                </div>
              ) : (
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Dados Sugeridos para Preenchimento
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500">Nome do Produto</label>
                    <p className="font-bold text-neutral-900 text-sm">
                      {detectedResult.name || '(Definir nome no formulário)'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400">Marca</label>
                      <p className="text-xs font-bold text-neutral-800 truncate">
                        {detectedResult.brand || 'Não informada'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400">Categoria</label>
                      <p className="text-xs font-bold text-sky-600 truncate">
                        {detectedResult.category || 'Geral'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400">Unidade</label>
                      <p className="text-xs font-bold text-neutral-800">
                        {detectedResult.unit || 'Un'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetectedResult(null);
                    startCamera();
                  }}
                  className="w-full sm:flex-1 py-3 px-4 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>Ler Outro</span>
                </button>
                <button
                  type="button"
                  onClick={confirmApply}
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Preencher Cadastro</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* Live Camera View */
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
                <div id={readerElementId} className="w-full h-full object-cover" />

                {/* Laser Scanning Overlay Animation */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="relative w-64 h-36 border-2 border-sky-400/90 rounded-2xl shadow-[0_0_15px_rgba(56,189,248,0.5)] flex items-center justify-center overflow-hidden">
                      <div className="w-full h-0.5 bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-pulse transition-all duration-1000" />
                      {/* Corner markers */}
                      <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
                      <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
                      <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
                      <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-sky-400" />
                    </div>
                    <span className="mt-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] font-semibold text-sky-200">
                      Alinhe o código de barras no quadro
                    </span>
                  </div>
                )}

                {/* Torch Toggle */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md border ${
                      torchOn
                        ? 'bg-amber-400 text-neutral-900 border-amber-300'
                        : 'bg-black/40 text-white border-white/20'
                    }`}
                    title="Ligar/Desligar Lanterna"
                  >
                    <Flashlight size={16} />
                  </button>
                )}
              </div>

              {/* Permission & Error Banner */}
              {cameraError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 text-xs text-amber-900">
                  <div className="flex items-start gap-2 font-bold">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRequestAndStartCamera}
                      className="px-3 py-1.5 bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <ShieldCheck size={14} />
                      <span>Solicitar Permissão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gallery')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <ImageIcon size={14} />
                      <span>Escolher da Galeria</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHowToUnlock(!showHowToUnlock)}
                      className="px-3 py-1.5 text-sky-700 font-bold underline text-[11px]"
                    >
                      Como desbloquear no celular
                    </button>
                  </div>

                  {showHowToUnlock && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 text-[11px] text-neutral-700 space-y-1">
                      <p className="font-bold text-neutral-900">Como liberar a câmera no navegador:</p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Toque no ícone de <strong>cadeado/configurações</strong> na barra de URL.</li>
                        <li>Selecione <strong>Permissões</strong> &gt; <strong>Câmera</strong>.</li>
                        <li>Escolha <strong>Permitir</strong> e volte ao app.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Quick Camera Fallback & Gallery Trigger */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Smartphone size={14} />
                  <span>Foto com Câmera Nativa</span>
                </button>
                <input
                  ref={cameraCaptureInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ImageIcon size={14} />
                  <span>Galeria de Fotos</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'gallery' ? (
            /* Smartphone Photo Gallery Selector Tab */
            <div className="space-y-4 py-3 text-center">
              <div className="border-2 border-dashed border-neutral-200 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 transition-colors bg-neutral-50/50">
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <ImageIcon size={32} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-neutral-900">
                    Galeria de Fotos do Smartphone
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Selecione uma foto da embalagem, do código de barras ou recibo da sua galeria de fotos.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isDecodingFile}
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-2xl shadow-sm transition-all flex items-center gap-2"
                  >
                    {isDecodingFile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Decodificando Imagem...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Acessar Galeria de Fotos</span>
                      </>
                    )}
                  </button>
                </div>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2 text-left">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{cameraError}</p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Barcode Input */
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <h4 className="font-black text-neutral-900 text-sm">
                  Inserir Código Numérico
                </h4>
                <p className="text-xs text-neutral-500">
                  Digite os dígitos numéricos impressos abaixo das barras do produto
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 7891000100103"
                  className="w-full px-4 py-3 pl-11 text-base sm:text-lg font-mono tracking-widest text-center border border-neutral-200 bg-white text-neutral-950 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  autoFocus
                />
                <BarcodeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              </div>

              <button
                type="button"
                disabled={!manualCode || manualCode.length < 4 || isLookingUp}
                onClick={() => lookupBarcode(manualCode)}
                className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Consultar e Preencher</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Hidden canvas for decoding files */}
          <div id="barcode-file-hidden-canvas" className="hidden" />
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
          <span>Compatível com EAN-13, EAN-8, UPC e QR</span>
          <span className="font-bold text-sky-600">Reconhecimento Local</span>
        </div>
      </div>
    </div>
  );
};
