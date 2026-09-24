import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, X, RefreshCw, Check, AlertCircle, 
  Trash2, Plus, Sparkles, Store, Calendar, FileText, CheckCircle2,
  Receipt, ArrowRight, DollarSign, Tag, HelpCircle, Flashlight,
  Smartphone, Info
} from 'lucide-react';
import { Category, Product } from '../types';
import { sanitizeAndCapitalize } from '../utils/textFormatters';
import { PRODUCT_UNITS, normalizeProductUnit } from '../utils/units';
import { normalizeBrand } from '../utils/brand';
import { getApiUrl } from '../utils/apiConfig';

export interface OcrExtractedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  brand: string;
  barcode?: string;
  selected: boolean;
}

export interface OcrResultData {
  market: string;
  date: string;
  totalAmount?: number;
  discountAmount?: number;
  items: OcrExtractedItem[];
}

interface ReceiptOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  activePurchaseId?: string | null;
  activePurchaseName?: string | null;
  onConfirmNewPurchase?: (data: {
    market: string;
    date: string;
    name: string;
    discount?: number;
    items: OcrExtractedItem[];
  }) => Promise<void>;
  onConfirmAddToActivePurchase?: (items: OcrExtractedItem[]) => Promise<void>;
}

export function ReceiptOcrModal({
  isOpen,
  onClose,
  categories,
  products,
  activePurchaseId,
  activePurchaseName,
  onConfirmNewPurchase,
  onConfirmAddToActivePurchase
}: ReceiptOcrModalProps) {
  const [step, setStep] = useState<'capture' | 'processing' | 'review'>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Camera and Focus Enhancements for Receipts
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  // Extracted Result States
  const [extractedMarket, setExtractedMarket] = useState('');
  const [extractedDate, setExtractedDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [extractedTotal, setExtractedTotal] = useState<number | undefined>(undefined);
  const [extractedDiscount, setExtractedDiscount] = useState<number | undefined>(undefined);
  const [extractedItems, setExtractedItems] = useState<OcrExtractedItem[]>([]);
  const [purchaseTitle, setPurchaseTitle] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('capture');
      setImagePreview(null);
      setErrorMessage('');
      setIsProcessing(false);
      setExtractedItems([]);
      setExtractedMarket('');
      setExtractedTotal(undefined);
      setExtractedDiscount(undefined);
      setPurchaseTitle('');
      setZoomLevel(1);
      setTorchOn(false);
      setFocusRing(null);
      setExtractedDate(new Date().toISOString().substring(0, 10));
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const handleZoomChange = async (targetZoom: number) => {
    setZoomLevel(targetZoom);

    // 1. Hardware Zoom on Camera Track (if supported by device)
    if (streamRef.current && hasHardwareZoom) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: targetZoom } as any]
          });
          return;
        } catch (e) {
          console.warn('Hardware zoom falhou, usando zoom digital:', e);
        }
      }
    }

    // 2. Digital CSS Zoom fallback on video element
    if (videoRef.current) {
      videoRef.current.style.transform = targetZoom > 1 ? `scale(${targetZoom})` : 'none';
      videoRef.current.style.transformOrigin = 'center center';
      videoRef.current.style.transition = 'transform 0.2s ease-out';
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Erro ao alternar lanterna:', err);
    }
  };

  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRing({ x, y });
    setTimeout(() => setFocusRing(null), 1200);

    // If video was paused or waiting for gesture in Android WebView, play it now
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [
              { focusMode: 'continuous' } as any,
              { exposureMode: 'continuous' } as any
            ]
          });
        } catch {
          // ignore
        }
      }
    }
  };

  const startCamera = async () => {
    setErrorMessage('');
    try {
      stopCamera();

      // Flexible constraints with reliable progressive fallback
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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
      setIsCameraActive(true);

      // Immediately connect stream to video element if already mounted
      if (videoRef.current) {
        const v = videoRef.current;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.srcObject = stream;
        v.play().catch(() => {});
      }

      // Check track capabilities (Torch, Hardware Zoom, Autofocus)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        if (capabilities.zoom) {
          setHasHardwareZoom(true);
          if (zoomLevel > 1) {
            try {
              await track.applyConstraints({
                advanced: [{ zoom: zoomLevel } as any]
              });
            } catch {
              // ignore
            }
          }
        } else {
          setHasHardwareZoom(false);
        }

        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            });
          } catch {
            // ignore
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setIsCameraActive(false);
      setErrorMessage(
        'Não foi possível abrir a câmera ao vivo. Você pode tirar uma foto com a câmera nativa do celular ou selecionar uma foto da galeria.'
      );
    }
  };

  // Ensure stream is attached to video element as soon as it mounts in DOM
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');
      if (v.srcObject !== streamRef.current) {
        v.srcObject = streamRef.current;
      }
      v.play().catch((e) => console.warn('Falha ao reproduzir stream:', e));
    }
  }, [isCameraActive]);

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const vWidth = video.videoWidth || 1920;
      const vHeight = video.videoHeight || 1080;

      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (!hasHardwareZoom && zoomLevel > 1) {
          // Crop digital zoom to match user's viewfinder preview
          const sx = (vWidth * (1 - 1 / zoomLevel)) / 2;
          const sy = (vHeight * (1 - 1 / zoomLevel)) / 2;
          const sWidth = vWidth / zoomLevel;
          const sHeight = vHeight / zoomLevel;
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        stopCamera();
        setImagePreview(dataUrl);
        processReceiptImage(dataUrl);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao capturar foto da câmera.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      stopCamera();
      setImagePreview(dataUrl);
      processReceiptImage(dataUrl);
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler arquivo da imagem.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processReceiptImage = async (dataUrl: string) => {
    setStep('processing');
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch(getApiUrl('/api/gemini/receipt-ocr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: 'image/jpeg'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao processar cupom fiscal com IA.');
      }

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error('Falha ao comunicar com o servidor de IA. Verifique sua conexão com a internet.');
      }

      if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
        throw new Error('Nenhum item de compra foi reconhecido na imagem do cupom. Tente uma foto mais nítida e bem iluminada.');
      }

      const mappedItems: OcrExtractedItem[] = result.items.map((it: any, idx: number) => ({
        id: `ocr_${Date.now()}_${idx}`,
        name: it.name || 'Produto sem nome',
        quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
        unit: normalizeProductUnit(it.unit || 'Un'),
        unitPrice: Number(it.unitPrice) >= 0 ? Number(it.unitPrice) : 0,
        totalPrice: Number(it.totalPrice) >= 0 ? Number(it.totalPrice) : (Number(it.quantity) * Number(it.unitPrice)),
        category: it.category || 'Mercearia',
        brand: normalizeBrand(it.brand),
        barcode: it.barcode || '',
        selected: true
      }));

      const detectedMarket = (result.market || 'Supermercado').trim();
      const detectedDate = result.date || new Date().toISOString().substring(0, 10);
      
      setExtractedMarket(detectedMarket);
      setExtractedDate(detectedDate);
      setExtractedTotal(result.totalAmount);
      setExtractedDiscount(result.discountAmount);
      setExtractedItems(mappedItems);
      setPurchaseTitle(`Compra ${detectedMarket} - ${detectedDate.split('-').reverse().slice(0, 2).join('/')}`);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha no processamento óptico do cupom fiscal.');
      setStep('capture');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleItem = (id: string) => {
    setExtractedItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  const handleUpdateItem = (id: string, field: keyof OcrExtractedItem, value: any) => {
    setExtractedItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.totalPrice = Number((Number(updated.quantity) * Number(updated.unitPrice)).toFixed(2));
      }
      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setExtractedItems(prev => prev.filter(it => it.id !== id));
  };

  const handleAddItem = () => {
    const newItem: OcrExtractedItem = {
      id: `ocr_manual_${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'Un',
      unitPrice: 0,
      totalPrice: 0,
      category: categories[0]?.name || 'Mercearia',
      brand: '',
      selected: true
    };
    setExtractedItems(prev => [...prev, newItem]);
  };

  // Financial summary of selected items
  const selectedItems = extractedItems.filter(i => i.selected);
  const selectedTotal = selectedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleConfirm = async () => {
    if (selectedItems.length === 0) {
      setErrorMessage('Selecione pelo menos um item da lista para importar.');
      return;
    }

    try {
      setIsProcessing(true);
      if (activePurchaseId && onConfirmAddToActivePurchase) {
        await onConfirmAddToActivePurchase(selectedItems);
      } else if (onConfirmNewPurchase) {
        await onConfirmNewPurchase({
          market: extractedMarket.trim() || 'Supermercado',
          date: extractedDate || new Date().toISOString().substring(0, 10),
          name: purchaseTitle.trim() || `Compra ${extractedMarket}`,
          discount: extractedDiscount,
          items: selectedItems
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao importar itens do cupom fiscal.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-neutral-200 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2">
                Leitor OCR de Cupom Fiscal
                <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IA Gemini
                </span>
              </h2>
              <p className="text-xs text-neutral-500">
                {activePurchaseId
                  ? `Importar itens diretamente para a compra "${activePurchaseName}"`
                  : 'Fotografe o cupom ou nota fiscal para criar uma lista automática com todos os itens'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CAPTURE PHOTO OR SELECT FILE */}
        {step === 'capture' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Live Camera View */}
            {isCameraActive ? (
              <div className="space-y-3">
                <div 
                  onClick={handleTapToFocus}
                  className="relative bg-black rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center shadow-inner cursor-pointer select-none"
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

                  {/* Top Floating Controls: Zoom Selector & Torch */}
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
                              ? 'bg-emerald-500 text-white shadow-md scale-105'
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

                  {/* Clean Camera Guide Frame (unobstructed, no overlapping text badges) */}
                  <div className="absolute inset-3 border-2 border-dashed border-white/35 rounded-2xl pointer-events-none" />

                  {/* Capture Floating Action Bar */}
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-3 pointer-events-auto z-10">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-neutral-900/80 backdrop-blur-xs text-white rounded-xl text-xs font-bold hover:bg-neutral-900 transition-all border border-white/10"
                    >
                      Fechar Câmera
                    </button>

                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="h-14 w-14 rounded-full bg-white text-emerald-600 shadow-xl flex items-center justify-center border-4 border-emerald-500 hover:scale-105 active:scale-95 transition-all"
                      title="Fotografar Cupom"
                    >
                      <Camera size={26} />
                    </button>

                    <div className="w-20" />
                  </div>
                </div>

                {/* Macro Focus Guidance Note */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
                  <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed text-justify">
                    <p className="text-[11px] font-bold text-emerald-900">
                      💡 Dica de Foco & Macro para Cupons Fiscais:
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      As letras miúdas de notas fiscais costumam borrar se a lente aproximar demais. <strong>Mantenha o celular afastado (20 a 35 cm)</strong> e toque no botão <strong>1.5x</strong> ou <strong>2x</strong> acima. A imagem capturada será nítida e a leitura dos preços e produtos será imediata!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Option 1: Live Camera with Zoom */}
                <div className="p-5 rounded-3xl bg-neutral-50 border-2 border-dashed border-neutral-200 hover:border-emerald-500 text-center flex flex-col items-center justify-between gap-3 transition-all group">
                  <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl group-hover:scale-110 transition-transform">
                    <Camera size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-900">Câmera ao Vivo</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Visor interativo com zoom 1.5x / 2x, foco por toque e lanterna.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Camera size={14} />
                    <span>Abrir Câmera</span>
                  </button>
                </div>

                {/* Option 2: Native Smartphone Camera (Full HD / 4K) */}
                <div className="p-5 rounded-3xl bg-neutral-50 border-2 border-dashed border-neutral-200 hover:border-purple-500 text-center flex flex-col items-center justify-between gap-3 transition-all group">
                  <div className="p-3.5 bg-purple-100 text-purple-700 rounded-2xl group-hover:scale-110 transition-transform">
                    <Smartphone size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-900">Câmera do Celular</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Usa o app nativo do seu aparelho com alta resolução e foco automático.
                    </p>
                  </div>
                  <input
                    ref={cameraCaptureInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cameraCaptureInputRef.current?.click()}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Smartphone size={14} />
                    <span>Tirar Foto HD</span>
                  </button>
                </div>

                {/* Option 3: Upload from Gallery / Files */}
                <div className="p-5 rounded-3xl bg-neutral-50 border-2 border-dashed border-neutral-200 hover:border-sky-500 text-center flex flex-col items-center justify-between gap-3 transition-all group">
                  <div className="p-3.5 bg-sky-100 text-sky-700 rounded-2xl group-hover:scale-110 transition-transform">
                    <ImageIcon size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-900">Galeria de Fotos</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Envie uma foto ou comprovante já salvo no seu aparelho.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon size={14} />
                    <span>Abrir Galeria</span>
                  </button>
                </div>
              </div>
            )}

            {/* Practical Tips */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-sky-500" />
                Dicas para leitura 100% precisa:
              </span>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-500 leading-relaxed">
                <li>Fotografe o cupom esticado sobre uma mesa com boa iluminação.</li>
                <li>Certifique-se de que a coluna de <strong>quantidade</strong> e <strong>preço unitário</strong> está visível.</li>
                <li>Se o cupom for muito longo, fotografe em partes ou enquadre a seção principal dos produtos.</li>
                <li>A IA Gemini decodifica abreviações de supermercado automaticamente (ex: "ACUCAR CRIST 1KG" virará "Açúcar Cristal 1kg").</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING ANIMATION */}
        {step === 'processing' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse">
                <Receipt size={36} />
              </div>
              <div className="absolute -top-2 -right-2 p-1.5 bg-sky-500 text-white rounded-full animate-spin">
                <RefreshCw size={14} />
              </div>
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="font-black text-base text-neutral-900">
                Processando Cupom Fiscal com IA...
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                A inteligência artificial está lendo as linhas do recibo, identificando o supermercado, produtos, quantidades e preços pagos.
              </p>
            </div>

            {imagePreview && (
              <div className="h-28 w-28 rounded-2xl overflow-hidden border border-neutral-200 shadow-xs opacity-75">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: REVIEW EXTRACTED PRODUCTS */}
        {step === 'review' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Header Extracted Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                  Nome do estabelecimento
                </label>
                <div className="relative">
                  <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    maxLength={40}
                    value={extractedMarket}
                    onChange={(e) => setExtractedMarket(sanitizeAndCapitalize(e.target.value, 40))}
                    placeholder="Ex: Pão de Açúcar, Assaí"
                    className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                  Data da Compra
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="date"
                    value={extractedDate}
                    onChange={(e) => setExtractedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                  Total Registrado no Cupom
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-emerald-700">
                    {extractedTotal !== undefined ? formatCurrency(extractedTotal) : 'Não indicado'}
                  </span>
                  {extractedDiscount && extractedDiscount > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Desconto: -{formatCurrency(extractedDiscount)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!activePurchaseId && (
              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1">
                  Título para esta Nova Compra
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={purchaseTitle}
                  onChange={(e) => setPurchaseTitle(sanitizeAndCapitalize(e.target.value, 40))}
                  placeholder="Ex: Compra Mensal - Mercado Central"
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            {/* Extracted Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-neutral-900">
                    Itens Identificados ({selectedItems.length} de {extractedItems.length} selecionados)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = extractedItems.every(i => i.selected);
                      setExtractedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                    }}
                    className="text-xs font-bold text-sky-600 hover:underline"
                  >
                    {extractedItems.every(i => i.selected) ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Adicionar Linha</span>
                  </button>
                </div>
              </div>

              {/* Items Table / Cards */}
              <div className="space-y-2 border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-white">
                {extractedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center gap-2.5 ${
                      item.selected ? 'bg-white' : 'bg-neutral-50/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Product Name & Brand */}
                    <div className="flex-1 min-w-[180px]">
                      <input
                        type="text"
                        maxLength={40}
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', sanitizeAndCapitalize(e.target.value, 40))}
                        placeholder="Nome do produto"
                        className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          maxLength={30}
                          value={item.brand}
                          onChange={(e) => handleUpdateItem(item.id, 'brand', normalizeBrand(sanitizeAndCapitalize(e.target.value, 30)))}
                          placeholder="Marca (opcional)"
                          className="w-1/2 px-2 py-0.5 text-base sm:text-[11px] bg-white text-neutral-500 border border-dashed border-neutral-200 rounded-md focus:outline-none"
                        />
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                          className="w-1/2 px-2 py-0.5 text-base sm:text-[11px] font-semibold bg-white rounded-md border border-neutral-200 text-neutral-700 overflow-y-auto max-h-48 cursor-pointer"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                    </div>

                    {/* Qty, Unit, Unit Price */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Qtd</label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none"
                        />
                      </div>

                      <div className="w-16">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Unid</label>
                        <select
                          value={normalizeProductUnit(item.unit)}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          className="w-full px-1.5 py-1 text-base sm:text-xs bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none overflow-y-auto max-h-48 cursor-pointer"
                        >
                          {PRODUCT_UNITS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Preço (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none"
                        />
                      </div>

                      <div className="w-20 text-right">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Subtotal</label>
                        <span className="text-xs font-black text-neutral-900 block py-1">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors ml-1"
                        title="Remover Item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {step === 'review' ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-neutral-500">Soma dos selecionados:</span>
                <span className="text-base font-black text-emerald-600">
                  {formatCurrency(selectedTotal)}
                </span>
                <span className="text-neutral-400">({selectedItems.length} itens)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('capture')}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  Fotografar Outro
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing || selectedItems.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>
                        {activePurchaseId
                          ? `Adicionar ${selectedItems.length} Itens à Compra`
                          : `Criar Compra com ${selectedItems.length} Itens`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
