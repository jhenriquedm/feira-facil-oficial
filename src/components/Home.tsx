import React from 'react';
import { ShoppingBag, ArrowRight, Activity, Calendar, Award, Database, RefreshCw, LogIn, ShoppingCart, Sparkles, Receipt } from 'lucide-react';
import { Purchase, Product, Category } from '../types';

interface HomeProps {
  user: any;
  categories: Category[];
  products: Product[];
  purchases: Purchase[];
  onNavigate: (tab: string, purchaseId?: string) => void;
  loginWithGoogle: () => void;
  isOnline: boolean;
}

export function Home({ user, categories, products, purchases, onNavigate, loginWithGoogle, isOnline }: HomeProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Compute stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthPurchases = purchases.filter(p => {
    const pDate = new Date(p.date);
    return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
  });

  const currentMonthTotal = currentMonthPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const inProgressPurchases = purchases.filter(p => p.status === 'inProgress');
  
  // Find latest purchase
  const sortedByDate = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestPurchase = sortedByDate[0];

  const averageTicket = currentMonthPurchases.length > 0 ? currentMonthTotal / currentMonthPurchases.length : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm">
        <div>
          <span className="text-[11px] font-black text-sky-600 uppercase tracking-wider">Painel de Controle</span>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
            Olá, {user ? user.displayName?.split(' ')[0] : 'Visitante'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Seu assistente inteligente de compras e economia no supermercado.
          </p>
        </div>

        {/* Highlighted current month spend */}
        <div className="bg-sky-50/80 px-5 sm:px-6 py-4 rounded-2xl border border-sky-100 flex flex-col justify-center">
          <span className="text-[11px] text-sky-700 font-bold uppercase tracking-wider">Total Gasto este Mês</span>
          <span className="text-2xl sm:text-3xl font-black text-sky-700 mt-0.5">
            {formatCurrency(currentMonthTotal)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 font-medium">
            Baseado em {currentMonthPurchases.length} {currentMonthPurchases.length === 1 ? 'compra' : 'compras'}
          </span>
        </div>
      </div>

      {/* Sync Banner / Alert */}
      {!user && (
        <div className="bg-amber-50 p-4 sm:p-5 rounded-3xl border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
              <Database size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900">Modo Local Ativo</h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Suas compras estão salvas no navegador. Conecte sua conta Google para sincronizar em tempo real com a nuvem!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
          >
            <LogIn size={15} />
            <span>Fazer Login com Google</span>
          </button>
        </div>
      )}

      {/* Grid of stats with Quick Access Navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Produtos Card */}
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col justify-between text-left hover:border-sky-500 hover:shadow-md transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-neutral-400 group-hover:text-sky-600 uppercase tracking-wider transition-colors">Produtos</span>
            <span className="p-1 bg-neutral-100 group-hover:bg-sky-50 group-hover:text-sky-600 text-neutral-600 rounded-lg text-[10px] font-bold px-2 flex items-center gap-1 transition-colors">
              Ver todos <ArrowRight size={10} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 group-hover:text-sky-600 transition-colors">{products.length}</span>
            <p className="text-[11px] text-neutral-400 mt-0.5">Cadastrados no catálogo</p>
          </div>
        </button>

        {/* Categorias Card */}
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col justify-between text-left hover:border-sky-500 hover:shadow-md transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-neutral-400 group-hover:text-sky-600 uppercase tracking-wider transition-colors">Categorias</span>
            <span className="p-1 bg-neutral-100 group-hover:bg-sky-50 group-hover:text-sky-600 text-neutral-600 rounded-lg text-[10px] font-bold px-2 flex items-center gap-1 transition-colors">
              Setores <ArrowRight size={10} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 group-hover:text-sky-600 transition-colors">{categories.length}</span>
            <p className="text-[11px] text-neutral-400 mt-0.5">Corredores e seções</p>
          </div>
        </button>

        {/* Em Andamento Card */}
        <button
          type="button"
          onClick={() => onNavigate('purchases')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col justify-between text-left hover:border-amber-500 hover:shadow-md transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-neutral-400 group-hover:text-amber-600 uppercase tracking-wider transition-colors">Em Andamento</span>
            <span className="p-1 bg-amber-50 group-hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold px-2 flex items-center gap-1 transition-colors">
              Acessar <ArrowRight size={10} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900 group-hover:text-amber-600 transition-colors">{inProgressPurchases.length}</span>
            <p className="text-[11px] text-neutral-400 mt-0.5">Carrinhos abertos</p>
          </div>
        </button>

        {/* Ticket Médio Card */}
        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col justify-between text-left hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold text-neutral-400 group-hover:text-emerald-600 uppercase tracking-wider transition-colors">Ticket Médio</span>
            <span className="p-1 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold px-2 flex items-center gap-1 transition-colors">
              Relatórios <ArrowRight size={10} />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-neutral-900 group-hover:text-emerald-600 transition-colors">{formatCurrency(averageTicket)}</span>
            <p className="text-[11px] text-neutral-400 mt-0.5">Por ida ao mercado</p>
          </div>
        </button>
      </div>

      {/* Latest Purchase section */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm">
        <h3 className="font-black text-base text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-sky-600" />
          Última Compra Registrada
        </h3>

        {latestPurchase ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  latestPurchase.status === 'completed' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {latestPurchase.status === 'completed' ? 'Finalizada' : 'Em Andamento'}
                </span>
                <span className="text-xs text-neutral-500 font-semibold">
                  {new Date(latestPurchase.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className="font-black text-lg text-neutral-900 mt-1">{latestPurchase.name}</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Supermercado: <strong className="text-neutral-800">{latestPurchase.market}</strong></p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Valor Total</span>
                <span className="text-xl font-black text-neutral-900">
                  {formatCurrency(latestPurchase.total)}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => onNavigate('purchases', latestPurchase.id)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"
              >
                <span>Abrir</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
            <ShoppingBag size={32} className="mx-auto text-neutral-300 mb-2" />
            <p className="text-sm font-bold text-neutral-700">Nenhuma compra cadastrada ainda.</p>
            <p className="text-xs text-neutral-400 mt-1">Crie sua primeira lista de compras ou carregue os dados de demonstração!</p>
            <button 
              type="button"
              onClick={() => onNavigate('purchases')}
              className="mt-4 inline-flex items-center gap-1 text-xs font-black text-sky-600 hover:underline"
            >
              <span>Ir para Minhas Compras</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Quick navigation links */}
      <div>
        <h3 className="font-black text-base text-neutral-900 mb-3">Acesso Rápido</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button 
            type="button"
            onClick={() => onNavigate('purchases')}
            className="p-4 bg-white rounded-2xl border border-neutral-200/90 hover:border-emerald-500 hover:shadow-sm transition-all text-left flex items-start gap-3.5 group"
          >
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <Receipt size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-black text-sm text-neutral-900">Leitor OCR de Cupom</h4>
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full uppercase">IA</span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">Tire foto da nota fiscal para importar todos os itens e preços.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => onNavigate('purchases')}
            className="p-4 bg-white rounded-2xl border border-neutral-200/90 hover:border-sky-500 hover:shadow-sm transition-all text-left flex items-start gap-3.5 group"
          >
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-105 transition-transform">
              <ShoppingCart size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-neutral-900">Listas & Feira Mensal</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Crie listas, compare orçamentos e acompanhe o carrinho.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => onNavigate('products')}
            className="p-4 bg-white rounded-2xl border border-neutral-200/90 hover:border-sky-500 hover:shadow-sm transition-all text-left flex items-start gap-3.5 group"
          >
            <div className="p-3 bg-neutral-100 text-neutral-700 rounded-xl group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-neutral-900">Produtos & Catálogo</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Cadastre itens com códigos de barras e preços médios.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-4 bg-white rounded-2xl border border-neutral-200/90 hover:border-purple-500 hover:shadow-sm transition-all text-left flex items-start gap-3.5 group"
          >
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
              <Activity size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-neutral-900">Análise de Gastos</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Gráficos de despesas por categoria e evolução mensal.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
