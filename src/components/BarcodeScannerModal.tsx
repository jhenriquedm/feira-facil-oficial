import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { 
  Camera, X, Flashlight, RefreshCw, Upload, CheckCircle2, 
  AlertCircle, Sparkles, Loader2, Barcode as BarcodeIcon, Search,
  Image as ImageIcon, Smartphone, Edit3, Database, Zap, WifiOff, Globe, Info
} from 'lucide-react';
import { normalizeProductUnit, getUnitLabel, PRODUCT_UNITS } from '../utils/units';
import { normalizeBrand, formatBrandDisplay } from '../utils/brand';
import { 
  lookupBarcodeWithHierarchy, 
  learnBarcode, 
  BarcodeLookupResult 
} from '../utils/offlineBarcodeCatalog';
import { Product, Category } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (data: {
    barcode: string;
    suggestedName?: string;
    suggestedBrand?: string;
    suggestedCategory?: string;
    suggestedUnit?: string;
    existingProduct?: Product;
    isExistingInCatalog?: boolean;
    source?: string;
  }) => void;
  userProducts?: Product[];
  categories?: Category[];
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  userProducts = [],
  categories = [],
  title = 'Ler Código de Barras'
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [fileDecodeError, setFileDecodeError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);

  // Manual fast-registration fields when item is not in any database
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualUnit, setManualUnit] = useState('Un');

  // Zoom & Focus enhancements for multi-distance scanning
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const stopScanningLoopRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

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

  /**
   * Executes the exact 3-step hierarchy:
   * 1. Check user personal catalog
   * 2. Check offline built-in 11,000+ database & learned device memory
   * 3. Check online API (Open Food Facts / cloud)
   */
  const lookupBarcode = async (rawCode: string) => {
    const clean = rawCode.trim().replace(/\D/g, '').slice(0, 14);
    if (!clean) return;

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const result = await lookupBarcodeWithHierarchy(clean, userProducts, categories);
      setLookupResult(result);

      // If not found, prefill default category/unit for quick entry
      if (!result.found) {
        setManualName('');
        setManualBrand('');
        setManualCategory(categories[0]?.name || 'Mercearia');
        setManualUnit('Un');
      }
    } catch (e) {
      console.warn('Erro ao consultar código de barras:', e);
      setLookupResult({
        barcode: clean,
        found: false,
        source: 'none',
        sourceBadge: 'Erro de Consulta',
        sourceDescription: 'Ocorreu uma falha ao consultar o código.'
      });
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
    stopScanningLoopRef.current = true;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {
        // ignore
      }
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const handleZoomChange = async (targetZoom: number) => {
    setZoomLevel(targetZoom);

    // 1. Hardware Zoom on Camera Track (if supported by device)
    if (streamRef.current && hasHardwareZoom) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          await (track as any).applyConstraints({
            advanced: [{ zoom: targetZoom }]
          });
          return;
        }
      } catch (e) {
        console.warn('Hardware zoom falhou, usando zoom digital:', e);
      }
    }

    // 2. Digital CSS Zoom fallback on video element
    if (videoRef.current) {
      videoRef.current.style.transform = targetZoom > 1 ? `scale(${targetZoom})` : 'none';
      videoRef.current.style.transformOrigin = 'center center';
      videoRef.current.style.transition = 'transform 0.2s ease-out';
    }
  };

  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRing({ x, y });
    setTimeout(() => setFocusRing(null), 1200);

    // Resume video playback if Android WebView paused it
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }

    if (streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          await (track as any).applyConstraints({
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' }
            ]
          });
        }
      } catch {
        // ignore
      }
    }
  };

  const startContinuousScanner = (stream: MediaStream) => {
    // 1. Configure ZXing Reader
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, 100);
    zxingReaderRef.current = reader;

    // Attach ZXing decodeFromStream to video
    if (videoRef.current) {
      try {
        reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (stopScanningLoopRef.current) return;
          if (result && result.getText()) {
            stopScanningLoopRef.current = true;
            handleScanSuccess(result.getText());
          }
        });
      } catch (e) {
        console.warn('Erro ao anexar leitor ZXing ao stream:', e);
      }
    }

    // 2. Concurrently run native BarcodeDetector if available on device
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];
        const nativeDetector = new (window as any).BarcodeDetector({ formats });

        const nativeLoop = async () => {
          if (stopScanningLoopRef.current) return;
          try {
            const v = videoRef.current;
            if (v && v.readyState >= 2 && !v.paused && !v.ended) {
              const barcodes = await nativeDetector.detect(v);
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                if (!stopScanningLoopRef.current) {
                  stopScanningLoopRef.current = true;
                  handleScanSuccess(barcodes[0].rawValue);
                  return;
                }
              }
            }
          } catch {
            // ignore frame read error
          }

          if (!stopScanningLoopRef.current) {
            animationFrameRef.current = requestAnimationFrame(nativeLoop);
          }
        };

        animationFrameRef.current = requestAnimationFrame(nativeLoop);
      } catch (err) {
        console.info('BarcodeDetector nativo não pôde ser instanciado:', err);
      }
    }
  };

  const startCamera = async () => {
    stopCamera();
    stopScanningLoopRef.current = false;
    setIsScanning(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      streamRef.current = stream;

      // Ensure video element receives the stream
      if (videoRef.current) {
        const v = videoRef.current;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.srcObject = stream;
        try {
          await v.play();
        } catch {
          // ignore
        }
      }

      // Check capabilities for zoom & flashlight
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities.torch));
        setHasHardwareZoom(Boolean(capabilities.zoom));

        // Re-apply zoom if zoomLevel > 1
        if (capabilities.zoom && zoomLevel > 1) {
          try {
            await (track as any).applyConstraints({
              advanced: [{ zoom: zoomLevel }]
            });
          } catch {
            // ignore
          }
        }
      }

      // Start dual scanning engine
      startContinuousScanner(stream);
    } catch (err: any) {
      console.warn('Erro ao acessar câmera no leitor de código de barras:', err);
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      }
    } catch {
      // torch unsupported
    }
  };

  // Process image from smartphone gallery or photo file with dual-engine (BarcodeDetector + ZXing)
  const handleProcessImageFile = async (file: File) => {
    setIsDecodingFile(true);
    setFileDecodeError(null);
    try {
      // Step 1: Try Native BarcodeDetector (fastest and handles high-res 48MP photos seamlessly)
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
          const formatsToUse = [
            'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'
          ].filter((f: string) => supportedFormats.includes(f));

          if (formatsToUse.length > 0) {
            const nativeDetector = new (window as any).BarcodeDetector({ formats: formatsToUse });
            const bitmap = await createImageBitmap(file);
            const detected = await nativeDetector.detect(bitmap);
            if (detected && detected.length > 0 && detected[0]?.rawValue) {
              playBeep();
              await lookupBarcode(detected[0].rawValue);
              return;
            }
          }
        } catch (nativeErr) {
          console.warn('Falha no BarcodeDetector ao analisar foto, tentando ZXing:', nativeErr);
        }
      }

      // Step 2: Try ZXing decodeFromImageUrl
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      const objectUrl = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(objectUrl);
        if (result && result.getText()) {
          playBeep();
          await lookupBarcode(result.getText());
          return;
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
        reader.reset();
      }

      setFileDecodeError(
        'Nenhum código de barras legível foi encontrado nesta foto. Mantenha a câmera a cerca de 15 a 25 cm para foco nítido ou digite os números do código.'
      );
    } catch (err: any) {
      setFileDecodeError(
        'Nenhum código de barras legível foi encontrado nesta foto. Mantenha a câmera a cerca de 15 a 25 cm para foco nítido ou digite os números do código.'
      );
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
    if (!lookupResult?.barcode) return;
    onDetected({
      barcode: lookupResult.barcode,
      suggestedName: lookupResult.name,
      suggestedBrand: normalizeBrand(lookupResult.brand),
      suggestedCategory: lookupResult.category,
      suggestedUnit: normalizeProductUnit(lookupResult.unit),
      existingProduct: lookupResult.existingProduct,
      isExistingInCatalog: Boolean(lookupResult.isUserCatalogProduct),
      source: lookupResult.sourceBadge
    });
    onClose();
  };

  // Quick-save manual product and learn for future offline scans
  const handleSaveManualItem = () => {
    if (!lookupResult?.barcode) return;
    const finalName = manualName.trim() || `Produto ${lookupResult.barcode}`;
    const finalBrand = normalizeBrand(manualBrand);
    const finalCategory = manualCategory || (categories[0]?.name || 'Mercearia');
    const finalUnit = normalizeProductUnit(manualUnit);

    // Save to device local memory so it learns with use!
    learnBarcode({
      barcode: lookupResult.barcode,
      name: finalName,
      brand: finalBrand,
      category: finalCategory,
      unit: finalUnit
    });

    onDetected({
      barcode: lookupResult.barcode,
      suggestedName: finalName,
      suggestedBrand: finalBrand,
      suggestedCategory: finalCategory,
      suggestedUnit: finalUnit,
      isExistingInCatalog: false,
      source: 'Memória Local do Aparelho'
    });
    onClose();
  };

  // Switch to manual edit mode with current barcode
  const handleReviewAndType = () => {
    if (lookupResult?.barcode) {
      setManualCode(lookupResult.barcode);
    }
    setLookupResult(null);
    setActiveTab('manual');
  };

  // Reset scan state and cleanly reboot camera stream
  const handleResetScan = async () => {
    setLookupResult(null);
    setFileDecodeError(null);
    setActiveTab('camera');
    await stopCamera();
    setTimeout(() => {
      startCamera();
    }, 120);
  };

  // Ensure stream is attached to video element as soon as it mounts in DOM
  useEffect(() => {
    if (activeTab === 'camera' && !lookupResult && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      if (v.srcObject !== streamRef.current) {
        v.srcObject = streamRef.current;
      }
      v.play().catch(() => {});
    }
  }, [activeTab, lookupResult]);

  useEffect(() => {
    if (isOpen) {
      setLookupResult(null);
      setFileDecodeError(null);
      setManualCode('');
      setActiveTab('camera');

      // Auto-start camera after modal transition
      const t = setTimeout(() => {
        startCamera();
      }, 250);
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
                Base nativa de 11.000+ produtos offline & consulta instantânea
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
        {!lookupResult && (
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
              <span>Câmera</span>
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
                  ? 'bg-white text-amber-600 shadow-sm border border-neutral-200/80 font-black'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              <Search size={15} />
              <span>Digitar Código</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center bg-white">
          {lookupResult ? (
            /* Result Confirmation Card */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              {lookupResult.found ? (
                /* Found (User Catalog OR Offline Built-In OR Learned OR Online API) */
                <>
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                    lookupResult.isUserCatalogProduct 
                      ? 'bg-sky-50 border-sky-200' 
                      : lookupResult.source === 'built_in_offline'
                      ? 'bg-emerald-50 border-emerald-200'
                      : lookupResult.source === 'learned_offline'
                      ? 'bg-teal-50 border-teal-200'
                      : 'bg-indigo-50 border-indigo-200'
                  }`}>
                    {lookupResult.isUserCatalogProduct ? (
                      <CheckCircle2 size={24} className="text-sky-600 shrink-0 mt-0.5" />
                    ) : lookupResult.source === 'built_in_offline' ? (
                      <Zap size={24} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : lookupResult.source === 'learned_offline' ? (
                      <Database size={24} className="text-teal-600 shrink-0 mt-0.5" />
                    ) : (
                      <Globe size={24} className="text-indigo-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          lookupResult.isUserCatalogProduct ? 'text-sky-700' : 'text-emerald-700'
                        }`}>
                          Código Reconhecido
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full flex items-center gap-1 ${
                          lookupResult.isUserCatalogProduct
                            ? 'bg-sky-200 text-sky-800'
                            : lookupResult.source === 'built_in_offline'
                            ? 'bg-emerald-200 text-emerald-800'
                            : lookupResult.source === 'learned_offline'
                            ? 'bg-teal-200 text-teal-800'
                            : 'bg-indigo-200 text-indigo-800'
                        }`}>
                          {lookupResult.source === 'built_in_offline' && <Zap size={10} />}
                          {lookupResult.source === 'learned_offline' && <Database size={10} />}
                          {lookupResult.source === 'online_api' && <Globe size={10} />}
                          {lookupResult.sourceBadge}
                        </span>
                      </div>
                      <p className="font-mono text-xl font-black text-neutral-950 mt-1">
                        {lookupResult.barcode}
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {lookupResult.sourceDescription}
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
                        Dados Identificados
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-500">Nome do Produto</label>
                        <p className="font-bold text-neutral-900 text-sm">
                          {lookupResult.name || '(Definir nome)'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200">
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-400">Marca</label>
                          <p className="text-xs font-bold text-neutral-800 truncate">
                            {formatBrandDisplay(lookupResult.brand) || 'Sem marca'}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-400">Categoria</label>
                          <p className="text-xs font-bold text-sky-600 truncate">
                            {lookupResult.category || 'Geral'}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-400">Unidade</label>
                          <p className="text-xs font-bold text-neutral-800">
                            {getUnitLabel(lookupResult.unit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResetScan}
                      className="w-full sm:flex-1 py-3 px-4 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={14} />
                      <span>Ler Outro</span>
                    </button>
                    <button
                      type="button"
                      onClick={confirmApply}
                      className={`w-full sm:flex-1 py-3 px-4 active:scale-98 text-white rounded-2xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        lookupResult.isUserCatalogProduct 
                          ? 'bg-sky-600 hover:bg-sky-700' 
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>
                        {lookupResult.isUserCatalogProduct ? 'Abrir / Adicionar' : 'Preencher Cadastro'}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                /* NOT Found anywhere -> Allow quick local registration with auto-learning */
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-sm text-amber-900 leading-snug">
                          Código não localizado nas bases
                        </h4>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          O código <strong className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">{lookupResult.barcode}</strong> não consta na base offline nem na nuvem.
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/60 text-xs text-amber-950 font-medium leading-relaxed">
                      💡 <strong>A Base aprende com o uso:</strong> Ao preencher os dados abaixo, esse produto fica gravado na memória do aparelho. Na próxima vez que for ao mercado, ele será reconhecido offline instantaneamente!
                    </div>
                  </div>

                  {/* Fast Registration Form inside modal */}
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3 text-left">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Ex: Arroz Branco Tipo 1 5kg"
                        className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Marca (opcional)
                        </label>
                        <input
                          type="text"
                          value={manualBrand}
                          onChange={(e) => setManualBrand(e.target.value)}
                          placeholder="Ex: Tio João"
                          className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Unidade
                        </label>
                        <select
                          value={manualUnit}
                          onChange={(e) => setManualUnit(e.target.value)}
                          className="w-full px-2 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        >
                          {PRODUCT_UNITS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {categories.length > 0 && (
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                          Categoria
                        </label>
                        <select
                          value={manualCategory}
                          onChange={(e) => setManualCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={!manualName.trim()}
                      onClick={handleSaveManualItem}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white rounded-2xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      <span>Salvar e Gravar na Memória do Aparelho</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleReviewAndType}
                        className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 active:scale-98 text-neutral-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-neutral-200"
                      >
                        <Edit3 size={14} />
                        <span>Revisar Código</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetScan}
                        className="flex-1 py-2.5 px-3 text-xs font-bold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={13} />
                        <span>Ler Outro</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'camera' ? (
            /* Live Camera View */
            <div className="space-y-3">
              <div 
                onClick={handleTapToFocus}
                className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner cursor-pointer select-none"
              >
                <video
                  ref={(el) => {
                    if (el) {
                      videoRef.current = el;
                      el.muted = true;
                      el.defaultMuted = true;
                      el.setAttribute('playsinline', 'true');
                      el.setAttribute('webkit-playsinline', 'true');
                      if (streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Tap to Focus Ring Animation */}
                {focusRing && (
                  <div 
                    className="absolute pointer-events-none w-14 h-14 -translate-x-1/2 -translate-y-1/2 border-2 border-amber-400 rounded-full animate-ping z-20"
                    style={{ left: focusRing.x, top: focusRing.y }}
                  />
                )}

                {/* Top Controls: Zoom Pills & Torch */}
                <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-auto">
                  {/* Zoom Selector */}
                  <div className="flex items-center gap-1 bg-black/65 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-lg">
                    <span className="text-[10px] font-black uppercase text-neutral-400 pl-1.5 pr-0.5">
                      Zoom
                    </span>
                    {[1, 1.5, 2, 2.5].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomChange(z);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                          zoomLevel === z
                            ? 'bg-sky-500 text-white shadow-md scale-105'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {z}x
                      </button>
                    ))}
                  </div>

                  {/* Torch Toggle */}
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTorch();
                      }}
                      className={`p-2.5 rounded-2xl transition-all shadow-md ${
                        torchOn
                          ? 'bg-amber-400 text-neutral-900 shadow-amber-400/50 scale-105'
                          : 'bg-black/65 backdrop-blur-md text-white border border-white/15 hover:bg-black/80'
                      }`}
                      title="Ligar/Desligar Lanterna"
                    >
                      <Flashlight size={16} />
                    </button>
                  )}
                </div>

                {/* Laser Scanning Overlay Animation - Responsive, Wide & Non-Restrictive */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Wide Viewfinder Box */}
                    <div className="relative w-[88%] max-w-[340px] h-[58%] border-2 border-sky-400/70 rounded-3xl shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center overflow-hidden bg-sky-500/5">
                      {/* Laser red/cyan scan beam */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_10px_#38bdf8] animate-pulse transition-all duration-1000" />
                      
                      {/* Corner markers */}
                      <span className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-sky-300 rounded-tl-lg" />
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-sky-300 rounded-tr-lg" />
                      <span className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-sky-300 rounded-bl-lg" />
                      <span className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-sky-300 rounded-br-lg" />
                    </div>

                    {/* Bottom Guidance Toast */}
                    <div className="mt-3 flex flex-col items-center gap-1">
                      <p className="text-[11px] font-bold text-white drop-shadow bg-black/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                        <span>Aponte para o código • Distância ideal 15 a 25 cm</span>
                      </p>
                      <span className="text-[10px] text-white/75 drop-shadow font-medium">
                        Leitura em tela inteira • Não precisa centralizar
                      </span>
                    </div>
                  </div>
                )}

                {/* Idle / Re-activate Camera Overlay */}
                {!isScanning && !isLookingUp && (
                  <div className="absolute inset-0 bg-neutral-900/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-30 gap-3">
                    <p className="text-white text-xs font-bold text-center">
                      Câmera pausada
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera();
                      }}
                      className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Camera size={16} />
                      <span>Reativar Câmera</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Distance & Macro Tip Card */}
              <div className="p-3 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-xs text-sky-950 flex items-start gap-2.5">
                <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed text-justify">
                  <p className="text-[11px] font-bold text-sky-900">
                    💡 Dica para foco nítido e leitura rápida:
                  </p>
                  <p className="text-[11px] text-sky-800">
                    Se a câmera do seu celular perder o foco ao aproximar demais, <strong>afaste um pouco (15 a 25 cm)</strong> e toque no botão <strong>1.5x</strong> ou <strong>2x</strong> acima. A imagem ficará nítida e a leitura será imediata! Toque na imagem para focar.
                  </p>
                </div>
              </div>

              {/* Direct Native Camera & Gallery Triggers */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                >
                  <Smartphone size={15} />
                  <span>Foto Câmera Nativa</span>
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
                  className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                >
                  <ImageIcon size={15} />
                  <span>Galeria de Fotos</span>
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
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
                    Selecione uma foto da embalagem ou do código de barras diretamente do seu álbum.
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

              {fileDecodeError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2 text-left">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{fileDecodeError}</p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Barcode Input with 14 Character Retail Limit */
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <h4 className="font-black text-neutral-900 text-sm">
                  Digitar Código de Barras
                </h4>
                <p className="text-xs text-neutral-500">
                  Digite os dígitos numéricos da embalagem (limite máximo de 14 dígitos padrão GTIN/EAN)
                </p>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={14}
                    value={manualCode}
                    onChange={(e) => {
                      const numOnly = e.target.value.replace(/\D/g, '').slice(0, 14);
                      setManualCode(numOnly);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualCode.trim()) {
                        lookupBarcode(manualCode);
                      }
                    }}
                    placeholder="Ex: 7891000100103"
                    className="w-full text-center font-mono text-xl tracking-wider py-3.5 px-4 bg-neutral-50 border-2 border-neutral-300 focus:border-amber-500 focus:bg-white rounded-2xl font-black text-neutral-900 focus:outline-none transition-all"
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1.5 px-1 text-[11px] text-neutral-400">
                  <span>Padrão EAN-8, EAN-13 ou UPC-A</span>
                  <span>{manualCode.length}/14 dígitos</span>
                </div>
              </div>

              <button
                type="button"
                disabled={!manualCode.trim() || isLookingUp}
                onClick={() => lookupBarcode(manualCode)}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white rounded-2xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Consultando Bases...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Consultar Código</span>
                  </>
                )}
              </button>

              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
                <p className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Database size={13} className="text-emerald-600" />
                  Base interna offline integrada
                </p>
                <p>
                  Mais de 11.000 produtos das principais marcas do Brasil já vêm cadastrados nativamente no app e podem ser consultados mesmo sem nenhuma conexão com a internet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
