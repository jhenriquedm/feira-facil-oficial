import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Calendar, ArrowLeft, ShoppingCart, ShoppingBag, CheckCircle, 
  Trash2, Edit3, Check, X, Search, DollarSign, Filter, Sparkles, AlertCircle, RefreshCw, Barcode as BarcodeIcon,
  Copy, PlusCircle, MinusCircle, Layers, CheckCircle2,
  ArrowUpDown, CheckCheck, TrendingDown, TrendingUp, Receipt, MoreVertical, PackagePlus,
  CheckSquare, FileText
} from 'lucide-react';
import { Purchase, PurchaseType, PurchaseItem, Product, Category, PURCHASE_TYPE_LABELS } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptOcrModal, OcrExtractedItem } from './ReceiptOcrModal';
import { sanitizeAndCapitalize, formatMoneyInput, parseMoneyToNumber, formatCurrencyBRL } from '../utils/textFormatters';
import { PRODUCT_UNITS, normalizeProductUnit, getUnitCardDisplay } from '../utils/units';
import { normalizeBrand, formatBrandDisplay, isSameBrand } from '../utils/brand';

interface PurchasesProps {
  purchases: Purchase[];
  purchaseItems: Record<string, PurchaseItem[]>;
  products: Product[];
  categories: Category[];
  addPurchase: (name: string, market: string, date: string, type: PurchaseType, notes?: string, budget?: number, discount?: number, additionalFee?: number, isEmptyList?: boolean) => Promise<Purchase>;
  updatePurchase: (id: string, data: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  duplicatePurchase?: (sourcePurchaseId: string, customName?: string) => Promise<Purchase>;
  addPurchaseItem: (purchaseId: string, item: Omit<PurchaseItem, 'id' | 'purchaseId' | 'isChecked'>) => Promise<void>;
  updatePurchaseItem: (purchaseId: string, itemId: string, data: Partial<PurchaseItem>) => Promise<void>;
  deletePurchaseItem: (purchaseId: string, itemId: string) => Promise<void>;
  toggleItemChecked: (purchaseId: string, itemId: string, isChecked: boolean) => Promise<void>;
  toggleAllItemsChecked?: (purchaseId: string, isChecked: boolean) => Promise<void>;
  completePurchase: (purchaseId: string) => Promise<void>;
  reopenPurchase: (purchaseId: string) => Promise<void>;
  selectedPurchaseIdFromHome?: string | null;
  onClearSelectedPurchaseId?: () => void;
  activePurchaseId?: string | null;
  onSelectPurchase?: (id: string | null) => void;
  addProduct: (name: string, categoryId: string, unit: string, brand: string, lastPrice: number, barcode?: string) => Promise<Product>;
}

export function Purchases({
  purchases,
  purchaseItems,
  products,
  categories,
  addPurchase,
  updatePurchase,
  deletePurchase,
  duplicatePurchase,
  addPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
  toggleItemChecked,
  toggleAllItemsChecked,
  completePurchase,
  reopenPurchase,
  selectedPurchaseIdFromHome,
  onClearSelectedPurchaseId,
  activePurchaseId,
  onSelectPurchase,
  addProduct
}: PurchasesProps) {
  const [internalPurchaseId, setInternalPurchaseId] = useState<string | null>(
    activePurchaseId ?? selectedPurchaseIdFromHome ?? null
  );

  const selectedPurchaseId = activePurchaseId !== undefined ? activePurchaseId : internalPurchaseId;

  const setSelectedPurchaseId = (id: string | null) => {
    setInternalPurchaseId(id);
    if (onSelectPurchase) {
      onSelectPurchase(id);
    }
  };

  // If the active purchase was deleted or doesn't exist anymore in the list, safely reset
  useEffect(() => {
    if (selectedPurchaseId && purchases.length > 0) {
      const exists = purchases.some((p) => p.id === selectedPurchaseId);
      if (!exists) {
        setSelectedPurchaseId(null);
      }
    }
  }, [selectedPurchaseId, purchases]);

  // Active purchase kebab menu state
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setIsKebabOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Product Registration state inside Purchases
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Unidade');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdError, setNewProdError] = useState<string | null>(null);
  const [isSubmittingNewProd, setIsSubmittingNewProd] = useState(false);

  // Barcode scanning in purchases state
  const [isPurchaseBarcodeScannerOpen, setIsPurchaseBarcodeScannerOpen] = useState(false);
  const [purchaseBarcodeFeedback, setPurchaseBarcodeFeedback] = useState<string | null>(null);
  const barcodeFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showBarcodeFeedbackTimed = (msg: string | null) => {
    if (barcodeFeedbackTimerRef.current) clearTimeout(barcodeFeedbackTimerRef.current);
    setPurchaseBarcodeFeedback(msg);
    if (msg) barcodeFeedbackTimerRef.current = setTimeout(() => setPurchaseBarcodeFeedback(null), 3000);
  };

  // Receipt OCR scanning state
  const [isReceiptOcrOpen, setIsReceiptOcrOpen] = useState(false);
  const [ocrTargetMode, setOcrTargetMode] = useState<'newPurchase' | 'activePurchase'>('newPurchase');
  const [ocrFeedbackMessage, setOcrFeedbackMessage] = useState<string | null>(null);
  const ocrFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showOcrFeedbackTimed = (msg: string | null) => {
    if (ocrFeedbackTimerRef.current) clearTimeout(ocrFeedbackTimerRef.current);
    setOcrFeedbackMessage(msg);
    if (msg) ocrFeedbackTimerRef.current = setTimeout(() => setOcrFeedbackMessage(null), 3000);
  };

  const handleOcrConfirmNewPurchase = async (data: {
    market: string;
    date: string;
    name: string;
    discount?: number;
    items: OcrExtractedItem[];
  }) => {
    // 1. Create the new purchase
    const newPurchase = await addPurchase(
      data.name,
      data.market,
      data.date,
      'monthly',
      'Importado via Leitor OCR de Cupom Fiscal',
      undefined,
      data.discount || 0,
      0
    );

    // 2. Add each recognized item to the purchase and catalog
    for (const item of data.items) {
      const normBrand = normalizeBrand(item.brand);
      let matchedProduct = products.find(
        p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase() && isSameBrand(p.brand, normBrand)
      );

      let categoryId = categories[0]?.id || 'cat_default';
      const foundCategory = categories.find(
        c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase()
      );
      if (foundCategory) {
        categoryId = foundCategory.id;
      }

      if (!matchedProduct) {
        try {
          matchedProduct = await addProduct(
            item.name.trim(),
            categoryId,
            item.unit,
            normBrand,
            item.unitPrice,
            item.barcode
          );
        } catch (e) {
          matchedProduct = products.find(
            p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase() && isSameBrand(p.brand, normBrand)
          ) || products.find(
            p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
          );
        }
      }

      await addPurchaseItem(newPurchase.id, {
        productId: matchedProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productName: item.name.trim(),
        productBrand: normBrand || normalizeBrand(matchedProduct?.brand) || '',
        categoryId: categoryId,
        categoryName: foundCategory?.name || item.category || 'Mercearia',
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        barcode: item.barcode
      });
    }

    setSelectedPurchaseId(newPurchase.id);
    setOcrFeedbackMessage(`Cupom fiscal lido com sucesso! ${data.items.length} itens importados para "${newPurchase.name}".`);
    setTimeout(() => setOcrFeedbackMessage(null), 6000);
  };

  const handleOcrConfirmAddToActivePurchase = async (items: OcrExtractedItem[]) => {
    if (!selectedPurchaseId) return;

    for (const item of items) {
      const normBrand = normalizeBrand(item.brand);
      let matchedProduct = products.find(
        p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase() && isSameBrand(p.brand, normBrand)
      );

      let categoryId = categories[0]?.id || 'cat_default';
      const foundCategory = categories.find(
        c => c.name.trim().toLowerCase() === item.category.trim().toLowerCase()
      );
      if (foundCategory) {
        categoryId = foundCategory.id;
      }

      if (!matchedProduct) {
        try {
          matchedProduct = await addProduct(
            item.name.trim(),
            categoryId,
            item.unit,
            normBrand,
            item.unitPrice,
            item.barcode
          );
        } catch (e) {
          matchedProduct = products.find(
            p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase() && isSameBrand(p.brand, normBrand)
          ) || products.find(
            p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
          );
        }
      }

      await addPurchaseItem(selectedPurchaseId, {
        productId: matchedProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productName: item.name.trim(),
        productBrand: normBrand || normalizeBrand(matchedProduct?.brand) || '',
        categoryId: categoryId,
        categoryName: foundCategory?.name || item.category || 'Mercearia',
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        barcode: item.barcode
      });
    }

    setOcrFeedbackMessage(`${items.length} itens do cupom fiscal foram adicionados com sucesso à sua lista!`);
    setTimeout(() => setOcrFeedbackMessage(null), 6000);
  };

  // Home navigation redirection
  useEffect(() => {
    if (selectedPurchaseIdFromHome) {
      setSelectedPurchaseId(selectedPurchaseIdFromHome);
      if (onClearSelectedPurchaseId) {
        onClearSelectedPurchaseId();
      }
    }
  }, [selectedPurchaseIdFromHome]);

  // Sorted categories and products for dropdowns and listings
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [products]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'inProgress' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Form states & validation (RN-COM-001 - RN-COM-010)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purName, setPurName] = useState('');
  const [purMarket, setPurMarket] = useState('');
  const [purDate, setPurDate] = useState(new Date().toISOString().substring(0, 10));
  const [purType, setPurType] = useState<PurchaseType>('monthly');
  const [purInitialMode, setPurInitialMode] = useState<'prefilled' | 'empty'>('prefilled');
  const [purBudget, setPurBudget] = useState('');
  const [purDiscount, setPurDiscount] = useState('');
  const [purAdditionalFee, setPurAdditionalFee] = useState('');
  const [purNotes, setPurNotes] = useState('');
  const [purError, setPurError] = useState<string | null>(null);
  const [purSubmitting, setPurSubmitting] = useState(false);

