import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, ShoppingBasket, ShoppingBag, BarChart3, Sliders, Menu, X, RefreshCw, AlertCircle, User as UserIcon, LogOut
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
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

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
    setSideMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Início', icon: HomeIcon },
    { id: 'products', label: 'Produtos', icon: ShoppingBasket },
    { id: 'purchases', label: 'Minhas Compras', icon: ShoppingBag },
    { id: 'reports', label: 'Análise de Gastos', icon: BarChart3 },
    { id: 'profile', label: 'Meu Perfil', icon: UserIcon },
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
          <div className="flex items-center gap-3">
            {/* Hamburger Side Menu Trigger Button */}
            <button
              onClick={() => setSideMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-xl text-neutral-700 transition-all active:scale-95 flex items-center justify-center"
              aria-label="Abrir menu lateral"
            >
              <Menu size={22} />
            </button>

            <div 
              onClick={() => handleNavigate('home')} 
              className="cursor-pointer select-none flex items-center"
            >
              <AppLogo size={36} showText={true} />
            </div>
          </div>

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

            {/* Quick Profile Avatar Shortcut (direct navigation to profile) */}
            <button
              onClick={() => handleNavigate('profile')}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl border transition-all active:scale-95 bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700 shadow-xs"
              title="Ir para o Meu Perfil"
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
          </div>
        </div>
      </header>

      {/* Side-overlay Menu Drawer */}
      <div 
        className={`fixed inset-0 z-50 pointer-events-none transition-all duration-300 ${
          sideMenuOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop overlay */}
        <div 
          onClick={() => setSideMenuOpen(false)}
          className={`absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto ${
            sideMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Sliding menu panel */}
        <aside 
          className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 pointer-events-auto ease-out transform ${
            sideMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Menu Drawer Header */}
          <div className="p-5 border-b border-neutral-150 flex items-center justify-between bg-neutral-50">
            <AppLogo size={30} showText={true} />
            <button
              onClick={() => setSideMenuOpen(false)}
              className="p-1.5 hover:bg-neutral-200 rounded-xl text-neutral-500 transition-colors"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile Summary Card */}
          <div className="p-5 border-b border-neutral-100 flex items-center gap-3.5 bg-sky-50/30">
            <div 
              className="h-12 w-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-lg overflow-hidden border-2 shadow-xs"
              style={{ borderColor: data.themeColor }}
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="Foto de Perfil" className="h-full w-full object-cover" />
              ) : (
                userDisplayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-neutral-900 truncate">{userDisplayName}</h4>
              <p className="text-[11px] text-neutral-400 truncate font-medium">{data.user.email || 'Usuário Autenticado'}</p>
            </div>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
                  }`}
                  style={isActive ? { backgroundColor: data.themeColor } : undefined}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Menu Bottom: Logout button */}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
            <button
              onClick={() => {
                setSideMenuOpen(false);
                data.logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100/80 active:bg-red-100 border border-red-200 text-red-700 rounded-2xl text-xs font-extrabold shadow-sm transition-all active:scale-95"
            >
              <LogOut size={15} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </aside>
      </div>

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
          {navItems.filter(item => item.id !== 'profile').map((item) => {
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
