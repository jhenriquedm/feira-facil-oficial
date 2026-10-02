import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { 
  Camera, Image as ImageIcon, X, RefreshCw, Check, AlertCircle, 
  Trash2, Plus, Sparkles, Store, Calendar, FileText, CheckCircle2,
  Receipt, ArrowRight, DollarSign, Tag, HelpCircle, Flashlight,
  Smartphone, Info, QrCode, Link as LinkIcon, CheckCheck
} from 'lucide-react';
import { Category, Product } from '../types';
import { sanitizeAndCapitalize, formatMoneyInput, parseMoneyToNumber } from '../utils/textFormatters';
import { PRODUCT_UNITS, normalizeProductUnit } from '../utils/units';
import { normalizeBrand } from '../utils/brand';
import { getApiUrl } from '../utils/apiConfig';
import { fetchSefazQrCodeData } from '../utils/sefazParser';
import { findBestMatchingProduct } from '../utils/productMatcher';

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
  matchedProductId?: string;
  matchedProductName?: string;
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
  addCategory?: (name: string, iconName: string) => Promise<any>;
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
  addCategory,
  onConfirmNewPurchase,
  onConfirmAddToActivePurchase
}: ReceiptOcrModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'manual'>('camera');
  const [step, setStep] = useState<'capture' | 'processing' | 'review'>('capture');
  const [processingStatus, setProcessingStatus] = useState('Consultando Cupom Fiscal na SEFAZ...');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [manualQrUrl, setManualQrUrl] = useState('');
  const [itemToDelete, setItemToDelete] = useState<OcrExtractedItem | null>(null);

  // Quick category creation inside review modal
  const [showQuickCatModal, setShowQuickCatModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickTargetItemId, setQuickTargetItemId] = useState<string | null>(null);

  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showErrorMessageTimed = (msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMessage(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Camera & Viewfinder Controls
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
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stopScanningLoopRef = useRef(false);

  // Sound beep & haptic feedback on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // audio context maybe unsupported/blocked
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch {
        // ignore
      }
    }
  };

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('capture');
      setActiveTab('camera');
      setErrorMessage('');
      setIsProcessing(false);
      setExtractedItems([]);
      setExtractedMarket('');
      setExtractedTotal(undefined);
      setExtractedDiscount(undefined);
      setPurchaseTitle('');
      setScannedUrl(null);
      setManualQrUrl('');
      setZoomLevel(1);
      setTorchOn(false);
      setFocusRing(null);
      setExtractedDate(new Date().toISOString().substring(0, 10));
      // Auto-start camera when modal opens
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
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
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const handleZoomChange = async (targetZoom: number) => {
    setZoomLevel(targetZoom);

    // 1. Hardware Zoom on Camera Track
    if (streamRef.current && hasHardwareZoom) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: targetZoom } as any]
          });
          return;
        } catch (e) {
          console.warn('Hardware zoom falhou:', e);
        }
      }
    }

    // 2. Digital CSS Zoom fallback
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
    stopScanningLoopRef.current = false;
    try {
      stopCamera();
      stopScanningLoopRef.current = false;

      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      zxingReaderRef.current = reader;

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

      if (videoRef.current) {
        const v = videoRef.current;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.srcObject = stream;
        await v.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities.torch));
        setHasHardwareZoom(Boolean(capabilities.zoom));

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

      // Start continuous QR Code scan loop
      startScanningLoop();
    } catch (err: any) {
      console.error(err);
      setIsCameraActive(false);
      setErrorMessage(
        'Não foi possível abrir a câmera ao vivo. Você pode selecionar uma foto do QR Code da galeria ou colar o link da SEFAZ.'
      );
    }
  };

  const startScanningLoop = () => {
    let lastScanTime = 0;

    const scanFrame = async (timestamp: number) => {
      if (stopScanningLoopRef.current) return;

      if (timestamp - lastScanTime > 150) {
        lastScanTime = timestamp;

        if (videoRef.current && videoRef.current.readyState >= 2 && zxingReaderRef.current) {
          try {
            // Check native BarcodeDetector first if available
            if ('BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const qrText = barcodes[0].rawValue.trim();
                  handleQrCodeDetected(qrText);
                  return;
                }
              } catch {
                // fallback to ZXing
              }
            }

            // ZXing decode
            const result = zxingReaderRef.current.decode(videoRef.current);
            if (result && result.getText()) {
              const qrText = result.getText().trim();
              handleQrCodeDetected(qrText);
              return;
            }
          } catch {
            // No barcode found in current frame, loop continues
          }
        }
      }

      if (!stopScanningLoopRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleQrCodeDetected = async (qrText: string) => {
    if (!qrText) return;
    playBeep();
    stopCamera();
    setScannedUrl(qrText);
    await processSefazQrCode(qrText);
  };

  // Handle Photo selection from Gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setStep('processing');
    setIsProcessing(true);
    setProcessingStatus('Decodificando QR Code da imagem...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        try {
          const hints = new Map<DecodeHintType, any>();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const zxing = new BrowserMultiFormatReader(hints);

          const img = new Image();
          img.onload = async () => {
            try {
              let qrCodeText = '';

              // Native BarcodeDetector check
              if ('BarcodeDetector' in window) {
                try {
                  const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                  const codes = await detector.detect(img);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    qrCodeText = codes[0].rawValue.trim();
                  }
                } catch {
                  // ignore
                }
              }

              if (!qrCodeText) {
                const result = await zxing.decodeFromImageElement(img);
                qrCodeText = result.getText().trim();
              }

              if (!qrCodeText) {
                throw new Error('Nenhum QR Code foi encontrado na imagem selecionada. Escolha uma foto nítida do QR Code do cupom.');
              }

              playBeep();
              setScannedUrl(qrCodeText);
              await processSefazQrCode(qrCodeText);
            } catch (err: any) {
              setErrorMessage('Não foi possível identificar o QR Code nesta foto. Certifique-se de que o QR Code está visível e bem enquadrado.');
              setStep('capture');
              setIsProcessing(false);
            }
          };
          img.src = dataUrl;
        } catch (err: any) {
          setErrorMessage(err.message || 'Erro ao decodificar QR Code da imagem.');
          setStep('capture');
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage('Erro ao ler arquivo da imagem.');
      setStep('capture');
      setIsProcessing(false);
    }
    e.target.value = '';
  };

  // Process SEFAZ NFC-e QR Code via universal parser
  const processSefazQrCode = async (qrCodeUrlOrKey: string) => {
    setStep('processing');
    setIsProcessing(true);
    setErrorMessage('');
    setProcessingStatus('Consultando Portal da SEFAZ e extraindo produtos...');

    try {
      const result = await fetchSefazQrCodeData(qrCodeUrlOrKey);

      if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
        throw new Error('Nenhum item de compra foi encontrado nesta consulta da SEFAZ. Verifique se o QR Code é de uma NFC-e válida.');
      }

      const mappedItems: OcrExtractedItem[] = result.items.map((it: any, idx: number) => {
        const rawName = it.name || 'Produto sem nome';
        const rawBrand = normalizeBrand(it.brand);
        const rawBarcode = it.barcode || '';

        // Match against user's existing catalog & categories
        const match = findBestMatchingProduct(rawName, rawBrand, rawBarcode, products, categories);

        return {
          id: `sefaz_${Date.now()}_${idx}`,
          name: match.matchedProduct ? match.matchedProduct.name : rawName,
          quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
          unit: normalizeProductUnit(match.matchedProduct ? match.matchedProduct.unit : (it.unit || 'Unidade')),
          unitPrice: Number(it.unitPrice) >= 0 ? Number(it.unitPrice) : 0,
          totalPrice: Number(it.totalPrice) >= 0 ? Number(it.totalPrice) : (Number(it.quantity) * Number(it.unitPrice)),
          category: match.suggestedCategoryName || '',
          brand: rawBrand || normalizeBrand(match.matchedProduct?.brand) || '',
          barcode: rawBarcode || match.matchedProduct?.barcode || '',
          selected: true,
          matchedProductId: match.matchedProduct?.id,
          matchedProductName: match.matchedProduct?.name
        };
      });

      const detectedMarket = (result.market || 'Supermercado').trim();
      const detectedDate = result.date || new Date().toISOString().substring(0, 10);
      
      const cleanShortMarket = detectedMarket.replace(/^(SUPERMERCADOS?|HIPERMERCADOS?|ATACAD[AÃ]O|MERCADO)\s+/i, '').trim() || detectedMarket;
      const dateShort = detectedDate.split('-').reverse().slice(0, 2).join('/');
      const generatedTitle = `Compra ${cleanShortMarket} - ${dateShort}`.slice(0, 45).trim();

      const itemsSum = mappedItems.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
      const finalTotal = result.totalAmount && result.totalAmount >= itemsSum ? result.totalAmount : itemsSum;

      setExtractedMarket(detectedMarket);
      setExtractedDate(detectedDate);
      setExtractedTotal(finalTotal > 0 ? finalTotal : itemsSum);
      setExtractedDiscount(result.discountAmount);
      setExtractedItems(mappedItems);
      setPurchaseTitle(generatedTitle);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      const isNetworkErr = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError');
      setErrorMessage(
        isNetworkErr
          ? 'Não foi possível conectar ao portal da SEFAZ no momento. Verifique sua conexão à internet ou adicione os itens manualmente.'
          : (err.message || 'Falha ao processar o QR Code na SEFAZ.')
      );
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
      id: `sefaz_manual_${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'Unidade',
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

    // Validate that all selected items have valid non-empty fields & categories
    for (const item of selectedItems) {
      if (!item.name || item.name.trim().length < 2) {
        showErrorMessageTimed('Preencha a descrição de todos os itens da lista antes de salvar.');
        return;
      }
      if (!item.category || !item.category.trim()) {
        showErrorMessageTimed(`O produto "${item.name}" não possui categoria definida. Selecione ou crie uma categoria antes de salvar.`);
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        showErrorMessageTimed(`A quantidade do item "${item.name}" deve ser maior que zero.`);
        return;
      }
      if (item.unitPrice === undefined || item.unitPrice < 0) {
        showErrorMessageTimed(`O preço do item "${item.name}" não pode ser negativo.`);
        return;
      }
    }

    const cleanTitle = (purchaseTitle.trim() || `Compra ${extractedMarket}`).slice(0, 50);
    if (!activePurchaseId && (cleanTitle.length < 2 || cleanTitle.length > 50)) {
      showErrorMessageTimed('O nome da lista de compras deve possuir entre 2 e 50 caracteres.');
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
          name: cleanTitle,
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
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2">
                Leitor de Cupom Fiscal (QR Code SEFAZ)
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  NFC-e
                </span>
              </h2>
              <p className="text-xs text-neutral-500">
                {activePurchaseId
                  ? `Importar produtos diretamente para a compra "${activePurchaseName}"`
                  : 'Escaneie o QR Code do cupom ou envie uma foto para carregar os produtos direto da SEFAZ'}
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

        {/* STEP 1: CAPTURE QR CODE (Camera, Gallery or Manual Link) */}
        {step === 'capture' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Tabs Selector: Câmera QR Code, Galeria, Colar Link */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/80">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  startCamera();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
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
                  fileInputRef.current?.click();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'gallery'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <ImageIcon size={15} />
                <span>Foto da Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  stopCamera();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <LinkIcon size={15} />
                <span>Colar Link SEFAZ</span>
              </button>
            </div>

            {/* TAB 1: Live Camera QR Code Scanner */}
            {activeTab === 'camera' && (
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
                      className="absolute pointer-events-none w-14 h-14 -translate-x-1/2 -translate-y-1/2 border-2 border-emerald-400 rounded-full animate-ping z-20"
                      style={{ left: focusRing.x, top: focusRing.y }}
                    />
                  )}

                  {/* Top Floating Controls: Zoom & Torch */}
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
                          className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
                        className={`p-2.5 rounded-2xl transition-all shadow-md cursor-pointer ${
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

                  {/* QR Code Targeting Frame with Glowing Corners */}
                  <div className="absolute w-56 h-56 sm:w-64 sm:h-64 pointer-events-none flex items-center justify-center">
                    {/* Viewfinder Corners */}
                    <div className="absolute inset-0 border-2 border-dashed border-emerald-400/70 rounded-3xl" />
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                  </div>

                  {/* Bottom Guide Text Banner */}
                  <div className="absolute bottom-3 inset-x-3 pointer-events-none text-center">
                    <span className="inline-block bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white/90 shadow-md">
                      Aponte a câmera para o QR Code impresso no cupom fiscal
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
                  <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-900 leading-relaxed text-justify">
                    <strong>Leitura Automática por QR Code:</strong> Todos os cupons fiscais impressos (NFC-e) trazem um QR Code que direciona para a página oficial da SEFAZ. Ao enquadrar o código, o app busca automaticamente a lista completa de produtos e preços na base fiscal do seu estado.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Gallery Photo Picker */}
            {activeTab === 'gallery' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50 border-2 border-dashed border-emerald-300 text-center flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-emerald-100 text-emerald-700 rounded-3xl shadow-xs">
                  <ImageIcon size={36} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-neutral-900">Selecionar Foto do QR Code</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Se você tirou uma foto do QR Code da sua nota ou recebeu pelo WhatsApp, selecione a imagem da galeria.
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
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon size={16} />
                  <span>Escolher Imagem da Galeria</span>
                </button>
              </div>
            )}

            {/* TAB 3: Manual Link or Key */}
            {activeTab === 'manual' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualQrUrl.trim()) {
                    processSefazQrCode(manualQrUrl.trim());
                  }
                }}
                className="p-5 bg-neutral-50 rounded-3xl border border-neutral-200 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Link da SEFAZ ou Conteúdo do QR Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cole aqui o link do QR Code (ex: http://www.fazenda...)"
                    value={manualQrUrl}
                    onChange={(e) => setManualQrUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Você pode colar o link do QR Code copiado do leitor ou da chave de acesso da nota.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!manualQrUrl.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>Consultar na SEFAZ</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING ANIMATION */}
        {step === 'processing' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse">
                <QrCode size={38} />
              </div>
              <div className="absolute -top-2 -right-2 p-1.5 bg-emerald-600 text-white rounded-full animate-spin shadow-md">
                <RefreshCw size={14} />
              </div>
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="font-black text-base text-neutral-900">
                {processingStatus}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Acessando a base da SEFAZ, decodificando a lista oficial de produtos, quantidades e preços unitários da nota fiscal.
              </p>
            </div>

            {scannedUrl && (
              <div className="p-2.5 bg-neutral-100 rounded-xl max-w-sm w-full truncate text-[10px] text-neutral-600 font-mono border border-neutral-200">
                {scannedUrl}
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
                  Estabelecimento (SEFAZ)
                </label>
                <div className="relative">
                  <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    maxLength={40}
                    value={extractedMarket}
                    onChange={(e) => setExtractedMarket(sanitizeAndCapitalize(e.target.value, 40))}
                    placeholder="Ex: Pão de Açúcar, Assaí"
                    className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                  Data de Emissão
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="date"
                    value={extractedDate}
                    onChange={(e) => setExtractedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">
                  Total da Nota Fiscal
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-emerald-700">
                    {formatCurrency(extractedTotal && extractedTotal >= selectedTotal ? extractedTotal : (selectedTotal > 0 ? selectedTotal : (extractedTotal || 0)))}
                  </span>
                  {extractedDiscount !== undefined && extractedDiscount > 0 && (
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
                  Título para esta Nova Lista de Compras
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={purchaseTitle}
                  onChange={(e) => setPurchaseTitle(sanitizeAndCapitalize(e.target.value, 50))}
                  placeholder="Ex: Compra Supermercado - 01/10"
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Extracted Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-neutral-900 flex items-center gap-1.5">
                    <CheckCheck size={16} className="text-emerald-600" />
                    Itens da SEFAZ ({selectedItems.length} de {extractedItems.length} selecionados)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = extractedItems.every(i => i.selected);
                      setExtractedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                    }}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    {extractedItems.every(i => i.selected) ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
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

                    {/* Product Name & Brand & Category */}
                    <div className="flex-1 min-w-[180px]">
                      <input
                        type="text"
                        maxLength={40}
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', sanitizeAndCapitalize(e.target.value, 40))}
                        placeholder="Nome do produto *"
                        className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      {item.matchedProductName && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                          <Check size={11} className="shrink-0 text-emerald-600" />
                          <span>Produto existente: <strong>{item.matchedProductName}</strong></span>
                        </div>
                      )}

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
                          onChange={(e) => {
                            if (e.target.value === '__NEW_CATEGORY__') {
                              setQuickTargetItemId(item.id);
                              setShowQuickCatModal(true);
                            } else {
                              handleUpdateItem(item.id, 'category', e.target.value);
                            }
                          }}
                          className={`w-1/2 px-2 py-0.5 text-base sm:text-[11px] font-semibold rounded-md border overflow-y-auto max-h-48 cursor-pointer ${
                            !item.category
                              ? 'border-red-400 bg-red-50 text-red-700 font-bold ring-1 ring-red-400'
                              : 'bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          <option value="">-- Categoria * --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          <option value="__NEW_CATEGORY__">+ Nova Categoria...</option>
                        </select>
                      </div>
                    </div>

                    {/* Qty, Unit, Unit Price */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Qtd</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="1"
                          value={item.quantity === 0 ? '' : String(item.quantity).replace('.', ',')}
                          onChange={(e) => {
                            const valStr = e.target.value.replace(/[^0-9,\.]/g, '');
                            if (!valStr) {
                              handleUpdateItem(item.id, 'quantity', 0);
                              return;
                            }
                            const parsed = parseFloat(valStr.replace(',', '.'));
                            handleUpdateItem(item.id, 'quantity', isNaN(parsed) ? 0 : parsed);
                          }}
                          onBlur={() => {
                            if (!item.quantity || item.quantity <= 0) {
                              handleUpdateItem(item.id, 'quantity', 1);
                            }
                          }}
                          className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                        />
                      </div>

                      <div className="w-20">
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

                      <div className="w-24">
                        <label className="block text-[9px] uppercase font-bold text-neutral-400">Preço (R$)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={formatMoneyInput(item.unitPrice)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            if (!raw || raw === '0' || raw === '00') {
                              handleUpdateItem(item.id, 'unitPrice', 0);
                            } else {
                              const num = parseMoneyToNumber(formatMoneyInput(e.target.value));
                              handleUpdateItem(item.id, 'unitPrice', num);
                            }
                          }}
                          className="w-full px-2 py-1 text-base sm:text-xs font-bold bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
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
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors ml-1 cursor-pointer"
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

        {/* Modal de Confirmação de Exclusão de Item Individual */}
        {itemToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2.5 bg-red-50 rounded-2xl">
                  <Trash2 size={22} />
                </div>
                <h3 className="font-black text-base text-neutral-900">Remover Item?</h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Tem certeza de que deseja excluir <strong>"{itemToDelete.name || 'este item'}"</strong> da lista de importação do cupom fiscal?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveItem(itemToDelete.id);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Sim, Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criação Rápida de Categoria no OCR */}
        {showQuickCatModal && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                  <Tag size={16} className="text-emerald-600" />
                  <span>Nova Categoria</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCatModal(false);
                    setQuickCatName('');
                    setQuickTargetItemId(null);
                  }}
                  className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="Ex: Congelados, Pet Shop, Bebidas"
                    value={quickCatName}
                    onChange={(e) => setQuickCatName(sanitizeAndCapitalize(e.target.value, 30))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCatModal(false);
                    setQuickCatName('');
                    setQuickTargetItemId(null);
                  }}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const clean = sanitizeAndCapitalize(quickCatName, 30);
                    if (!clean) return;
                    try {
                      if (addCategory) {
                        await addCategory(clean, 'Package');
                      }
                      if (quickTargetItemId) {
                        handleUpdateItem(quickTargetItemId, 'category', clean);
                      }
                      setShowQuickCatModal(false);
                      setQuickCatName('');
                      setQuickTargetItemId(null);
                    } catch (err: any) {
                      showErrorMessageTimed(err.message || 'Erro ao criar categoria.');
                    }
                  }}
                  disabled={!quickCatName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Salvar e Aplicar
                </button>
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
                  onClick={() => {
                    setStep('capture');
                    startCamera();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                >
                  Escanear Outro
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing || selectedItems.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                className="px-5 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
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
