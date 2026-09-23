import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, ShoppingBasket, ShoppingBag, BarChart3, Sliders, Menu, X, RefreshCw, AlertCircle, User as UserIcon
} from 'lucide-react';
import { useShoppingData } from './useShoppingData';
import { AppLogo } from './components/AppLogo';

// Modular views
import { Home } from './components/Home';
import { Products } from './components/Products';
import { Purchases } from './components/Purchases';
import { Reports } from './components/Reports';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { AuthGate } from './components/AuthGate';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const data = useShoppingData();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync primary theme color to CSS variable
  useEffect(() => {
    if (data.themeColor) {
      document.documentElement.style.setProperty('--theme-primary', data.themeColor);
    }
  }, [data.themeColor]);

  // Initialize native GoogleAuth on native platforms
  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
          GoogleAuth.initialize({
            clientId: '901690992750-jbuc5p2bebr2940uaorqtn5qcp72q6cp.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: false,
          }).catch((e) => console.warn('Native GoogleAuth pre-init warn:', e));
        });
      }
    }).catch((err) => console.warn('Capacitor detection warn:', err));
  }, []);

  // Custom tab switching with purchaseId parameters
  const handleNavigate = (tab: string, purchaseId?: string) => {
    setActiveTab(tab);
    if (purchaseId) {
      setSelectedPurchaseId(purchaseId);
    } else {
      setSelectedPurchaseId(null);
    }
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Início', icon: HomeIcon },
    { id: 'products', label: 'Produtos', icon: ShoppingBasket },
    { id: 'purchases', label: 'Minhas Compras', icon: ShoppingBag },
    { id: 'reports', label: 'Análise de Gastos', icon: BarChart3 },
    { id: 'settings', label: 'Ajustes', icon: Sliders },
  ];

  if (data.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-neutral-600">
        <AppLogo size={56} className="mb-4 animate-bounce" />
        <RefreshCw size={24} className="animate-spin text-sky-500 mb-2" />
        <p className="text-sm font-black text-neutral-800 tracking-tight">Carregando Feira Fácil...</p>
      </div>
    );
  }

  // RN-AUT-001: Access requires authenticated user. AuthGate intercepts non-logged users.
  if (!data.user) {
    return (
      <AuthGate
        loginWithEmail={data.loginWithEmail}
        registerWithEmail={data.registerWithEmail}
        findUserForRecovery={data.findUserForRecovery}
        resetPasswordDirect={data.resetPasswordDirect}
        loginWithGoogle={data.loginWithGoogle}
        isOnline={data.isOnline}
      />
    );
  }

  const userAvatarUrl = data.userProfile?.photoURL || ('photoURL' in data.user ? data.user.photoURL : undefined);
  const userDisplayName = data.userProfile?.name || data.user.displayName || 'Usuário';

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans selection:bg-sky-500/20">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onClick={() => handleNavigate('home')} 
            className="cursor-pointer select-none"
          >
            <AppLogo size={36} showText={true} />
          </div>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/15'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/80'
                  }`}
                  style={isActive ? { backgroundColor: data.themeColor } : undefined}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right section info: Online badge, PWA button and Avatar shortcut */}
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <PWAInstallButton variant="header" />
            
            <div className="hidden sm:flex items-center">
              {data.isOnline ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/70 text-[11px]">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200/70 text-[11px]">
                  <AlertCircle size={12} />
                  Modo Offline
                </span>
              )}
            </div>

            {/* Quick Profile Avatar Shortcut */}
            <button
              onClick={() => handleNavigate('profile')}
              className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl border transition-all active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
                  : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700 shadow-xs'
              }`}
              title="Ir para Meu Perfil"
            >
              <div className="h-7 w-7 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-xs">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  userDisplayName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-bold hidden sm:inline max-w-[90px] truncate">
                {userDisplayName}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden hover:bg-neutral-100 rounded-xl text-neutral-600 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-16 z-30 bg-white border-b border-neutral-200 px-4 py-3 space-y-1 shadow-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
                style={isActive ? { backgroundColor: data.themeColor } : undefined}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-32 md:pb-20">
        {activeTab === 'home' && (
          <Home
            user={data.user}
            categories={data.categories}
            products={data.products}
            purchases={data.purchases}
            onNavigate={handleNavigate}
            loginWithGoogle={data.loginWithGoogle}
            isOnline={data.isOnline}
          />
        )}

        {activeTab === 'products' && (
          <Products
            categories={data.categories}
            products={data.products}
            addCategory={data.addCategory}
            updateCategory={data.updateCategory}
            deleteCategory={data.deleteCategory}
            addProduct={data.addProduct}
            updateProduct={data.updateProduct}
            deleteProduct={data.deleteProduct}
            purchases={data.purchases}
            purchaseItems={data.purchaseItems}
          />
        )}

        {activeTab === 'purchases' && (
          <Purchases
            purchases={data.purchases}
            purchaseItems={data.purchaseItems}
            products={data.products}
            categories={data.categories}
            addPurchase={data.addPurchase}
            updatePurchase={data.updatePurchase}
            deletePurchase={data.deletePurchase}
            duplicatePurchase={data.duplicatePurchase}
            addPurchaseItem={data.addPurchaseItem}
            updatePurchaseItem={data.updatePurchaseItem}
            deletePurchaseItem={data.deletePurchaseItem}
            toggleItemChecked={data.toggleItemChecked}
            toggleAllItemsChecked={data.toggleAllItemsChecked}
            completePurchase={data.completePurchase}
            reopenPurchase={data.reopenPurchase}
            selectedPurchaseIdFromHome={selectedPurchaseId}
            onClearSelectedPurchaseId={() => setSelectedPurchaseId(null)}
            addProduct={data.addProduct}
          />
        )}

        {activeTab === 'reports' && (
          <Reports
            purchases={data.purchases}
            purchaseItems={data.purchaseItems}
            products={data.products}
            categories={data.categories}
          />
        )}

        {activeTab === 'profile' && (
          <Profile
            user={data.user}
            userProfile={data.userProfile}
            updateUserProfileData={data.updateUserProfileData}
            changeUserPassword={data.changeUserPassword}
            sendPasswordReset={data.sendPasswordReset}
            sendVerificationEmail={data.sendVerificationEmail}
            logout={data.logout}
            isOnline={data.isOnline}
            purchases={data.purchases}
            products={data.products}
            categories={data.categories}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            user={data.user}
            userProfile={data.userProfile}
            categories={data.categories}
            products={data.products}
            purchases={data.purchases}
            loginWithGoogle={data.loginWithGoogle}
            logout={data.logout}
            seedDefaults={data.seedDefaults}
            syncGuestDataToAccount={data.syncGuestDataToAccount}
            clearAllData={data.clearAllData}
            themeMode={data.themeMode}
            setThemeMode={data.setThemeMode}
            themeColor={data.themeColor}
            setThemeColor={data.setThemeColor}
            isOnline={data.isOnline}
            purchaseItems={data.purchaseItems}
            importBackup={data.importBackup}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-safe">
        <div className="flex justify-around items-center max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[50px] min-h-[44px] ${
                  isActive 
                    ? 'text-sky-600 font-black' 
                    : 'text-neutral-400 hover:text-neutral-700 font-semibold'
                }`}
                style={isActive ? { color: data.themeColor } : undefined}
              >
                <Icon size={19} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
