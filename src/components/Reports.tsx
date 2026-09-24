import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Calendar, PieChart, Sparkles, TrendingDown, TrendingUp, AlertCircle, 
  RefreshCw, CheckCircle, HelpCircle, Download, Printer, Store, DollarSign, 
  ShoppingBag, ArrowUpDown, ChevronDown, ChevronUp, Layers, Tag, Search, ArrowRight
} from 'lucide-react';
import { Purchase, PurchaseItem, Category, Product, PURCHASE_TYPE_LABELS } from '../types';
import { formatBrandDisplay } from '../utils/brand';
import { getApiUrl } from '../utils/apiConfig';

interface ReportsProps {
  purchases: Purchase[];
  purchaseItems: Record<string, PurchaseItem[]>;
  products: Product[];
  categories: Category[];
}

interface GeminiInsights {
  summary: string;
  savingTips: string[];
  categoryWarnings: string[];
  healthyAlternativeRecipe: string;
}

type ReportSubTab = 'overview' | 'price-tracker' | 'markets' | 'ai-insights';

export function Reports({ purchases, purchaseItems, products, categories }: ReportsProps) {
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, completed, inProgress
  const [selectedCategoryExpand, setSelectedCategoryExpand] = useState<string | null>(null);
  
  // Price tracker product selection
  const [selectedTrackerProductId, setSelectedTrackerProductId] = useState<string>(
    products.length > 0 ? products[0].id : ''
  );
  const [trackerSearch, setTrackerSearch] = useState('');

  // AI Insights states
  const [insights, setInsights] = useState<GeminiInsights | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper to extract periods (YYYY-MM)
  const periodOptions = useMemo(() => {
    const periodsSet = new Set<string>();
    purchases.forEach((p) => {
      try {
        const date = new Date(p.date);
        if (!isNaN(date.getTime())) {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          periodsSet.add(`${year}-${month}`);
        }
      } catch (err) {}
    });
    return Array.from(periodsSet).sort().reverse();
  }, [purchases]);

  const formatPeriodLabel = (p: string) => {
    if (p === 'all') return 'Todos os períodos';
    if (p === 'last30') return 'Últimos 30 dias';
    if (p === 'last90') return 'Últimos 3 meses';
    if (p === 'thisYear') return 'Este ano';
    const [year, month] = p.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${months[mIdx] || month} de ${year}`;
  };

  // Filter purchases according to selected period and status
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      // Status filter
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // Period filter
      if (selectedPeriod === 'all') return true;

      const pDate = new Date(p.date);
      if (isNaN(pDate.getTime())) return true;

      if (selectedPeriod === 'last30') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return pDate >= thirtyDaysAgo;
      }

      if (selectedPeriod === 'last90') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return pDate >= ninetyDaysAgo;
      }

      if (selectedPeriod === 'thisYear') {
        return pDate.getFullYear() === now.getFullYear();
      }

      const month = String(pDate.getMonth() + 1).padStart(2, '0');
      const year = pDate.getFullYear();
      return `${year}-${month}` === selectedPeriod;
    });
  }, [purchases, selectedPeriod, selectedStatus]);

  // Aggregated KPIs
  const totalSpent = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  }, [filteredPurchases]);

  const averageTicket = useMemo(() => {
    return filteredPurchases.length > 0 ? totalSpent / filteredPurchases.length : 0;
  }, [filteredPurchases, totalSpent]);

  const totalItemsCount = useMemo(() => {
    let count = 0;
    filteredPurchases.forEach((p) => {
      const items = purchaseItems[p.id] || [];
      items.forEach(it => {
        if (it.isChecked) {
          count += it.quantity;
        }
      });
    });
    return count;
  }, [filteredPurchases, purchaseItems]);

  const largestPurchase = useMemo(() => {
    if (filteredPurchases.length === 0) return null;
    return [...filteredPurchases].sort((a, b) => b.total - a.total)[0];
  }, [filteredPurchases]);

  // Aggregated Category and Product spending
  const { sortedCategories, sortedProducts, marketSpending, categoryItemsMap } = useMemo(() => {
    const catMap: Record<string, { name: string; total: number; count: number }> = {};
    const prodMap: Record<string, { name: string; total: number; unit: string; brand: string; quantity: number }> = {};
    const marketMap: Record<string, { total: number; count: number }> = {};
    const catItemsMap: Record<string, { name: string; total: number; quantity: number; unit: string }[]> = {};

    filteredPurchases.forEach((p) => {
      // Market
      const mName = p.market.trim() || 'Não especificado';
      if (!marketMap[mName]) {
        marketMap[mName] = { total: 0, count: 0 };
      }
      marketMap[mName].total += p.total;
      marketMap[mName].count += 1;

      // Items
      const items = purchaseItems[p.id] || [];
      items.forEach((item) => {
        if (!item.isChecked) return;
        const lineTotal = item.quantity * item.unitPrice;
        
        // Category
        const catKey = item.categoryId || 'sem_categoria';
        if (!catMap[catKey]) {
          const match = categories.find(c => c.id === item.categoryId);
          catMap[catKey] = {
            name: match ? match.name : (item.categoryName || 'Outros'),
            total: 0,
            count: 0
          };
          catItemsMap[catKey] = [];
        }
        catMap[catKey].total += lineTotal;
        catMap[catKey].count += 1;

        // Group item inside category
        const existingCatItem = catItemsMap[catKey].find(i => i.name === item.productName);
        if (existingCatItem) {
          existingCatItem.total += lineTotal;
          existingCatItem.quantity += item.quantity;
        } else {
          catItemsMap[catKey].push({
            name: item.productName,
            total: lineTotal,
            quantity: item.quantity,
            unit: item.unit
          });
        }

        // Product
        const pKey = item.productId || item.productName;
        if (!prodMap[pKey]) {
          prodMap[pKey] = {
            name: item.productName,
            total: 0,
            unit: item.unit,
            brand: item.productBrand || '',
            quantity: 0
          };
        }
        prodMap[pKey].total += lineTotal;
        prodMap[pKey].quantity += item.quantity;
      });
    });

    const sCategories = Object.entries(catMap)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.total - a.total);

    const sProducts = Object.entries(prodMap)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.total - a.total);

    const sMarkets = Object.entries(marketMap)
      .map(([name, info]) => ({ name, total: info.total, count: info.count, avgTicket: info.count > 0 ? info.total / info.count : 0 }))
      .sort((a, b) => b.total - a.total);

    return {
      sortedCategories: sCategories,
      sortedProducts: sProducts,
      marketSpending: sMarkets,
      categoryItemsMap: catItemsMap
    };
  }, [filteredPurchases, purchaseItems, categories]);

  // Price Evolution Analysis for the selected tracker product
  const trackerHistory = useMemo(() => {
    if (!selectedTrackerProductId) return [];
    
    const history: {
      date: string;
      market: string;
      purchaseName: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }[] = [];

    purchases.forEach((p) => {
      const items = purchaseItems[p.id] || [];
      const match = items.find(it => it.productId === selectedTrackerProductId);
      if (match && match.unitPrice > 0) {
        history.push({
          date: p.date,
          market: p.market,
          purchaseName: p.name,
          unitPrice: match.unitPrice,
          quantity: match.quantity,
          total: match.quantity * match.unitPrice
        });
      }
    });

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedTrackerProductId, purchases, purchaseItems]);

  const trackerProduct = products.find(p => p.id === selectedTrackerProductId);

  const trackerStats = useMemo(() => {
    if (trackerHistory.length === 0) return null;
    const prices = trackerHistory.map(h => h.unitPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
    const lowestMatch = trackerHistory.find(h => h.unitPrice === minPrice);
    const highestMatch = trackerHistory.find(h => h.unitPrice === maxPrice);
    const potentialSaving = maxPrice - minPrice;

    return {
      minPrice,
      maxPrice,
      avgPrice,
      lowestMarket: lowestMatch?.market || 'N/A',
      highestMarket: highestMatch?.market || 'N/A',
      potentialSaving
    };
  }, [trackerHistory]);

  // Export report as CSV
  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Data;Nome da Compra;Supermercado;Tipo;Status;Total (R$);Itens Comprados\n';

    filteredPurchases.forEach((p) => {
      const items = purchaseItems[p.id] || [];
      const itemsText = items.map(it => `${it.productName} (${it.quantity} ${it.unit} x R$ ${it.unitPrice.toFixed(2)})`).join(' | ');
      const cleanName = (p.name || '').replace(/;/g, ' ');
      const cleanMarket = (p.market || '').replace(/;/g, ' ');
      const dateFormatted = p.date.substring(0, 10);
      const statusText = p.status === 'completed' ? 'Finalizada' : 'Em andamento';
      const typeText = PURCHASE_TYPE_LABELS[p.type] || p.type;
      
      csvContent += `${dateFormatted};"${cleanName}";"${cleanMarket}";"${typeText}";"${statusText}";${p.total.toFixed(2)};"${itemsText}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_compras_${selectedPeriod}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Gemini Insights Request
  const handleRequestInsights = async () => {
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const simplifiedHistory = purchases.slice(0, 12).map((p) => {
        const items = purchaseItems[p.id] || [];
        return {
          market: p.market,
          date: p.date.substring(0, 10),
          total: p.total,
          items: items.map(i => ({
            name: i.productName,
            brand: i.productBrand,
            qty: i.quantity,
            price: i.unitPrice,
            total: Number((i.quantity * i.unitPrice).toFixed(2))
          }))
        };
      });

      const response = await fetch(getApiUrl('/api/gemini/expense-insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoppingHistory: simplifiedHistory })
      });

      if (!response.ok) {
        throw new Error('Erro ao processar análise do orçamento com Gemini.');
      }

      const data = await response.json();
      setInsights(data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Houve um problema ao consultar o assistente de inteligência artificial.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 flex items-center gap-2">
            <BarChart3 className="text-sky-500" />
            Análise Financeira & Relatórios de Gastos
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Histórico completo, comparativo de concorrência e rastreamento de inflação dos produtos.
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          >
            <option value="all">Todos os períodos</option>
            <option value="last30">Últimos 30 dias</option>
            <option value="last90">Últimos 3 meses</option>
            <option value="thisYear">Este ano</option>
            <optgroup label="Meses Específicos">
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          >
            <option value="all">Todos</option>
            <option value="completed">Apenas Finalizadas</option>
            <option value="inProgress">Em Andamento</option>
          </select>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 bg-white rounded-3xl border border-dashed border-neutral-200">
          <PieChart size={42} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-sm font-bold text-neutral-600">Nenhum dado disponível para análise.</p>
          <p className="text-xs text-neutral-400 mt-1">Registre suas compras e finalize suas idas à feira para gerar relatórios detalhados!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spent */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-neutral-400 uppercase font-black">Investimento Total</span>
                <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <DollarSign size={16} />
                </span>
              </div>
              <span className="text-2xl font-black text-sky-600 block">
                {formatCurrency(totalSpent)}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                {filteredPurchases.length} compra(s) selecionada(s)
              </p>
            </div>

            {/* Average Ticket */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-neutral-400 uppercase font-black">Ticket Médio</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingBag size={16} />
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-600 block">
                {formatCurrency(averageTicket)}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">Gasto médio por ida ao mercado</p>
            </div>

            {/* Total Units / Items */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-neutral-400 uppercase font-black">Itens Adquiridos</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Layers size={16} />
                </span>
              </div>
              <span className="text-2xl font-black text-indigo-600 block">
                {Number(totalItemsCount.toFixed(1))}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">Soma de unidades/kg no carrinho</p>
            </div>

            {/* Largest Purchase */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-neutral-400 uppercase font-black">Maior Compra</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Store size={16} />
                </span>
              </div>
              <span className="text-xl font-black text-neutral-900 block truncate">
                {largestPurchase ? formatCurrency(largestPurchase.total) : 'R$ 0,00'}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1 truncate">
                {largestPurchase ? `${largestPurchase.market} (${largestPurchase.date.substring(0, 10)})` : 'Sem registros'}
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === 'overview'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <PieChart size={14} />
              Visão Geral & Setores
            </button>

            <button
              onClick={() => setActiveSubTab('price-tracker')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === 'price-tracker'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <ArrowUpDown size={14} />
              Comparativo & Rastreio de Preços
            </button>

            <button
              onClick={() => setActiveSubTab('markets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === 'markets'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Store size={14} />
              Supermercados & Concorrência
            </button>

            <button
              onClick={() => setActiveSubTab('ai-insights')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === 'ai-insights'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Sparkles size={14} />
              Consultoria Financeira IA 🪄
            </button>
          </div>

          {/* TAB 1: VISÃO GERAL & SETORES */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category breakdown with interactive expand */}
                <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                      <PieChart size={16} className="text-sky-500" />
                      Despesas por Categoria / Setor
                    </h3>
                    <span className="text-[10px] text-neutral-400">Clique para ver itens</span>
                  </div>

                  {sortedCategories.length > 0 ? (
                    <div className="space-y-3">
                      {sortedCategories.map((cat) => {
                        const pct = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0;
                        const isExpanded = selectedCategoryExpand === cat.id;
                        const itemsInCat = categoryItemsMap[cat.id] || [];

                        return (
                          <div 
                            key={cat.id} 
                            className="p-3 rounded-2xl border border-neutral-100 hover:border-neutral-200 transition-all bg-neutral-50/70"
                          >
                            <div 
                              onClick={() => setSelectedCategoryExpand(isExpanded ? null : cat.id)}
                              className="cursor-pointer space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                                  {cat.name}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </span>
                                <span className="font-black text-neutral-800">
                                  {formatCurrency(cat.total)} ({pct}%)
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="h-2 w-full bg-neutral-200/60 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            {/* Expanded items list */}
                            {isExpanded && itemsInCat.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-neutral-200/60 space-y-1.5 text-xs">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Itens comprados no setor:</span>
                                {itemsInCat.map((it, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-neutral-600 py-0.5">
                                    <span>{it.name} ({it.quantity} {it.unit})</span>
                                    <span className="font-bold text-neutral-900">{formatCurrency(it.total)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Nenhum item adicionado às compras para categorizar.</p>
                  )}
                </div>

                {/* Top 8 Highest Cost Products */}
                <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                    <TrendingUp size={16} className="text-sky-500" />
                    Top Produtos com Maior Impacto no Orçamento
                  </h3>

                  {sortedProducts.length > 0 ? (
                    <div className="divide-y divide-neutral-100">
                      {sortedProducts.slice(0, 8).map((prod, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-neutral-900 truncate block">
                                {prod.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                <span>{prod.quantity} {prod.unit} acumulados</span>
                                {formatBrandDisplay(prod.brand) ? <span>• Marca: {formatBrandDisplay(prod.brand)}</span> : null}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="font-black text-xs text-neutral-900 block">
                              {formatCurrency(prod.total)}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {totalSpent > 0 ? Math.round((prod.total / totalSpent) * 100) : 0}% do total
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Nenhum produto listado para ranquear.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPARATIVO & RASTREIO DE PREÇOS */}
          {activeSubTab === 'price-tracker' && (
            <div className="space-y-6">
              {/* Product selector card */}
              <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                      <ArrowUpDown size={16} className="text-sky-500" />
                      Rastreador de Histórico de Preço por Produto
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Veja a evolução de preços pagos, o supermercado mais barato e a inflação registrada.
                    </p>
                  </div>

                  <div className="w-full md:w-80">
                    <select
                      value={selectedTrackerProductId}
                      onChange={(e) => setSelectedTrackerProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Selecione um produto do catálogo...</option>
                      {[...products]
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit}) {formatBrandDisplay(p.brand) ? `- ${formatBrandDisplay(p.brand)}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Tracker Stats Cards */}
                {trackerProduct && trackerStats ? (
                  <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Lowest price */}
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                          <TrendingDown size={12} />
                          Menor Preço Encontrado
                        </span>
                        <span className="text-xl font-black text-emerald-800 block">
                          {formatCurrency(trackerStats.minPrice)}
                        </span>
                        <p className="text-[10px] text-emerald-700 truncate">
                          No supermercado: <strong>{trackerStats.lowestMarket}</strong>
                        </p>
                      </div>

                      {/* Highest price */}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                          <TrendingUp size={12} />
                          Maior Preço Registrado
                        </span>
                        <span className="text-xl font-black text-amber-800 block">
                          {formatCurrency(trackerStats.maxPrice)}
                        </span>
                        <p className="text-[10px] text-amber-700 truncate">
                          No supermercado: <strong>{trackerStats.highestMarket}</strong>
                        </p>
                      </div>

                      {/* Average price */}
                      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-sky-700">
                          Preço Médio Pago
                        </span>
                        <span className="text-xl font-black text-sky-800 block">
                          {formatCurrency(trackerStats.avgPrice)}
                        </span>
                        <p className="text-[10px] text-sky-700">
                          Em {trackerHistory.length} compra(s) registradas
                        </p>
                      </div>

                      {/* Potential Savings */}
                      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-700">
                          Variação / Economia Máxima
                        </span>
                        <span className="text-xl font-black text-indigo-800 block">
                          {formatCurrency(trackerStats.potentialSaving)}
                        </span>
                        <p className="text-[10px] text-indigo-700">
                          Diferença entre o mais caro e o mais barato
                        </p>
                      </div>
                    </div>

                    {/* Timeline of all purchases with this product */}
                    <div className="border-t border-neutral-100 pt-4 space-y-3">
                      <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-wider">
                        Histórico Cronológico de Compras ({trackerProduct.name})
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-400">
                              <th className="py-2">Data</th>
                              <th className="py-2">Sessão / Lista</th>
                              <th className="py-2">Supermercado</th>
                              <th className="py-2 text-right">Qtd</th>
                              <th className="py-2 text-right">Preço Unitário</th>
                              <th className="py-2 text-right">Total Pago</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {trackerHistory.map((h, idx) => {
                              const isMin = h.unitPrice === trackerStats.minPrice;
                              const isMax = h.unitPrice === trackerStats.maxPrice;
                              return (
                                <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                                  <td className="py-2.5 font-medium text-neutral-600">
                                    {h.date.substring(0, 10)}
                                  </td>
                                  <td className="py-2.5 font-bold text-neutral-900">
                                    {h.purchaseName}
                                  </td>
                                  <td className="py-2.5 font-semibold text-neutral-700">
                                    {h.market}
                                  </td>
                                  <td className="py-2.5 text-right font-medium text-neutral-600">
                                    {h.quantity} {trackerProduct.unit}
                                  </td>
                                  <td className="py-2.5 text-right font-extrabold">
                                    <span className={`px-2 py-0.5 rounded-full ${
                                      isMin 
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isMax 
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'text-neutral-900'
                                    }`}>
                                      {formatCurrency(h.unitPrice)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-black text-neutral-900">
                                    {formatCurrency(h.total)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-2xl">
                    <p className="text-xs font-semibold text-neutral-600">
                      Nenhum registro de compra encontrado com este produto ou produto não selecionado.
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Adicione itens nas suas listas de compras para construir o histórico de preços.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUPERMERCADOS & CONCORRÊNCIA */}
          {activeSubTab === 'markets' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                  <Store size={16} className="text-sky-500" />
                  Comparativo de Gastos por Estabelecimento Comercial
                </h3>
                <p className="text-xs text-neutral-400">
                  Descubra onde seu orçamento mais se concentra e qual mercado possui o maior ticket médio.
                </p>

                {marketSpending.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {marketSpending.map((m) => {
                      const pct = totalSpent > 0 ? Math.round((m.total / totalSpent) * 100) : 0;
                      return (
                        <div 
                          key={m.name} 
                          className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-neutral-900 truncate flex items-center gap-1.5">
                              <Store size={14} className="text-sky-500 shrink-0" />
                              {m.name}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                              {pct}% do total
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-400">Total investido:</span>
                              <span className="font-black text-emerald-600">{formatCurrency(m.total)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-400">Idas ao mercado:</span>
                              <span className="font-bold text-neutral-700">{m.count} compra(s)</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-400">Ticket médio:</span>
                              <span className="font-bold text-neutral-700">{formatCurrency(m.avgTicket)}</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">Sem supermercados cadastrados no período selecionado.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CONSULTORIA FINANCEIRA IA (GEMINI) */}
          {activeSubTab === 'ai-insights' && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-sky-50/80 p-6 rounded-3xl border border-indigo-100 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-indigo-950 flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-500 animate-pulse" />
                    Consultoria de Economia Inteligente (Gemini IA) 🪄
                  </h3>
                  <p className="text-xs text-indigo-800 leading-relaxed max-w-xl">
                    A inteligência artificial analisa todo o seu histórico de listas de compras reais para dar conselhos de economia personalizados, alertar sobre preços elevados e propor substituições financeiras saudáveis.
                  </p>
                </div>

                <button
                  onClick={handleRequestInsights}
                  disabled={analyzing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Analisando Orçamento...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Consultar IA de Gastos
                    </>
                  )}
                </button>
              </div>

              {analysisError && (
                <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs font-semibold">
                  <AlertCircle size={16} />
                  <span>{analysisError}</span>
                </div>
              )}

              {insights && (
                <div className="bg-white p-6 rounded-3xl border border-indigo-100/60 space-y-5 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Resumo Executivo da Feira
                    </span>
                    <p className="text-xs text-neutral-700 mt-2 leading-relaxed font-medium">
                      {insights.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-100 pt-4">
                    {/* Tips */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                        <TrendingDown size={14} />
                        Oportunidades de Economia Prática
                      </span>
                      <ul className="space-y-2">
                        {insights.savingTips.map((tip, idx) => (
                          <li key={idx} className="text-xs text-neutral-600 flex items-start gap-2 leading-relaxed bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Warnings */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5">
                        <AlertCircle size={14} />
                        Alertas de Preço & Substituições
                      </span>
                      <ul className="space-y-2">
                        {insights.categoryWarnings.map((warn, idx) => (
                          <li key={idx} className="text-xs text-neutral-600 flex items-start gap-2 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60 space-y-1">
                    <span className="text-[9px] font-black uppercase text-indigo-600 flex items-center gap-1">
                      <Sparkles size={11} />
                      Sugestão de Receita Saudável de Baixo Custo
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                      {insights.healthyAlternativeRecipe}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