  // Edit Purchase Metadata modal states (RN-COM-007, RN-COM-009, RN-COM-010)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editPurName, setEditPurName] = useState('');
  const [editPurMarket, setEditPurMarket] = useState('');
  const [editPurDate, setEditPurDate] = useState('');
  const [editPurType, setEditPurType] = useState<PurchaseType>('monthly');
  const [editPurBudget, setEditPurBudget] = useState('');
  const [editPurDiscount, setEditPurDiscount] = useState('');
  const [editPurAdditionalFee, setEditPurAdditionalFee] = useState('');
  const [editPurNotes, setEditPurNotes] = useState('');
  const [editPurError, setEditPurError] = useState<string | null>(null);
  const [editPurSubmitting, setEditPurSubmitting] = useState(false);

  // Duplicate Purchase Modal states
  const [purchaseToDuplicate, setPurchaseToDuplicate] = useState<Purchase | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Item sorting & status filter inside active purchase (RN-ITE-007)
  const [itemSort, setItemSort] = useState<'category' | 'name' | 'price-asc' | 'price-desc' | 'subtotal-desc' | 'pending-first'>('category');
  const [itemStatusFilter, setItemStatusFilter] = useState<'all' | 'pending' | 'cart'>('all');

  // Add Item inside Details states & validation (RN-ITE-001 - RN-ITE-005)
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('0');
  const [itemBrand, setItemBrand] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);

  // Filter & Grouping inside active purchase
  const [itemQuery, setItemQuery] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);

  // Complete purchase confirmation and validation modal state
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showZeroPriceValidationModal, setShowZeroPriceValidationModal] = useState(false);
  const [zeroPriceModalItems, setZeroPriceModalItems] = useState<PurchaseItem[]>([]);
  const [emptyCartValidationMessage, setEmptyCartValidationMessage] = useState<string | null>(null);
  const [completePurchaseError, setCompletePurchaseError] = useState<string | null>(null);
  const [isFinishingPurchase, setIsFinishingPurchase] = useState(false);

  const handleInitiateFinishPurchase = () => {
    if (!activePurchase) return;
    const itemsInCart = activeItems.filter(item => item.isChecked);

    if (itemsInCart.length === 0) {
      setZeroPriceModalItems([]);
      setEmptyCartValidationMessage('Nenhum item foi adicionado ao carrinho. Marque ao menos um item no carrinho para finalizar a compra.');
      setShowZeroPriceValidationModal(true);
      return;
    }

    const zeroPriced = itemsInCart.filter(item => !item.unitPrice || item.unitPrice <= 0);
    if (zeroPriced.length > 0) {
      setZeroPriceModalItems(zeroPriced);
      setEmptyCartValidationMessage(null);
      setShowZeroPriceValidationModal(true);
      return;
    }

    // All cart items have valid prices (> 0)
    setCompletePurchaseError(null);
    setShowCompleteConfirm(true);
  };

  // Safe UI deletion modals & feedback (replaces blocking window.confirm/alert)
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PurchaseItem | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);

  // Editing single item inline state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemQty, setEditItemQty] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const purErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editPurErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const itemErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inlineEditErrorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showPurErrorTimed = (msg: string | null) => {
    if (purErrorTimerRef.current) clearTimeout(purErrorTimerRef.current);
    setPurError(msg);
    if (msg) purErrorTimerRef.current = setTimeout(() => setPurError(null), 3000);
  };

  const showEditPurErrorTimed = (msg: string | null) => {
    if (editPurErrorTimerRef.current) clearTimeout(editPurErrorTimerRef.current);
    setEditPurError(msg);
    if (msg) editPurErrorTimerRef.current = setTimeout(() => setEditPurError(null), 3000);
  };

  const showItemErrorTimed = (msg: string | null) => {
    if (itemErrorTimerRef.current) clearTimeout(itemErrorTimerRef.current);
    setItemError(msg);
    if (msg) itemErrorTimerRef.current = setTimeout(() => setItemError(null), 3000);
  };

  const showInlineEditErrorTimed = (msg: string | null) => {
    if (inlineEditErrorTimerRef.current) clearTimeout(inlineEditErrorTimerRef.current);
    setInlineEditError(msg);
    if (msg) inlineEditErrorTimerRef.current = setTimeout(() => setInlineEditError(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (purErrorTimerRef.current) clearTimeout(purErrorTimerRef.current);
      if (editPurErrorTimerRef.current) clearTimeout(editPurErrorTimerRef.current);
      if (itemErrorTimerRef.current) clearTimeout(itemErrorTimerRef.current);
      if (inlineEditErrorTimerRef.current) clearTimeout(inlineEditErrorTimerRef.current);
    };
  }, []);

  const handleCreatePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurError(null);
    setPurSubmitting(true);
    try {
      const cleanedName = sanitizeAndCapitalize(purName, 50);
      const cleanedMarket = sanitizeAndCapitalize(purMarket, 50);

      if (!cleanedName || !cleanedMarket) {
        showPurErrorTimed('Informe o nome da lista e o nome do estabelecimento.');
        setPurSubmitting(false);
        return;
      }

      const dateIso = new Date(purDate).toISOString();
      const budgetNum = purBudget.trim() ? parseMoneyToNumber(purBudget) : undefined;
      const discountNum = purDiscount.trim() ? parseMoneyToNumber(purDiscount) : undefined;
      const feeNum = purAdditionalFee.trim() ? parseMoneyToNumber(purAdditionalFee) : undefined;

      const created = await addPurchase(
        cleanedName, 
        cleanedMarket, 
        dateIso, 
        purType, 
        purNotes,
        budgetNum,
        discountNum,
        feeNum,
        purInitialMode === 'empty'
      );
      
      // Clear
      setShowPurchaseForm(false);
      setPurName('');
      setPurMarket('');
      setPurDate(new Date().toISOString().substring(0, 10));
      setPurType('monthly');
      setPurInitialMode('prefilled');
      setPurNotes('');
      setPurBudget('');
      setPurDiscount('');
      setPurAdditionalFee('');

      // Auto open newly created list
      setSelectedPurchaseId(created.id);
    } catch (err: any) {
      showPurErrorTimed(err.message || 'Erro ao registrar lista de compras.');
    } finally {
      setPurSubmitting(false);
    }
  };

  const openEditPurchase = (pur: Purchase) => {
    setEditingPurchase(pur);
    setEditPurName(pur.name);
    setEditPurMarket(pur.market);
    setEditPurDate(pur.date.substring(0, 10));
    setEditPurType(pur.type);
    setEditPurBudget(pur.budget !== undefined && pur.budget > 0 ? formatMoneyInput(pur.budget) : '');
    setEditPurDiscount(pur.discount !== undefined && pur.discount > 0 ? formatMoneyInput(pur.discount) : '');
    setEditPurAdditionalFee(pur.additionalFee !== undefined && pur.additionalFee > 0 ? formatMoneyInput(pur.additionalFee) : '');
    setEditPurNotes(pur.notes || '');
    setEditPurError(null);
  };

  const handleEditPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    setEditPurError(null);
    setEditPurSubmitting(true);
    try {
      const cleanedName = sanitizeAndCapitalize(editPurName, 50);
      const cleanedMarket = sanitizeAndCapitalize(editPurMarket, 50);

      const budgetNum = editPurBudget.trim() ? parseMoneyToNumber(editPurBudget) : 0;
      const discountNum = editPurDiscount.trim() ? parseMoneyToNumber(editPurDiscount) : 0;
      const feeNum = editPurAdditionalFee.trim() ? parseMoneyToNumber(editPurAdditionalFee) : 0;

      await updatePurchase(editingPurchase.id, {
        name: cleanedName,
        market: cleanedMarket,
        date: new Date(editPurDate).toISOString(),
        type: editPurType,
        budget: budgetNum > 0 ? budgetNum : undefined,
        discount: discountNum > 0 ? discountNum : undefined,
        additionalFee: feeNum > 0 ? feeNum : undefined,
        notes: editPurNotes
      });

      setEditingPurchase(null);
    } catch (err: any) {
      showEditPurErrorTimed(err.message || 'Erro ao atualizar dados da lista de compras.');
    } finally {
      setEditPurSubmitting(false);
    }
  };

  const openDuplicateModal = (pur: Purchase) => {
    setPurchaseToDuplicate(pur);
    setDuplicateName(`${pur.name} (Cópia)`);
    setDuplicateError(null);
  };

  const handleConfirmDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseToDuplicate || !duplicatePurchase) return;
    const cleaned = sanitizeAndCapitalize(duplicateName, 50).trim();
    if (!cleaned || cleaned.length < 2) {
      setDuplicateError('Informe um nome válido para a nova lista de compras (mínimo 2 caracteres).');
      return;
    }
    if (cleaned.toLowerCase() === purchaseToDuplicate.name.trim().toLowerCase()) {
      setDuplicateError('O nome da nova lista deve ser diferente do nome da lista original.');
      return;
    }
    const alreadyExists = purchases.some(p => p.name.trim().toLowerCase() === cleaned.toLowerCase());
    if (alreadyExists) {
      setDuplicateError(`Já existe uma lista cadastrada com o nome "${cleaned}". Escolha um nome exclusivo.`);
      return;
    }

    setIsDuplicating(true);
    try {
      const newPur = await duplicatePurchase(purchaseToDuplicate.id, cleaned);
      setPurchaseToDuplicate(null);
      setDuplicateName('');
      if (newPur && newPur.id) {
        setSelectedPurchaseId(newPur.id);
        setPurchaseBarcodeFeedback(`Lista "${newPur.name}" duplicada com sucesso com todos os itens!`);
      }
    } catch (err: any) {
      setDuplicateError(err.message || 'Erro ao duplicar lista.');
    } finally {
      setIsDuplicating(false);
    }
  };

  // Quick product registration handler
  const handleCreateQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewProdError(null);

    const cleanedName = sanitizeAndCapitalize(newProdName, 50);
    if (!cleanedName || cleanedName.length < 2) {
      setNewProdError('Informe um nome válido para o produto (mínimo 2 caracteres).');
      return;
    }

    if (!newProdCatId) {
      setNewProdError('Selecione uma categoria para o produto.');
      return;
    }

    const cleanedBrand = normalizeBrand(sanitizeAndCapitalize(newProdBrand, 30));

    const priceNum = newProdPrice.trim() ? parseMoneyToNumber(newProdPrice) : 0;

    setIsSubmittingNewProd(true);
    try {
      const createdProd = await addProduct(
        cleanedName,
        newProdCatId,
        normalizeProductUnit(newProdUnit),
        cleanedBrand,
        priceNum,
        newProdBarcode.trim() || undefined
      );

      // If active purchase is currently open, automatically add the new product to this purchase list!
      if (activePurchase) {
        const cat = categories.find(c => c.id === newProdCatId);
        await addPurchaseItem(activePurchase.id, {
          productId: createdProd.id,
          productName: createdProd.name,
          productBrand: normalizeBrand(createdProd.brand),
          categoryId: createdProd.categoryId,
          categoryName: cat ? cat.name : 'Geral',
          unit: createdProd.unit,
          quantity: 1,
          unitPrice: createdProd.lastPrice || 0,
          barcode: createdProd.barcode || ''
        });
        showBarcodeFeedbackTimed(`Produto "${createdProd.name}" cadastrado e adicionado à lista!`);
      }

      setShowQuickProductModal(false);
      setNewProdName('');
      setNewProdCatId('');
      setNewProdUnit('Unidade');
      setNewProdBrand('');
      setNewProdPrice('');
      setNewProdBarcode('');
    } catch (err: any) {
      setNewProdError(err.message || 'Erro ao cadastrar produto.');
    } finally {
      setIsSubmittingNewProd(false);
    }
  };

  // Filtered products for autocomplete
  const filteredProductsForAutocomplete = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return sortedProducts;
    }
    const term = productSearchTerm.toLowerCase();
    return sortedProducts.filter(
      p => p.name.toLowerCase().includes(term) || (formatBrandDisplay(p.brand).toLowerCase().includes(term))
    );
  }, [sortedProducts, productSearchTerm]);

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);

    if (!selectedPurchaseId || !selectedProductId) {
      showItemErrorTimed("Selecione um produto cadastrado.");
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) {
      showItemErrorTimed("Produto não encontrado no catálogo.");
      return;
    }

    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) {
      showItemErrorTimed("A quantidade do item deve ser maior que zero.");
      return;
    }

    const price = parseMoneyToNumber(itemPrice);
    if (isNaN(price) || price < 0) {
      showItemErrorTimed("O preço unitário não pode ser negativo.");
      return;
    }

    const cat = categories.find(c => c.id === prod.categoryId);
    const catName = cat ? cat.name : 'Outros';

    try {
      await addPurchaseItem(selectedPurchaseId, {
        productId: prod.id,
        productName: prod.name,
        productBrand: normalizeBrand(sanitizeAndCapitalize(itemBrand, 30)) || normalizeBrand(prod.brand) || '',
        categoryId: prod.categoryId,
        categoryName: catName,
        unit: prod.unit,
        quantity: qty,
        unitPrice: price,
        barcode: prod.barcode
      });

      // Reset Form
      setShowAddItemForm(false);
      setSelectedProductId('');
      setProductSearchTerm('');
      setItemQty('1');
      setItemPrice('0,00');
      setItemBrand('');
    } catch (err: any) {
      showItemErrorTimed(err.message || "Erro ao adicionar item.");
    }
  };

  const handleQuickQtyChange = async (item: PurchaseItem, delta: number) => {
    if (!selectedPurchaseId) return;
    const newQty = Math.max(0, Number((item.quantity + delta).toFixed(2)));
    if (newQty <= 0) {
      setItemToDelete(item);
      return;
    }
    await updatePurchaseItem(selectedPurchaseId, item.id, { quantity: newQty });
  };

  const handleSaveInlineEdit = async (item: PurchaseItem) => {
    if (!selectedPurchaseId) return;
    const q = parseFloat(editItemQty);
    const p = parseMoneyToNumber(editItemPrice);
    if (isNaN(q) || q <= 0) {
      setInlineEditError("A quantidade deve ser maior que zero.");
      return;
    }
    if (isNaN(p) || p < 0) {
      setInlineEditError("O preço unitário não pode ser negativo.");
      return;
    }
    setInlineEditError(null);
    await updatePurchaseItem(selectedPurchaseId, item.id, {
      quantity: q,
      unitPrice: p
    });
    setEditingItemId(null);
  };

  // Compute stats for current active purchase
  const activePurchase = purchases.find(p => p.id === selectedPurchaseId);
  const activeItems = selectedPurchaseId ? (purchaseItems[selectedPurchaseId] || []) : [];

  // Handle Barcode Scanned in Purchase session
  const handlePurchaseBarcodeDetected = async (data: {
    barcode: string;
    suggestedName?: string;
    suggestedBrand?: string;
    suggestedCategory?: string;
    suggestedUnit?: string;
    existingProduct?: Product;
    isExistingInCatalog?: boolean;
    source?: string;
  }) => {
    if (!activePurchase) return;

    // 1. Check if item with this barcode is already in the active purchase
    const itemInPurchase = activeItems.find(
      it => it.barcode === data.barcode || 
            products.find(p => p.id === it.productId)?.barcode === data.barcode
    );

    if (itemInPurchase) {
      if (!itemInPurchase.isChecked) {
        await toggleItemChecked(activePurchase.id, itemInPurchase.id, true);
        setPurchaseBarcodeFeedback(`"${itemInPurchase.productName}" marcado no carrinho!`);
      } else {
        await updatePurchaseItem(activePurchase.id, itemInPurchase.id, {
          quantity: itemInPurchase.quantity + 1
        });
        setPurchaseBarcodeFeedback(`Quantidade de "${itemInPurchase.productName}" aumentada para ${itemInPurchase.quantity + 1}!`);
      }
      return;
    }

    // 2. Check if product exists in catalog (or was found in user catalog)
    const existingProduct = data.existingProduct || products.find(p => p.barcode === data.barcode);
    if (existingProduct) {
      const cat = categories.find(c => c.id === existingProduct.categoryId);
      await addPurchaseItem(activePurchase.id, {
        productId: existingProduct.id,
        productName: existingProduct.name,
        productBrand: normalizeBrand(existingProduct.brand),
        categoryId: existingProduct.categoryId,
        categoryName: cat ? cat.name : 'Outros',
        unit: existingProduct.unit,
        quantity: 1,
        unitPrice: existingProduct.lastPrice || 0,
        barcode: existingProduct.barcode
      });
      setPurchaseBarcodeFeedback(`"${existingProduct.name}" adicionado à lista com preço anterior R$ ${(existingProduct.lastPrice || 0).toFixed(2)}!`);
      return;
    }

    // 3. New product not in catalog yet: register it and add to purchase!
    let targetCatId = categories[0]?.id || '';
    if (data.suggestedCategory) {
      const matched = categories.find(c => c.name.toLowerCase() === data.suggestedCategory!.toLowerCase());
      if (matched) targetCatId = matched.id;
    }

    const prodName = data.suggestedName || `Produto ${data.barcode}`;
    const prodBrand = normalizeBrand(data.suggestedBrand);
    const prodUnit = normalizeProductUnit(data.suggestedUnit || 'Un');

    try {
      const createdProd = await addProduct(
        prodName,
        targetCatId,
        prodUnit,
        prodBrand,
        0,
        data.barcode
      );
      const cat = categories.find(c => c.id === createdProd.categoryId);

      await addPurchaseItem(activePurchase.id, {
        productId: createdProd.id,
        productName: createdProd.name,
        productBrand: normalizeBrand(createdProd.brand),
        categoryId: createdProd.categoryId,
        categoryName: cat ? cat.name : 'Outros',
        unit: createdProd.unit,
        quantity: 1,
        unitPrice: 0,
        barcode: createdProd.barcode
      });

      setPurchaseBarcodeFeedback(`Novo produto "${prodName}" cadastrado e adicionado à lista de compras!`);
    } catch (err: any) {
      setPurchaseBarcodeFeedback(err.message || 'Erro ao registrar produto via código de barras.');
    }
  };
  
  const filteredActiveItems = activeItems.filter(item => {
    const matchesQuery = item.productName.toLowerCase().includes(itemQuery.toLowerCase()) || 
      (item.productBrand && item.productBrand.toLowerCase().includes(itemQuery.toLowerCase()));
    if (!matchesQuery) return false;

    if (itemStatusFilter === 'pending') return !item.isChecked;
    if (itemStatusFilter === 'cart') return item.isChecked;
    return true;
  });

  // Sorting active items (RN-ITE-007)
  const sortedActiveItems = [...filteredActiveItems].sort((a, b) => {
    if (itemSort === 'pending-first') {
      if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
      return a.productName.localeCompare(b.productName);
    }
    if (itemSort === 'name') {
      return a.productName.localeCompare(b.productName);
    }
    if (itemSort === 'price-asc') {
      return a.unitPrice - b.unitPrice;
    }
    if (itemSort === 'price-desc') {
      return b.unitPrice - a.unitPrice;
    }
    if (itemSort === 'subtotal-desc') {
      return (b.quantity * b.unitPrice) - (a.quantity * a.unitPrice);
    }
    // Default: category
    return (a.categoryName || '').localeCompare(b.categoryName || '') || a.productName.localeCompare(b.productName);
  });

  const itemsInCart = activeItems.filter(item => item.isChecked);
  const itemsInCartTotal = itemsInCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const itemsSubtotal = activeItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const activeDiscount = activePurchase?.discount || 0;
  const activeAdditionalFee = activePurchase?.additionalFee || 0;
  const grandTotal = Math.max(0, itemsSubtotal - activeDiscount + activeAdditionalFee);

  // Budget calculations (RN-COM-009)
  const budgetLimit = activePurchase?.budget || 0;
  const budgetRemaining = budgetLimit > 0 ? budgetLimit - grandTotal : 0;

  // Total savings vs product catalog last prices (RN-ITE-006)
  const totalSavings = activeItems.reduce((acc, item) => {
    const prod = products.find(p => p.id === item.productId);
    if (prod && prod.lastPrice && prod.lastPrice > 0 && prod.lastPrice > item.unitPrice && item.unitPrice > 0) {
      return acc + ((prod.lastPrice - item.unitPrice) * item.quantity);
    }
    return acc;
  }, 0);

  // Price variance helper per item (RN-ITE-006)
  const getItemPriceComparison = (item: PurchaseItem) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod || !prod.lastPrice || prod.lastPrice <= 0) {
      return { type: 'new' as const, label: '1º Registro' };
    }
    const diff = item.unitPrice - prod.lastPrice;
    if (Math.abs(diff) < 0.005) {
      return { type: 'stable' as const, label: 'Preço igual' };
    }
    if (diff < 0) {
      return { 
        type: 'cheaper' as const, 
        label: `Economia de ${formatCurrency(Math.abs(diff))}/un`,
        diff: Math.abs(diff)
      };
    }
    return { 
      type: 'expensive' as const, 
      label: `+${formatCurrency(diff)} vs anterior`,
      diff
    };
  };

  // Main list filters
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.market.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {!selectedPurchaseId ? (
        // LIST VIEW OF ALL PURCHASES
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div>
              <h1 className="text-xl font-extrabold text-neutral-950 flex items-center gap-2">
                <ShoppingCart className="text-sky-500" />
                Listas de Compras ({purchases.length})
              </h1>
              <p className="text-xs text-neutral-400 mt-1">Gerencie listas de compras, estabelecimentos, preços e checklists.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setOcrTargetMode('newPurchase');
                  setIsReceiptOcrOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all"
              >
                <Receipt size={17} />
                <span>Escanear Cupom Fiscal (OCR)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPurchaseForm(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all"
              >
                <Plus size={18} />
                <span>Criar Nova Lista</span>
              </button>
            </div>
          </div>

          {/* Form Create Purchase overlay */}
          {showPurchaseForm && (
            <form onSubmit={handleCreatePurchaseSubmit} className="bg-white p-6 rounded-2xl border border-sky-100 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                  <Plus size={18} className="text-sky-500" />
                  Nova Sessão de Compras
                </h3>
                <button type="button" onClick={() => setShowPurchaseForm(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
                  <X size={16} />
                </button>
              </div>

              {purError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{purError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Título da compra *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ex: Compra Mensal - Setembro"
                    value={purName}
                    onChange={(e) => setPurName(sanitizeAndCapitalize(e.target.value, 50))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Market */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do estabelecimento *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ex: Carrefour, Pão de Açúcar, Feira da Cidade"
                    value={purMarket}
                    onChange={(e) => setPurMarket(sanitizeAndCapitalize(e.target.value, 50))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={purDate}
                    onChange={(e) => setPurDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Tipo da Compra *</label>
                  <select
                    value={purType}
                    onChange={(e) => setPurType(e.target.value as PurchaseType)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="butcher">Açougue</option>
                    <option value="emergency">Emergencial</option>
                    <option value="pharmacy">Farmácia</option>
                    <option value="monthly">Mensal</option>
                    <option value="other">Outros</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>

                {/* Initial List Mode Option */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5">
                    Itens Iniciais da Lista *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPurInitialMode('prefilled')}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        purInitialMode === 'prefilled'
                          ? 'border-sky-500 bg-sky-50/70 text-sky-950 ring-2 ring-sky-500/20 shadow-xs'
                          : 'border-neutral-200 bg-neutral-50/60 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <CheckSquare size={18} className={`shrink-0 mt-0.5 ${purInitialMode === 'prefilled' ? 'text-sky-600' : 'text-neutral-400'}`} />
                      <div>
                        <div className="font-extrabold text-xs">Pré-preenchida com Catálogo</div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                          Importa automaticamente os produtos cadastrados do catálogo como itens pendentes.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurInitialMode('empty')}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        purInitialMode === 'empty'
                          ? 'border-sky-500 bg-sky-50/70 text-sky-950 ring-2 ring-sky-500/20 shadow-xs'
                          : 'border-neutral-200 bg-neutral-50/60 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <FileText size={18} className={`shrink-0 mt-0.5 ${purInitialMode === 'empty' ? 'text-sky-600' : 'text-neutral-400'}`} />
                      <div>
                        <div className="font-extrabold text-xs">Lista Vazia</div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">
                          Inicia uma lista em branco. Ideal para leitor de cupom fiscal ou adição manual item por item.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Budget Limit (RN-COM-009) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    Orçamento Limite (R$) <span className="text-[10px] text-neutral-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-semibold">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      maxLength={14}
                      value={purBudget}
                      onChange={(e) => setPurBudget(formatMoneyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Coupon / Discount (RN-COM-010) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    Desconto / Cupom (R$) <span className="text-[10px] text-neutral-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-semibold">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      maxLength={14}
                      value={purDiscount}
                      onChange={(e) => setPurDiscount(formatMoneyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Additional Fee (RN-COM-010) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">
                    Taxas / Sacolas (R$) <span className="text-[10px] text-neutral-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-semibold">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      maxLength={14}
                      value={purAdditionalFee}
                      onChange={(e) => setPurAdditionalFee(formatMoneyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Observações / Notas (máx. 200 caracteres)</label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Ex: Levar sacolas retornáveis e verificar promoções"
                    value={purNotes}
                    onChange={(e) => setPurNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseForm(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={purSubmitting}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {purSubmitting ? 'Salvando...' : 'Criar Lista'}
                </button>
              </div>
            </form>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou nome do estabelecimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Todas as listas</option>
                <option value="inProgress">Em andamento</option>
                <option value="completed">Finalizadas</option>
              </select>

              {/* Filter Type */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="butcher">Açougue</option>
                <option value="emergency">Emergencial</option>
                <option value="pharmacy">Farmácia</option>
                <option value="monthly">Mensal</option>
                <option value="other">Outros</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>

          {/* Purchases Grid List */}
          {filteredPurchases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPurchases.map((pur) => {
                const pDate = new Date(pur.date);
                const itemsCount = (purchaseItems[pur.id] || []).length;
                return (
                  <div key={pur.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          pur.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {pur.status === 'completed' ? 'Finalizada' : 'Em andamento'}
                        </span>
                        
                        <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1">
                          <Calendar size={11} />
                          {pDate.toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-neutral-950 text-base line-clamp-1">{pur.name}</h4>
                      
                      <p className="text-xs text-neutral-500">Estabelecimento: <strong className="text-neutral-700">{pur.market}</strong></p>
                      
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <div className="text-xs text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded font-semibold text-center">
                          Tipo: {PURCHASE_TYPE_LABELS[pur.type]}
                        </div>
                        {pur.discount && pur.discount > 0 && (
                          <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                            Cupom -{formatCurrency(pur.discount)}
                          </div>
                        )}
                        {pur.additionalFee && pur.additionalFee > 0 && (
                          <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                            Taxas +{formatCurrency(pur.additionalFee)}
                          </div>
                        )}
                      </div>

                      {pur.notes && (
                        <p className="text-xs text-neutral-400 line-clamp-2 italic">“{pur.notes}”</p>
                      )}

                      {/* Budget Progress Bar on Card (RN-COM-009) */}
                      {pur.budget && pur.budget > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span className="text-neutral-500">
                              Orçamento: {formatCurrency(pur.budget)}
                            </span>
                            <span className={
                              pur.total > pur.budget 
                                ? 'text-red-600 font-black' 
                                : pur.total / pur.budget > 0.8 
                                  ? 'text-amber-600 font-bold' 
                                  : 'text-emerald-600 font-bold'
                            }>
                              {((pur.total / pur.budget) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                pur.total > pur.budget 
                                  ? 'bg-red-500' 
                                  : pur.total / pur.budget > 0.8 
                                    ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (pur.total / pur.budget) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">Total</span>
                        <span className="text-lg font-black text-neutral-900">
                          {formatCurrency(pur.total)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">{itemsCount} itens listados</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPurchase(pur);
                          }}
                          className="p-2 text-neutral-500 hover:text-sky-600 hover:bg-neutral-100 rounded-xl transition-all"
                          title="Editar dados da lista / orçamento"
                        >
                          <Edit3 size={16} />
                        </button>
                        {duplicatePurchase && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDuplicateModal(pur);
                            }}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                            title="Duplicar / Clonar Lista para nova compra"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pur.status === 'completed') {
                              showPurErrorTimed('Listas com status "Finalizada" não podem ser excluídas.');
                              return;
                            }
                            setPurchaseToDelete(pur);
                          }}
                          disabled={pur.status === 'completed'}
                          className={`p-2 rounded-xl transition-all ${
                            pur.status === 'completed'
                              ? 'text-neutral-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={pur.status === 'completed' ? 'Listas finalizadas não podem ser excluídas' : 'Excluir Lista'}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => setSelectedPurchaseId(pur.id)}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          Abrir Lista
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <ShoppingBag size={48} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-bold text-neutral-500">Nenhuma lista de compras cadastrada ou encontrada.</p>
              <p className="text-xs text-neutral-400 mt-1">Clique no botão "Criar Nova Lista" para planejar suas compras.</p>
            </div>
          )}
        </div>
      ) : (
        // DETAILED CHECKLIST SHOPPING LIST VIEW
        <div className="space-y-6">
          {/* Header & Navigation */}
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-5">
            <button
              onClick={() => setSelectedPurchaseId(null)}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 text-xs font-bold transition-all"
            >
              <ArrowLeft size={16} />
              Voltar para todas as listas
            </button>
          </div>

          {activePurchase && (
            <div className="relative bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 pt-10 sm:pt-6">
              {/* Kebab Menu (3 dots) positioned at the absolute top-right of the card */}
              <div className="absolute top-4 right-4 z-20" ref={kebabRef}>
                <button
                  type="button"
                  onClick={() => setIsKebabOpen(!isKebabOpen)}
                  className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl transition-all shadow-xs"
                  title="Opções da lista"
                >
                  <MoreVertical size={18} />
                </button>

                {isKebabOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setIsKebabOpen(false);
                        openEditPurchase(activePurchase);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Edit3 size={15} className="text-sky-500" />
                      <span>Editar lista</span>
                    </button>
                    {duplicatePurchase && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsKebabOpen(false);
                          openDuplicateModal(activePurchase);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Copy size={15} className="text-emerald-500" />
                        <span>Duplicar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pr-8 sm:pr-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      activePurchase.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activePurchase.status === 'completed' ? 'Sessão Finalizada' : 'Sessão em Andamento'}
                    </span>
                  </div>

                  {/* List Name */}
                  <h2 className="text-2xl font-black text-neutral-950">{activePurchase.name}</h2>
                  
                  {/* Establishment Info underneath List Name */}
                  <p className="text-sm font-bold text-neutral-600">{activePurchase.market}</p>

                  {/* Type Info underneath Establishment Info */}
                  <p className="text-xs font-semibold text-neutral-500">
                    Tipo: {PURCHASE_TYPE_LABELS[activePurchase.type]}
                  </p>

                  {activePurchase.notes && (
                    <p className="text-sm text-neutral-500 italic mt-1">Observações: “{activePurchase.notes}”</p>
                  )}
                </div>

                {/* Right area: Summary Cards */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/50 flex items-center gap-6 shrink-0 flex-wrap">
                  <div className="text-left">
                    <span className="text-[10px] text-neutral-400 uppercase font-black">No Carrinho</span>
                    <span className="text-lg font-black text-neutral-900 block">
                      {formatCurrency(itemsInCartTotal)}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-semibold">
                      {itemsInCart.length} de {activeItems.length} itens marcados
                    </span>
                  </div>

                  <div className="h-10 w-px bg-neutral-200" />

                  <div className="text-left">
                    <span className="text-[10px] text-neutral-400 uppercase font-black">Total Previsto</span>
                    <span className="text-lg font-black text-emerald-600 block">
                      {formatCurrency(grandTotal)}
                    </span>
                    {budgetLimit > 0 && (
                      <span className={`text-[10px] font-bold ${budgetRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {budgetRemaining >= 0 ? `Resta ${formatCurrency(budgetRemaining)}` : `Estouro ${formatCurrency(Math.abs(budgetRemaining))}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Savings notice (RN-ITE-006) */}
              {totalSavings > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2 font-bold">
                    <TrendingDown size={16} className="text-emerald-600 shrink-0" />
                    <span>Economia total estimada de {formatCurrency(totalSavings)} em relação aos preços anteriores de catálogo!</span>
                  </div>
                </div>
              )}

              {/* Bottom Actions inside Card: Marcar todos e Finalizar compra side-by-side */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-neutral-100 w-full">
                {toggleAllItemsChecked && activeItems.length > 0 && activePurchase.status === 'inProgress' && (
                  <button
                    type="button"
                    onClick={() => toggleAllItemsChecked(activePurchase.id, itemsInCart.length !== activeItems.length)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                    title={itemsInCart.length === activeItems.length ? "Desmarcar todos os itens" : "Marcar todos os itens no carrinho"}
                  >
                    <CheckCheck size={15} className={itemsInCart.length === activeItems.length ? "text-emerald-500" : "text-neutral-400"} />
                    <span>{itemsInCart.length === activeItems.length ? "Desmarcar Todos" : "Marcar Todos"}</span>
                  </button>
                )}

                {activePurchase.status === 'inProgress' ? (
                  <button
                    type="button"
                    onClick={handleInitiateFinishPurchase}
                    className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                  >
                    <CheckCircle size={15} />
                    <span>Finalizar Compra</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reopenPurchase(activePurchase.id)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                  >
                    <RefreshCw size={14} />
                    <span>Reabrir para Modificar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CHECKLIST SEARCH & FILTERS BAR - Positioned directly under active purchase card */}
          {activePurchase && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col xl:flex-row gap-3 justify-between items-stretch xl:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Pesquisar itens nesta lista..."
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              {/* Controls aligned side-by-side */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                {/* Status Filters: Todos, Pendentes, No Carrinho */}
                <div className="flex items-center gap-0.5 bg-neutral-100 p-1 rounded-xl text-[11px] sm:text-xs border border-neutral-200/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setItemStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      itemStatusFilter === 'all'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      itemStatusFilter === 'pending'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Pendentes
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemStatusFilter('cart')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      itemStatusFilter === 'cart'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    No Carrinho
                  </button>
                </div>

                {/* Grouping Dropdown Selector */}
                <div className="flex items-center gap-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs border border-neutral-200/60 shrink-0">
                  <Layers size={13} className="text-neutral-400 shrink-0" />
                  <select
                    value={groupByCategory ? 'category' : 'none'}
                    onChange={(e) => setGroupByCategory(e.target.value === 'category')}
                    className="bg-transparent text-neutral-700 font-bold focus:outline-none cursor-pointer text-[11px] sm:text-xs pr-1"
                  >
                    <option value="category">Por Categoria</option>
                    <option value="none">Sem Agrupamento</option>
                  </select>
                </div>

                {/* Order / Sort Selector (RN-ITE-007) */}
                <div className="flex items-center gap-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs border border-neutral-200/60 shrink-0">
                  <ArrowUpDown size={13} className="text-neutral-400 shrink-0" />
                  <select
                    value={itemSort}
                    onChange={(e) => setItemSort(e.target.value as any)}
                    className="bg-transparent text-neutral-700 font-bold focus:outline-none cursor-pointer text-[11px] sm:text-xs pr-1"
                  >
                    <option value="category">Categoria</option>
                    <option value="pending-first">Pendentes Primeiro</option>
                    <option value="name">Nome (A-Z)</option>
                    <option value="subtotal-desc">Maior Valor</option>
                    <option value="price-asc">Menor Preço</option>
                    <option value="price-desc">Maior Preço</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Barcode feedback banner */}
          {purchaseBarcodeFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
                <span>{purchaseBarcodeFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseBarcodeFeedback(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Controls: Add Product & Scan Toolbar */}
          {activePurchase && activePurchase.status === 'inProgress' && (
            <div className="space-y-2">
              {/* Row 1: Adicionar item & Novo produto */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItemForm(!showAddItemForm);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Plus size={16} />
                  <span>Adicionar Item</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQuickProductModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  title="Cadastrar um novo produto diretamente no catálogo"
                >
                  <PackagePlus size={15} />
                  <span>Novo Produto</span>
                </button>
              </div>

              {/* Row 2: Escanear código de barras & Ler cupom fiscal */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseBarcodeFeedback(null);
                    setIsPurchaseBarcodeScannerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all"
                  title="Escanear produto para adicionar à lista ou marcar no carrinho"
                >
                  <BarcodeIcon size={15} />
                  <span>Escanear Código de Barras</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOcrTargetMode('activePurchase');
                    setIsReceiptOcrOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-200"
                  title="Importar produtos a partir de foto do cupom fiscal"
                >
                  <Receipt size={15} className="text-emerald-600" />
                  <span>Ler Cupom Fiscal</span>
                </button>
              </div>
            </div>
          )}

          {/* ADD ITEM AUTOCOMPLETE FORM */}
          {showAddItemForm && (
            <form onSubmit={handleAddItemSubmit} className="bg-white p-5 rounded-2xl border border-sky-100 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-extrabold text-sm text-neutral-950 flex items-center gap-2">
                  <Plus size={16} className="text-sky-500" />
                  Adicionar Item à Lista
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddItemForm(false);
                    setSelectedProductId('');
                    setProductSearchTerm('');
                    setIsProductDropdownOpen(false);
                  }} 
                  className="p-1 hover:bg-neutral-100 rounded text-neutral-500"
                >
                  <X size={15} />
                </button>
              </div>

              {itemError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{itemError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Autocomplete Product Selection */}
                <div className="relative" ref={autocompleteRef}>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Produto (busca inteligente) *</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      placeholder="Digite o nome do produto..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setSelectedProductId('');
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {productSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchTerm('');
                          setSelectedProductId('');
                          setIsProductDropdownOpen(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete dropdown options */}
                  {isProductDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      {filteredProductsForAutocomplete.length > 0 ? (
                        filteredProductsForAutocomplete.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              const b = formatBrandDisplay(p.brand);
                              setProductSearchTerm(`${p.name}${b ? ` (${b})` : ''} - ${getUnitCardDisplay(p.unit)}`);
                              setItemPrice(formatMoneyInput(p.lastPrice || 0));
                              setItemBrand(b);
                              setIsProductDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between gap-2 ${
                              selectedProductId === p.id ? 'bg-sky-50 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold text-neutral-900">{p.name}</div>
                              <div className="text-[10px] text-neutral-400">
                                {formatBrandDisplay(p.brand) ? `Marca: ${formatBrandDisplay(p.brand)} • ` : ''}Unidade: {getUnitCardDisplay(p.unit)}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-sky-600">
                                {formatCurrency(p.lastPrice || 0)}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-neutral-400">
                          {products.length === 0
                            ? 'Nenhum produto cadastrado no sistema.'
                            : 'Nenhum produto encontrado para a busca.'}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsProductDropdownOpen(false);
                          setShowQuickProductModal(true);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 transition-colors border-t border-emerald-100"
                      >
                        <PackagePlus size={14} />
                        <span>+ Cadastrar Novo Produto no Catálogo</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Qty */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Preço Unitário (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0,00"
                      maxLength={14}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(formatMoneyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Marca Recomendada</label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="Ex: Wickbold, Camil"
                    value={itemBrand}
                    onChange={(e) => setItemBrand(sanitizeAndCapitalize(e.target.value, 30))}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Live Subtotal Preview */}
              {parseFloat(itemQty) > 0 && parseMoneyToNumber(itemPrice) > 0 && (
                <div className="flex items-center justify-between p-3 bg-sky-50/70 rounded-xl border border-sky-100 text-xs">
                  <span className="font-semibold text-sky-800">
                    Subtotal Calculado ({itemQty} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseMoneyToNumber(itemPrice))}):
                  </span>
                  <span className="font-black text-sm text-sky-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((parseFloat(itemQty) || 0) * parseMoneyToNumber(itemPrice))}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItemForm(false);
                    setSelectedProductId('');
                    setProductSearchTerm('');
                    setIsProductDropdownOpen(false);
                  }}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
          )}

          {/* CHECKLIST ITEMS COMPONENT WITH SCROLLBAR */}
          {(() => {
            const displayItems = sortedActiveItems;

            if (displayItems.length === 0) {
              let emptyMsg = 'Nenhum item adicionado nesta lista.';
              if (activeItems.length > 0) {
                if (itemStatusFilter === 'pending') emptyMsg = 'Nenhum item pendente nesta lista.';
                else if (itemStatusFilter === 'cart') emptyMsg = 'Nenhum item no carrinho nesta lista.';
                else if (itemQuery) emptyMsg = 'Nenhum item corresponde à busca.';
              }
              return (
                <div className="text-center py-16 text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <ShoppingCart size={42} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-bold text-neutral-500">{emptyMsg}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {activeItems.length === 0 ? 'Insira produtos pelo botão "Adicionar Item" ou escaneie o cupom/código de barras!' : 'Tente alterar os filtros ou a busca.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain pr-1 space-y-4">
                {groupByCategory ? (
                  // GROUPED BY CATEGORY VIEW
                  (() => {
                    const groups: Record<string, { name: string; items: PurchaseItem[] }> = {};
                    displayItems.forEach(item => {
                      const key = item.categoryId || 'outros';
                      if (!groups[key]) {
                        groups[key] = {
                          name: item.categoryName || 'Outros',
                          items: []
                        };
                      }
                      groups[key].items.push(item);
                    });

                    return Object.entries(groups).map(([catId, group]) => {
                      const groupTotal = group.items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
                      const groupChecked = group.items.filter(it => it.isChecked).length;
                      return (
                        <div key={catId} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                          <div className="px-4 py-3 bg-neutral-50/70 border-b border-neutral-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-neutral-900">{group.name}</span>
                              <span className="text-[10px] text-neutral-400 font-semibold bg-neutral-200/60 px-2 py-0.5 rounded-full">
                                {groupChecked}/{group.items.length} no carrinho
                              </span>
                            </div>
                            <span className="text-xs font-bold text-neutral-700">
                              Subtotal: {formatCurrency(groupTotal)}
                            </span>
                          </div>

                          <div className="divide-y divide-neutral-200">
                            {group.items.map(item => renderItemRow(item))}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  // FLAT LIST VIEW
                  <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden divide-y divide-neutral-200 shadow-sm">
                    {displayItems.map(item => renderItemRow(item))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Zero Price in Cart / Empty Cart Validation Modal */}
      {showZeroPriceValidationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-neutral-950">
                  {emptyCartValidationMessage ? 'Carrinho Vazio' : 'Itens com Valor Zerado no Carrinho'}
                </h3>
                <span className="text-[11px] font-semibold text-neutral-400">
                  Ação necessária para finalizar a compra
                </span>
              </div>
            </div>

            {emptyCartValidationMessage ? (
              <p className="text-xs text-neutral-600 leading-relaxed">
                {emptyCartValidationMessage}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Para finalizar a compra, <strong>todos os itens adicionados ao carrinho devem possuir um valor unitário maior que R$ 0,00</strong>.
                </p>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-red-800 block">
                    O(s) seguinte(s) {zeroPriceModalItems.length} item(ns) estão com preço unitário R$ 0,00:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {zeroPriceModalItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-100 shadow-xs">
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-black text-neutral-900 block truncate">{item.productName}</span>
                          <span className="text-[10px] text-neutral-400">Qtd: {item.quantity} {item.unit}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowZeroPriceValidationModal(false);
                            setEditingItemId(item.id);
                            setEditItemQty(String(item.quantity));
                            setEditItemPrice('');
                          }}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          Definir Preço
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Clique em <strong>Definir Preço</strong> ou ajuste os valores diretamente na lista para continuar.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowZeroPriceValidationModal(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
              >
                Entendi, vou ajustar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Completing Purchase */}
      {showCompleteConfirm && activePurchase && (() => {
        const inCart = activeItems.filter(item => item.isChecked);
        const unpurchased = activeItems.filter(item => !item.isChecked);
        const inCartTotal = inCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const discount = activePurchase.discount || 0;
        const fee = activePurchase.additionalFee || 0;
        const finalCalculatedTotal = Math.max(0, inCartTotal - discount + fee);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
            <div className="bg-white max-w-md w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle2 size={24} />
                <h3 className="font-extrabold text-base text-neutral-950">Finalizar Lista de Compras</h3>
              </div>
              
              <p className="text-xs text-neutral-600 leading-relaxed">
                Você está prestes a concluir a compra <strong>"{activePurchase.name}"</strong> realizada no estabelecimento <strong>{activePurchase.market}</strong>.
              </p>

              <div className="p-3.5 bg-neutral-50 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-neutral-600">Total da Sessão (Carrinho):</span>
                  <span className="text-base text-emerald-600 font-black">{formatCurrency(finalCalculatedTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Itens no Carrinho:</span>
                  <span className="font-bold text-neutral-700">{inCart.length} de {activeItems.length} itens</span>
                </div>
              </div>

              {/* Unpurchased items removal notice */}
              {unpurchased.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertCircle size={15} className="shrink-0 text-amber-600" />
                    <span>Itens fora do carrinho serão removidos ({unpurchased.length})</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Ao confirmar a finalização, os seguintes <strong>{unpurchased.length} item(ns)</strong> que não foram adicionados ao carrinho serão <strong>removidos da lista</strong>:
                  </p>
                  <div className="max-h-24 overflow-y-auto bg-white/80 p-2 rounded-lg border border-amber-200/60 text-[11px] font-medium text-amber-950">
                    {unpurchased.map(i => i.productName).join(', ')}
                  </div>
                </div>
              )}

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-800 leading-relaxed text-justify">
                💡 <strong>Atualização Inteligente do Catálogo:</strong> Ao finalizar, os preços unitários pagos nesta compra serão automaticamente sincronizados como o preço de referência no catálogo de produtos, mantendo seu histórico e relatórios sempre precisos.
              </div>

              {completePurchaseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{completePurchaseError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteConfirm(false)}
                  disabled={isFinishingPurchase}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  disabled={isFinishingPurchase}
                  onClick={async () => {
                    try {
                      setIsFinishingPurchase(true);
                      setCompletePurchaseError(null);
                      await completePurchase(activePurchase.id);
                      setShowCompleteConfirm(false);
                      setSelectedPurchaseId(null);
                    } catch (err: any) {
                      setCompletePurchaseError(err.message || 'Erro ao finalizar a compra.');
                    } finally {
                      setIsFinishingPurchase(false);
                    }
                  }}
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {isFinishingPurchase ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Finalizando...</span>
                    </>
                  ) : (
                    <span>Confirmar & Finalizar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Duplicate Purchase Modal with Unique Name Validation */}
      {purchaseToDuplicate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <form onSubmit={handleConfirmDuplicate} className="bg-white max-w-md w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-20 sm:pb-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                <Copy size={18} className="text-sky-500" />
                Duplicar Lista de Compras
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPurchaseToDuplicate(null);
                  setDuplicateError(null);
                }}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400"
              >
                <X size={16} />
              </button>
            </div>

            {duplicateError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{duplicateError}</span>
              </div>
            )}

            <div className="p-3 bg-neutral-50 rounded-xl text-xs space-y-1 text-neutral-600">
              <div><strong>Lista de Origem:</strong> {purchaseToDuplicate.name}</div>
              <div><strong>Estabelecimento:</strong> {purchaseToDuplicate.market}</div>
              <div><strong>Total de Itens:</strong> {(purchaseItems[purchaseToDuplicate.id] || []).length} itens</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Novo nome exclusivo para a compra *
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Ex: Compra Semanal - 2ª Quinzena"
                value={duplicateName}
                onChange={(e) => {
                  setDuplicateName(sanitizeAndCapitalize(e.target.value, 50));
                  setDuplicateError(null);
                }}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Defina um nome único para não haver duplicidade com outras compras cadastradas.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setPurchaseToDuplicate(null);
                  setDuplicateError(null);
                }}
                className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDuplicating}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm"
              >
                {isDuplicating ? 'Duplicando...' : 'Confirmar & Duplicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode scanner modal for purchases */}
      <BarcodeScannerModal
        isOpen={isPurchaseBarcodeScannerOpen}
        onClose={() => setIsPurchaseBarcodeScannerOpen(false)}
        onDetected={handlePurchaseBarcodeDetected}
        userProducts={products}
        categories={categories}
        title="Escanear Produto para a Compra"
      />

      {/* Safe Purchase Deletion Confirmation Modal */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white max-w-md w-full rounded-3xl p-5 sm:p-6 border border-red-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={22} />
              <h3 className="font-extrabold text-base text-neutral-950">Excluir Lista de Compras?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tem certeza de que deseja excluir a lista <strong>"{purchaseToDelete.name}"</strong>? Todos os itens e histórico vinculados a esta compra serão removidos.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = purchaseToDelete.id;
                  setPurchaseToDelete(null);
                  try {
                    await deletePurchase(id);
                  } catch (err: any) {
                    showPurErrorTimed(err.message || 'Erro ao excluir lista de compras.');
                  }
                }}
                className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Item Deletion Confirmation Modal */}
      {itemToDelete && activePurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white max-w-sm w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <h3 className="font-extrabold text-base text-neutral-950">Remover da Lista?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Deseja remover <strong>"{itemToDelete.productName}"</strong> da lista de compras atual?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const itemId = itemToDelete.id;
                  setItemToDelete(null);
                  await deletePurchaseItem(activePurchase.id, itemId);
                }}
                className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal from Purchase view */}
      {showQuickProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-20 sm:pb-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                <PackagePlus size={18} className="text-emerald-600" />
                Cadastrar Novo Produto no Catálogo
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickProductModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {newProdError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{newProdError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuickProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz Integral 5kg"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    required
                    value={newProdCatId}
                    onChange={(e) => setNewProdCatId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 overflow-y-auto max-h-48 cursor-pointer"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Unidade de medida *
                  </label>
                  <select
                    required
                    value={normalizeProductUnit(newProdUnit)}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 overflow-y-auto max-h-48 cursor-pointer"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Marca recomendada <span className="font-normal text-neutral-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Camil, Nestlé (opcional)"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Preço de Referência (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(formatMoneyInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="EAN-13 ou EAN-8"
                  value={newProdBarcode}
                  onChange={(e) => setNewProdBarcode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowQuickProductModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewProd}
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmittingNewProd ? 'Cadastrando...' : 'Cadastrar & Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Metadata & Budget Modal (RN-COM-007, RN-COM-009, RN-COM-010) */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <form 
            onSubmit={handleEditPurchaseSubmit}
            className="bg-white max-w-lg w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-20 sm:pb-6"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                <Edit3 size={18} className="text-sky-500" />
                Editar Dados da Lista & Orçamento
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setEditingPurchase(null);
                  setEditPurError(null);
                }} 
                className="p-1 hover:bg-neutral-100 rounded text-neutral-400"
              >
                <X size={16} />
              </button>
            </div>

            {editPurError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                <AlertCircle size={15} className="shrink-0" />
                <span>{editPurError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-500 mb-1">Título da compra *</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editPurName}
                  onChange={(e) => setEditPurName(sanitizeAndCapitalize(e.target.value, 50))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do estabelecimento *</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editPurMarket}
                  onChange={(e) => setEditPurMarket(sanitizeAndCapitalize(e.target.value, 50))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={editPurDate}
                  onChange={(e) => setEditPurDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Tipo da Compra *</label>
                <select
                  value={editPurType}
                  onChange={(e) => setEditPurType(e.target.value as PurchaseType)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                >
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="emergency">Emergencial</option>
                  <option value="butcher">Açougue</option>
                  <option value="pharmacy">Farmácia</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Orçamento Limite (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    maxLength={14}
                    value={editPurBudget}
                    onChange={(e) => setEditPurBudget(formatMoneyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Desconto / Cupom (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    maxLength={14}
                    value={editPurDiscount}
                    onChange={(e) => setEditPurDiscount(formatMoneyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Taxas / Sacolas (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    maxLength={14}
                    value={editPurAdditionalFee}
                    onChange={(e) => setEditPurAdditionalFee(formatMoneyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-500 mb-1">Observações (máx. 200 caracteres)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={editPurNotes}
                  onChange={(e) => setEditPurNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setEditingPurchase(null);
                  setEditPurError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editPurSubmitting}
                className="px-5 py-2 text-xs font-black bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
              >
                {editPurSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sticky Bottom Bar for Active Shopping in Progress (RN-ITE-008) */}
      {activePurchase && activePurchase.status === 'inProgress' && (
        <div className="fixed bottom-[50px] md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div>
                <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase font-black block">No Carrinho</span>
                <span className="text-sm sm:text-base font-black text-neutral-900 leading-tight block">
                  {formatCurrency(itemsInCartTotal)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-neutral-500 font-semibold">
                  {itemsInCart.length}/{activeItems.length} itens
                </span>
              </div>

              <div className="h-7 w-px bg-neutral-200 hidden sm:block" />

              <div className="hidden sm:block">
                <span className="text-[10px] text-neutral-400 uppercase font-black block">Total Previsto</span>
                <span className="text-base font-black text-emerald-600 leading-tight block">
                  {formatCurrency(grandTotal)}
                </span>
                {budgetLimit > 0 && (
                  <span className={`text-[10px] font-bold ${budgetRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {budgetRemaining >= 0 ? `Resta ${formatCurrency(budgetRemaining)}` : `Estouro ${formatCurrency(Math.abs(budgetRemaining))}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowAddItemForm(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={14} />
                <span>Item</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPurchaseBarcodeScannerOpen(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all"
                title="Escanear código de barras"
              >
                <BarcodeIcon size={14} />
                <span className="hidden sm:inline">Escanear</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOcrTargetMode('activePurchase');
                  setIsReceiptOcrOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-200"
                title="Ler cupom fiscal"
              >
                <Receipt size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">Cupom</span>
              </button>

              <button
                type="button"
                onClick={handleInitiateFinishPurchase}
                className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm transition-all"
              >
                <CheckCircle size={14} />
                <span>Finalizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback for OCR Import */}
      {ocrFeedbackMessage && (
        <div className="fixed bottom-24 sm:bottom-8 right-4 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-3 max-w-md">
          <CheckCircle2 size={18} className="shrink-0 text-white" />
          <span className="flex-1">{ocrFeedbackMessage}</span>
          <button
            type="button"
            onClick={() => setOcrFeedbackMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Modal OCR Cupom Fiscal */}
      <ReceiptOcrModal
        isOpen={isReceiptOcrOpen}
        onClose={() => setIsReceiptOcrOpen(false)}
        categories={categories}
        products={products}
        activePurchaseId={ocrTargetMode === 'activePurchase' ? selectedPurchaseId : null}
        activePurchaseName={ocrTargetMode === 'activePurchase' ? activePurchase?.name : null}
        onConfirmNewPurchase={handleOcrConfirmNewPurchase}
        onConfirmAddToActivePurchase={handleOcrConfirmAddToActivePurchase}
      />
    </div>
  );

  // Helper renderer for each row in checklist
  function renderItemRow(item: PurchaseItem) {
    const isEditing = editingItemId === item.id;
    const isCompleted = activePurchase?.status === 'completed';
    const total = item.quantity * item.unitPrice;

    return (
      <div 
        key={item.id} 
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-all ${
          item.isChecked 
            ? 'bg-neutral-50/50' 
            : 'hover:bg-neutral-50/30'
        }`}
      >
        {/* Checkbox and Product details */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!isCompleted ? (
            <input
              type="checkbox"
              checked={item.isChecked}
              onChange={(e) => activePurchase && toggleItemChecked(activePurchase.id, item.id, e.target.checked)}
              className="h-5 w-5 rounded border-neutral-300 text-sky-500 focus:ring-sky-500 cursor-pointer shrink-0"
            />
          ) : (
            <div className="p-1 text-emerald-500 shrink-0">
              <CheckCircle size={16} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-bold text-sm text-neutral-950 ${
                item.isChecked ? 'line-through text-neutral-400' : ''
              }`}>
                {item.productName}
              </h4>
              {item.barcode && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                  <BarcodeIcon size={10} />
                  {item.barcode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[10px] text-neutral-400 mt-1">
              <span className="bg-sky-50 text-sky-500 px-1.5 py-0.5 rounded font-semibold">
                {item.categoryName}
              </span>
              {formatBrandDisplay(item.productBrand) ? (
                <span className="text-neutral-600 font-medium">Marca: {formatBrandDisplay(item.productBrand)}</span>
              ) : null}
              <span>•</span>
              <span>Unidade: {getUnitCardDisplay(item.unit)}</span>

              {/* Price comparison badge vs catalog previous price (RN-ITE-006) */}
              {(() => {
                const comp = getItemPriceComparison(item);
                if (comp.type === 'cheaper') {
                  return (
                    <span className="inline-flex items-center gap-1 font-bold text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      ↓ {comp.label}
                    </span>
                  );
                }
                if (comp.type === 'expensive') {
                  return (
                    <span className="inline-flex items-center gap-1 font-bold text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                      ↑ {comp.label}
                    </span>
                  );
                }
                if (comp.type === 'stable') {
                  return (
                    <span className="text-[9px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                      = Preço igual
                    </span>
                  );
                }
                return null;
              })()}

              {/* Zero Price Warning on Item in Cart */}
              {item.isChecked && (!item.unitPrice || item.unitPrice <= 0) && !isCompleted && (
                <span className="inline-flex items-center gap-1 font-black text-[9px] text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full animate-pulse">
                  <AlertCircle size={10} className="text-red-600 shrink-0" />
                  Preço zerado (R$ 0,00)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantities, Inline Controls & Price */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          {isEditing ? (
            <div className="flex flex-col gap-1.5 bg-neutral-50 p-2.5 rounded-xl border border-sky-300">
              <div className="flex items-center gap-2">
                <div className="w-16">
                  <label className="text-[9px] font-bold text-neutral-400 block">Qtd</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={editItemQty}
                    onChange={(e) => {
                      setEditItemQty(e.target.value);
                      setInlineEditError(null);
                    }}
                    className="w-full px-1.5 py-0.5 text-xs bg-white border border-neutral-300 rounded"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[9px] font-bold text-neutral-400 block">Preço (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    maxLength={14}
                    value={editItemPrice}
                    onChange={(e) => {
                      setEditItemPrice(formatMoneyInput(e.target.value));
                      setInlineEditError(null);
                    }}
                    className="w-full px-1.5 py-0.5 text-xs font-bold bg-white border border-neutral-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-1 self-end">
                  <button
                    type="button"
                    onClick={() => handleSaveInlineEdit(item)}
                    className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    title="Salvar alterações"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(null);
                      setInlineEditError(null);
                    }}
                    className="p-1 bg-neutral-200 text-neutral-600 rounded hover:bg-neutral-300"
                    title="Cancelar"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              {inlineEditError && (
                <span className="text-[10px] text-red-500 font-bold">{inlineEditError}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Quick Qty +/- buttons */}
              {!isCompleted && (
                <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1 border border-neutral-200/60">
                  <button
                    type="button"
                    onClick={() => handleQuickQtyChange(item, -1)}
                    className="p-1 hover:bg-white text-neutral-600 rounded-lg transition-all"
                    title="Diminuir quantidade"
                  >
                    <MinusCircle size={14} />
                  </button>
                  <span className="px-1 text-xs font-black text-neutral-900 min-w-[20px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickQtyChange(item, 1)}
                    className="p-1 hover:bg-white text-neutral-600 rounded-lg transition-all"
                    title="Aumentar quantidade"
                  >
                    <PlusCircle size={14} />
                  </button>
                </div>
              )}

              {/* Price details */}
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block font-semibold">Unitário</span>
                <span className={`text-xs font-bold ${item.isChecked && (!item.unitPrice || item.unitPrice <= 0) && !isCompleted ? 'text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-black' : 'text-neutral-600'}`}>
                  {formatCurrency(item.unitPrice)}
                </span>
              </div>

              {/* Total */}
              <div className="text-right min-w-[75px]">
                <span className="text-[10px] text-neutral-400 block font-semibold">Total</span>
                <span className="text-sm font-extrabold text-neutral-900">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Actions */}
              {!isCompleted && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(item.id);
                      setEditItemQty(String(item.quantity));
                      setEditItemPrice(formatMoneyInput(item.unitPrice));
                    }}
                    className="p-1.5 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    title="Editar quantidade e preço"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activePurchase) {
                        setItemToDelete(item);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                    title="Remover da lista"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
