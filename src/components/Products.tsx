import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit3, Trash2, FolderPlus, ShoppingBasket, Check, X, Tag, AlertCircle, Barcode as BarcodeIcon, Sparkles,
  TrendingUp, History, Store, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Category, Product, Purchase, PurchaseItem } from '../types';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcon';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { sanitizeAndCapitalize, formatMoneyInput, parseMoneyToNumber, formatCurrencyBRL } from '../utils/textFormatters';
import { PRODUCT_UNITS, normalizeProductUnit, getUnitCardDisplay } from '../utils/units';

interface ProductsProps {
  categories: Category[];
  products: Product[];
  purchases?: Purchase[];
  purchaseItems?: Record<string, PurchaseItem[]>;
  addCategory: (name: string, iconName: string) => Promise<any>;
  updateCategory: (id: string, name: string, iconName: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addProduct: (name: string, categoryId: string, unit: string, brand: string, lastPrice: number, barcode?: string) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export function Products({
  categories,
  products,
  purchases = [],
  purchaseItems = {},
  addCategory,
  updateCategory,
  deleteCategory,
  addProduct,
  updateProduct,
  deleteProduct
}: ProductsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Error and Success feedback states with 3-second auto dismiss
  const [productError, setProductError] = useState<string | null>(null);
  const [productSuccess, setProductSuccess] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [barcodeSuccessBanner, setBarcodeSuccessBanner] = useState<string | null>(null);

  // Quick category creation inside product form
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatIcon, setQuickCatIcon] = useState('Package');

  const productErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const productSuccessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categoryErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const categorySuccessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showProductErrorTimed = (msg: string | null) => {
    if (productErrorTimerRef.current) clearTimeout(productErrorTimerRef.current);
    setProductError(msg);
    if (msg) {
      productErrorTimerRef.current = setTimeout(() => setProductError(null), 3000);
    }
  };

  const showProductSuccessTimed = (msg: string | null) => {
    if (productSuccessTimerRef.current) clearTimeout(productSuccessTimerRef.current);
    setProductSuccess(msg);
    if (msg) {
      productSuccessTimerRef.current = setTimeout(() => setProductSuccess(null), 3500);
    }
  };

  const showCategoryErrorTimed = (msg: string | null) => {
    if (categoryErrorTimerRef.current) clearTimeout(categoryErrorTimerRef.current);
    setCategoryError(msg);
    if (msg) {
      categoryErrorTimerRef.current = setTimeout(() => setCategoryError(null), 3000);
    }
  };

  const showCategorySuccessTimed = (msg: string | null) => {
    if (categorySuccessTimerRef.current) clearTimeout(categorySuccessTimerRef.current);
    setCategorySuccess(msg);
    if (msg) {
      categorySuccessTimerRef.current = setTimeout(() => setCategorySuccess(null), 3500);
    }
  };

  const showBannerTimed = (msg: string | null) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBarcodeSuccessBanner(msg);
    if (msg) {
      bannerTimerRef.current = setTimeout(() => setBarcodeSuccessBanner(null), 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (productErrorTimerRef.current) clearTimeout(productErrorTimerRef.current);
      if (productSuccessTimerRef.current) clearTimeout(productSuccessTimerRef.current);
      if (categoryErrorTimerRef.current) clearTimeout(categoryErrorTimerRef.current);
      if (categorySuccessTimerRef.current) clearTimeout(categorySuccessTimerRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  // Deletion modals state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Price history modal state
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  // Barcode Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Product Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodUnit, setProdUnit] = useState('Unidade');
  const [prodBrand, setProdBrand] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodLastPrice, setProdLastPrice] = useState('0,00');

  // Category Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Package');

  // Submit Product Form
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = sanitizeAndCapitalize(prodName, 40);
    const cleanedBrand = sanitizeAndCapitalize(prodBrand, 30);

    if (!cleanedName || !prodCategoryId || !prodUnit || !cleanedBrand) {
      showProductErrorTimed('Preencha os campos obrigatórios (incluindo marca recomendada).');
      return;
    }

    const priceNum = parseMoneyToNumber(prodLastPrice);

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, {
          name: cleanedName,
          categoryId: prodCategoryId,
          unit: prodUnit,
          brand: cleanedBrand,
          barcode: prodBarcode,
          lastPrice: priceNum
        });
        showBannerTimed(`Produto "${cleanedName}" atualizado com sucesso!`);
        resetProductForm();
      } else {
        await addProduct(cleanedName, prodCategoryId, prodUnit, cleanedBrand, priceNum, prodBarcode);
        // Keep modal open and clear fields so user can continue registering next products
        setProdName('');
        setProdBrand('');
        setProdBarcode('');
        setProdLastPrice('0,00');
        showProductSuccessTimed(`Produto "${cleanedName}" cadastrado com sucesso! Você pode continuar cadastrando outros.`);
      }
    } catch (err: any) {
      showProductErrorTimed(err.message || 'Ocorreu um erro ao salvar o produto.');
    }
  };

  const resetProductForm = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProdName('');
    setProdCategoryId(categories[0]?.id || '');
    setProdUnit('Un');
    setProdBrand('');
    setProdBarcode('');
    setProdLastPrice('0,00');
    setProductError(null);
    setProductSuccess(null);
  };

  // Quick Category creation inside Product Form
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCatName = sanitizeAndCapitalize(quickCatName, 30);
    if (!cleanedCatName || !quickCatIcon) {
      showProductErrorTimed('Informe o nome da categoria rápida.');
      return;
    }

    try {
      const createdCategory = await addCategory(cleanedCatName, quickCatIcon);
      if (createdCategory && createdCategory.id) {
        setProdCategoryId(createdCategory.id);
      }
      setShowQuickCategoryModal(false);
      setQuickCatName('');
      setQuickCatIcon('Package');
      showProductSuccessTimed(`Categoria "${cleanedCatName}" criada e selecionada para este produto!`);
    } catch (err: any) {
      showProductErrorTimed(err.message || 'Erro ao criar categoria rápida.');
    }
  };

  const startEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdCategoryId(prod.categoryId);
    setProdUnit(normalizeProductUnit(prod.unit));
    setProdBrand(prod.brand || '');
    setProdBarcode(prod.barcode || '');
    setProdLastPrice(formatMoneyInput(prod.lastPrice || 0));
    setShowProductForm(true);
    setProductError(null);
    setProductSuccess(null);
  };

  // Barcode detection handler from scanner modal
  const handleBarcodeDetected = (data: {
    barcode: string;
    suggestedName?: string;
    suggestedBrand?: string;
    suggestedCategory?: string;
    suggestedUnit?: string;
  }) => {
    // 1. Check if product already exists
    const existing = products.find(p => p.barcode === data.barcode);
    if (existing) {
      startEditProduct(existing);
      showBannerTimed(
        `Produto encontrado pelo código de barras: "${existing.name}". Formulário aberto para edição.`
      );
      return;
    }

    // 2. Prepare new product with pre-filled suggestions
    setEditingProductId(null);
    setProdBarcode(data.barcode);
    if (data.suggestedName) setProdName(sanitizeAndCapitalize(data.suggestedName, 40));
    if (data.suggestedBrand) setProdBrand(sanitizeAndCapitalize(data.suggestedBrand, 40));
    if (data.suggestedUnit) setProdUnit(normalizeProductUnit(data.suggestedUnit));

    // Match category
    if (data.suggestedCategory && categories.length > 0) {
      const match = categories.find(
        c => c.name.toLowerCase() === data.suggestedCategory!.toLowerCase()
      );
      if (match) {
        setProdCategoryId(match.id);
      } else if (!prodCategoryId && categories[0]) {
        setProdCategoryId(categories[0].id);
      }
    } else if (!prodCategoryId && categories[0]) {
      setProdCategoryId(categories[0].id);
    }

    setShowProductForm(true);
    setProductError(null);
    showBannerTimed(
      `Código de barras ${data.barcode} lido com sucesso! ${
        data.suggestedName ? 'Dados pré-preenchidos automaticamente.' : 'Preencha os detalhes do produto.'
      }`
    );
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err: any) {
      showProductErrorTimed(err.message || 'Erro ao excluir o produto.');
    }
  };

  // Submit Category Form
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCatName = sanitizeAndCapitalize(catName, 30);
    if (!cleanedCatName || !catIcon) {
      showCategoryErrorTimed('Preencha o nome da categoria.');
      return;
    }

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, cleanedCatName, catIcon);
        showCategorySuccessTimed(`Categoria "${cleanedCatName}" atualizada com sucesso!`);
        resetCategoryForm();
      } else {
        await addCategory(cleanedCatName, catIcon);
        // Keep category modal open and clear field so user can continuously add categories
        setCatName('');
        setCatIcon('Package');
        showCategorySuccessTimed(`Categoria "${cleanedCatName}" cadastrada com sucesso! Você pode continuar cadastrando outras.`);
      }
    } catch (err: any) {
      showCategoryErrorTimed(err.message || 'Ocorreu um erro ao salvar a categoria.');
    }
  };

  const resetCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCatName('');
    setCatIcon('Package');
    setCategoryError(null);
    setCategorySuccess(null);
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.iconName);
    setShowCategoryForm(true);
    setCategoryError(null);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err: any) {
      showCategoryErrorTimed(err.message || 'Erro ao excluir a categoria.');
    }
  };

  // Filtered lists sorted alphabetically
  const filteredProducts = useMemo(() => {
    return products
      .filter(prod => {
        const q = productSearch.toLowerCase().trim();
        const matchesSearch = prod.name.toLowerCase().includes(q) || 
                              (prod.brand && prod.brand.toLowerCase().includes(q)) ||
                              (prod.barcode && prod.barcode.includes(q.replace(/\D/g, '')));
        const matchesCategory = selectedCategoryFilter === 'all' || prod.categoryId === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [products, productSearch, selectedCategoryFilter]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [categories, categorySearch]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [categories]);

  // Memoized price history for selected product
  const productPriceHistory = useMemo(() => {
    if (!selectedProductForHistory) return [];

    const history: Array<{
      purchaseId: string;
      purchaseName: string;
      market: string;
      date: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }> = [];

    purchases.forEach(pur => {
      const items = purchaseItems[pur.id] || [];
      const match = items.find(it => 
        it.productId === selectedProductForHistory.id || 
        (selectedProductForHistory.barcode && it.barcode === selectedProductForHistory.barcode)
      );
      if (match) {
        history.push({
          purchaseId: pur.id,
          purchaseName: pur.name,
          market: pur.market,
          date: pur.date,
          unitPrice: match.unitPrice,
          quantity: match.quantity,
          total: match.unitPrice * match.quantity,
        });
      }
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedProductForHistory, purchases, purchaseItems]);

  const priceStats = useMemo(() => {
    if (productPriceHistory.length === 0) return null;
    const prices = productPriceHistory.map(h => h.unitPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const lowestOccurrence = productPriceHistory.find(h => h.unitPrice === minPrice);

    return {
      minPrice,
      maxPrice,
      avgPrice,
      lowestOccurrence,
      count: productPriceHistory.length
    };
  }, [productPriceHistory]);

  return (
    <div className="space-y-6">
      {/* Barcode Scanning Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcodeDetected}
        title="Cadastrar / Identificar Produto"
      />

      {/* Quick Category Modal from Product Form */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200 space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-20 sm:pb-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                <FolderPlus size={18} className="text-sky-500" />
                Nova Categoria Rápida
              </h3>
              <button 
                type="button" 
                onClick={() => setShowQuickCategoryModal(false)} 
                className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder="Ex: Mercearia, Padaria, Frios"
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(sanitizeAndCapitalize(e.target.value, 30))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-neutral-500 mb-1.5">Ícone Decorativo:</span>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setQuickCatIcon(icon.name)}
                      className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        quickCatIcon === icon.name
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'hover:bg-neutral-200 text-neutral-600'
                      }`}
                      title={icon.label}
                    >
                      <CategoryIcon name={icon.name} size={16} />
                      <span className="text-[9px] truncate w-full text-center">{icon.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'products'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <ShoppingBasket size={18} />
          Meus Produtos ({products.length})
        </button>
        <button
          onClick={() => {
            setActiveSubTab('categories');
            // pre-set default category selection in form if needed
            if (!prodCategoryId && categories.length > 0) {
              setProdCategoryId(categories[0].id);
            }
          }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'categories'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Tag size={18} />
          Categorias ({categories.length})
        </button>
      </div>

      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Barcode Success Feedback Banner */}
          {barcodeSuccessBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
                <span>{barcodeSuccessBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeSuccessBanner(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Products Header Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Pesquisar produto, marca ou código de barras..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Todas as categorias</option>
                {sortedCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Scan Barcode Button */}
              <button
                type="button"
                onClick={() => {
                  setBarcodeSuccessBanner(null);
                  setIsScannerOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                title="Cadastrar lendo código de barras pela câmera ou arquivo"
              >
                <BarcodeIcon size={18} />
                <span className="hidden md:inline">Ler Código de Barras</span>
                <span className="md:hidden">Escanear</span>
              </button>

              <button
                onClick={() => {
                  resetProductForm();
                  if (categories.length > 0) setProdCategoryId(categories[0].id);
                  setShowProductForm(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                <Plus size={18} />
                <span>Novo Produto</span>
              </button>
            </div>
          </div>

          {/* Product form overlay / inline */}
          {showProductForm && (
            <form onSubmit={handleProductSubmit} className="bg-white p-6 rounded-2xl border border-sky-100 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                  <ShoppingBasket size={18} className="text-sky-500" />
                  {editingProductId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <button type="button" onClick={resetProductForm} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
                  <X size={16} />
                </button>
              </div>

              {/* Form Validation Errors & Success */}
              {productError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{productError}</span>
                </div>
              )}

              {productSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="shrink-0 text-emerald-600" />
                    <span>{productSuccess}</span>
                  </div>
                  <button type="button" onClick={() => setProductSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ex: Arroz Integral"
                    value={prodName}
                    onChange={(e) => setProdName(sanitizeAndCapitalize(e.target.value, 40))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Category with Quick Shortcut */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-500">Categoria *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1"
                    >
                      <FolderPlus size={12} />
                      <span>+ Nova Categoria</span>
                    </button>
                  </div>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 overflow-y-auto max-h-48 cursor-pointer"
                  >
                    {sortedCategories.length === 0 && <option value="">Crie uma categoria primeiro</option>}
                    {sortedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Unidade de medida *</label>
                  <select
                    value={normalizeProductUnit(prodUnit)}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 overflow-y-auto max-h-48 cursor-pointer"
                  >
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Marca recomendada *</label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="Ex: Tio João"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(sanitizeAndCapitalize(e.target.value, 30))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Barcode with inline scanner button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-500">
                      Código de Barras (EAN / GTIN)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <BarcodeIcon size={12} />
                      Ler com Câmera
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="Ex: 7891000100103"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <BarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                  </div>
                </div>

                {/* Last Price */}
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">Preço Atual / Último Preço (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      maxLength={14}
                      value={prodLastPrice}
                      onChange={(e) => setProdLastPrice(formatMoneyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
                >
                  {editingProductId ? 'Salvar Alterações' : 'Adicionar Produto'}
                </button>
              </div>
            </form>
          )}

          {/* Standalone Error Feedback (e.g. Deletion Error) */}
          {productError && !showProductForm && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{productError}</span>
            </div>
          )}

          {/* Product Grid / List */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const cat = categories.find(c => c.id === prod.categoryId);
                return (
                  <div key={prod.id} className="bg-white p-5 rounded-2xl border border-neutral-200 hover:shadow-sm transition-all flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 bg-sky-50 text-sky-500 rounded text-xs flex items-center gap-1 font-semibold">
                          {cat ? <CategoryIcon name={cat.iconName} size={12} /> : null}
                          {cat ? cat.name : 'Outros'}
                        </span>
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-bold">{getUnitCardDisplay(prod.unit)}</span>
                        {prod.barcode && (
                          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1" title={`Código de Barras: ${prod.barcode}`}>
                            <BarcodeIcon size={10} />
                            {prod.barcode}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-neutral-950 truncate">{prod.name}</h4>
                      
                      {prod.brand && (
                        <p className="text-xs text-neutral-400 truncate">Marca: <strong className="text-neutral-600">{prod.brand}</strong></p>
                      )}

                      <p className="text-sm font-black text-emerald-600 mt-1">
                        {prod.lastPrice > 0 
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.lastPrice)
                          : 'Preço não registrado'
                        }
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => setSelectedProductForHistory(prod)}
                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                        title="Ver Histórico de Preços e Mercados"
                      >
                        <TrendingUp size={15} />
                      </button>
                      <button 
                        onClick={() => startEditProduct(prod)}
                        className="p-1.5 hover:bg-sky-50 text-sky-600 rounded-lg"
                        title="Editar"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => setProductToDelete(prod)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                        title="Excluir Produto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <ShoppingBasket size={42} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-bold text-neutral-500">Nenhum produto cadastrado ou encontrado.</p>
              <p className="text-xs text-neutral-400 mt-1">Crie um novo produto no botão acima ou semeie os dados de demonstração.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          {/* Categories Header Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Pesquisar categoria..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                resetCategoryForm();
                setShowCategoryForm(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <FolderPlus size={18} />
              Nova Categoria
            </button>
          </div>

          {/* Category Form */}
          {showCategoryForm && (
            <form onSubmit={handleCategorySubmit} className="bg-white p-6 rounded-2xl border border-sky-100 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-extrabold text-base text-neutral-950 flex items-center gap-2">
                  <Tag size={18} className="text-sky-500" />
                  {editingCategoryId ? 'Editar Categoria' : 'Criar Nova Categoria'}
                </h3>
                <button type="button" onClick={resetCategoryForm} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500">
                  <X size={16} />
                </button>
              </div>

              {/* Form Category Errors & Success */}
              {categoryError && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{categoryError}</span>
                </div>
              )}

              {categorySuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="shrink-0 text-emerald-600" />
                    <span>{categorySuccess}</span>
                  </div>
                  <button type="button" onClick={() => setCategorySuccess(null)} className="text-emerald-600 hover:text-emerald-800">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Nome da Categoria *</label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      placeholder="Ex: Mercearia"
                      value={catName}
                      onChange={(e) => setCatName(sanitizeAndCapitalize(e.target.value, 30))}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-neutral-500 mb-1.5">Ícone Selecionado:</span>
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-500 rounded-xl border border-sky-100 font-bold text-sm">
                      <CategoryIcon name={catIcon} size={18} />
                      <span>{catIcon}</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="block text-xs font-bold text-neutral-500 mb-1.5">Selecione um Ícone Decorativo *</span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl max-h-48 overflow-y-auto">
                    {AVAILABLE_ICONS.map((icon) => (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => setCatIcon(icon.name)}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                          catIcon === icon.name
                            ? 'bg-sky-500 text-white'
                            : 'hover:bg-neutral-200 text-neutral-600'
                        }`}
                        title={icon.label}
                      >
                        <CategoryIcon name={icon.name} size={18} />
                        <span className="text-[9px] truncate w-full text-center">{icon.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
                >
                  {editingCategoryId ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          )}

          {/* Standalone Error Feedback (e.g. Deletion Error) */}
          {categoryError && !showCategoryForm && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{categoryError}</span>
            </div>
          )}

          {/* Categories list */}
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <div key={cat.id} className="bg-white p-4 rounded-2xl border border-neutral-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl border border-sky-100">
                      <CategoryIcon name={cat.iconName} size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-neutral-950">{cat.name}</h4>
                      <p className="text-[10px] text-neutral-400">
                        {products.filter(p => p.categoryId === cat.id).length} itens
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-0.5">
                    <button 
                      onClick={() => startEditCategory(cat)}
                      className="p-1 hover:bg-sky-50 text-sky-600 rounded"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                      title="Excluir Categoria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <Tag size={42} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-bold text-neutral-500">Nenhuma categoria cadastrada ou encontrada.</p>
              <p className="text-xs text-neutral-400 mt-1">Use o painel para criar uma nova categoria do zero.</p>
            </div>
          )}
        </div>
      )}

      {/* Product Deletion Modal */}
      {productToDelete && (() => {
        const allPurchaseItems = Object.values(purchaseItems).flat();
        const usedCount = allPurchaseItems.filter(it => it.productId === productToDelete.id).length;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
            <div className="bg-white max-w-sm w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle size={22} />
                <h3 className="font-extrabold text-base text-neutral-950">Excluir Produto?</h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Deseja realmente excluir <strong>"{productToDelete.name}"</strong>?
              </p>
              {usedCount > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-xs font-semibold text-amber-700 border border-amber-200">
                  Este produto já está associado a <strong>{usedCount} item(ns) de lista/feira</strong>. De acordo com as regras de integridade do sistema, você não pode excluir um produto que já esteja sendo utilizado em listas de compras.
                </div>
              ) : null}
              {productError && (
                <div className="p-3 bg-red-50 rounded-xl text-xs font-semibold text-red-600 border border-red-200">
                  {productError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setProductToDelete(null);
                    setProductError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  {usedCount > 0 ? 'Fechar' : 'Cancelar'}
                </button>
                {usedCount === 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteProduct}
                    className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all"
                  >
                    Sim, Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Category Deletion Modal */}
      {categoryToDelete && (() => {
        const linkedCount = products.filter(p => p.categoryId === categoryToDelete.id).length;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
            <div className="bg-white max-w-sm w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle size={22} />
                <h3 className="font-extrabold text-base text-neutral-950">Excluir Categoria?</h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Deseja excluir a categoria <strong>"{categoryToDelete.name}"</strong>?
              </p>
              {linkedCount > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-xs font-semibold text-amber-700 border border-amber-200">
                  Existem <strong>{linkedCount} produto(s)</strong> vinculados a esta categoria. De acordo com a regra do sistema, você precisa remover ou mover esses produtos para outra categoria antes de excluir.
                </div>
              ) : null}
              {categoryError && (
                <div className="p-3 bg-red-50 rounded-xl text-xs font-semibold text-red-600 border border-red-200">
                  {categoryError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryToDelete(null);
                    setCategoryError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  {linkedCount > 0 ? 'Fechar' : 'Cancelar'}
                </button>
                {linkedCount === 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteCategory}
                    className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all"
                  >
                    Sim, Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Product Price History Modal */}
      {selectedProductForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xl space-y-5 my-auto max-h-[90dvh] overflow-y-auto pb-16 sm:pb-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-neutral-950">
                    Histórico de Preços
                  </h3>
                  <p className="text-xs text-neutral-500 font-semibold">
                    {selectedProductForHistory.name} {selectedProductForHistory.brand && `(${selectedProductForHistory.brand})`} • {selectedProductForHistory.unit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* Price stats badges */}
            {priceStats ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 block">Menor Preço</span>
                  <span className="text-sm font-black text-emerald-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceStats.minPrice)}
                  </span>
                  {priceStats.lowestOccurrence && (
                    <span className="text-[9px] text-emerald-600/80 block truncate mt-0.5" title={priceStats.lowestOccurrence.market}>
                      {priceStats.lowestOccurrence.market}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-600 block">Preço Médio</span>
                  <span className="text-sm font-black text-sky-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceStats.avgPrice)}
                  </span>
                  <span className="text-[9px] text-sky-500 block mt-0.5">
                    {priceStats.count} {priceStats.count === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 block">Maior Preço</span>
                  <span className="text-sm font-black text-amber-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceStats.maxPrice)}
                  </span>
                  <span className="text-[9px] text-amber-600/80 block mt-0.5">
                    Máx. pago
                  </span>
                </div>
              </div>
            ) : null}

            {/* List of Occurrences */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Registros em Compras ({productPriceHistory.length})
              </h4>

              {productPriceHistory.length > 0 ? (
                <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1.5">
                  {productPriceHistory.map((item, idx) => (
                    <div 
                      key={`${item.purchaseId}-${idx}`} 
                      className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Store size={13} className="text-neutral-400" />
                          <span className="text-xs font-bold text-neutral-800">
                            {item.market || item.purchaseName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span>{item.quantity} {selectedProductForHistory.unit} comprados</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-900 block">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}/{selectedProductForHistory.unit}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 space-y-1">
                  <History size={28} className="mx-auto text-neutral-300" />
                  <p className="text-xs font-bold text-neutral-500">Nenhuma compra finalizada com este produto.</p>
                  <p className="text-[11px] text-neutral-400">
                    O histórico de preços é alimentado automaticamente conforme você conclui suas compras no supermercado.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProductForHistory(null)}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-black text-neutral-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
