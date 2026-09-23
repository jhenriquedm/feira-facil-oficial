import React, { useState, useRef } from 'react';
import { 
  Trash2, Sliders, ShieldAlert, Play, Download, Upload, HardDrive, 
  Store, AlertTriangle, CheckCircle2, Info, Smartphone,
  Layers, Package, Check, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Category, Product, Purchase, PurchaseItem, PurchaseType, PURCHASE_TYPE_LABELS } from '../types';
import { APP_VERSION_INFO } from '../version';

interface SettingsProps {
  user: any;
  userProfile?: any;
  categories: Category[];
  products: Product[];
  purchases: Purchase[];
  purchaseItems?: Record<string, PurchaseItem[]>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  seedDefaults: () => Promise<void>;
  syncGuestDataToAccount: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importBackup?: (data: {
    categories?: Category[];
    products?: Product[];
    purchases?: Purchase[];
    purchaseItems?: Record<string, PurchaseItem[]>;
  }) => Promise<void>;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  isOnline: boolean;
  onNavigate?: (tab: string) => void;
}

function formatReleaseDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  if (monthNum >= 1 && monthNum <= 12) {
    return `${day} de ${months[monthNum - 1]} de ${year}`;
  }
  return dateStr;
}

export function Settings({
  user,
  userProfile,
  categories,
  products,
  purchases,
  purchaseItems = {},
  loginWithGoogle,
  logout,
  seedDefaults,
  syncGuestDataToAccount,
  clearAllData,
  importBackup,
  themeMode,
  setThemeMode,
  themeColor,
  setThemeColor,
  isOnline,
  onNavigate
}: SettingsProps) {
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Default app preferences stored in localStorage
  const [defaultMarket, setDefaultMarket] = useState(() => {
    return localStorage.getItem('feira_pref_default_market') || '';
  });
  const [defaultPurchaseType, setDefaultPurchaseType] = useState<PurchaseType>(() => {
    return (localStorage.getItem('feira_pref_default_type') as PurchaseType) || 'monthly';
  });
  const [autoBarcodeScan, setAutoBarcodeScan] = useState(() => {
    return localStorage.getItem('feira_pref_auto_barcode') === 'true';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 3000);
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('feira_pref_default_market', defaultMarket);
    localStorage.setItem('feira_pref_default_type', defaultPurchaseType);
    localStorage.setItem('feira_pref_auto_barcode', String(autoBarcodeScan));
    showNotification('Preferências operacionais salvas com sucesso!');
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDefaults();
      showNotification('Dados de demonstração carregados com sucesso!');
    } catch (err: any) {
      console.error(err);
      showNotification('Erro ao carregar dados de demonstração: ' + (err.message || ''), true);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearConfirm = async () => {
    setClearing(true);
    try {
      await clearAllData();
      setShowClearConfirmModal(false);
      showNotification('Todos os dados foram excluídos e o banco foi resetado.');
    } catch (err: any) {
      console.error(err);
      showNotification('Erro ao redefinir banco de dados.', true);
    } finally {
      setClearing(false);
    }
  };

  // Export full JSON Backup
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: APP_VERSION_INFO.version,
        exportedAt: new Date().toISOString(),
        userEmail: user?.email || 'guest',
        categories,
        products,
        purchases,
        purchaseItems
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download', 
        `gestao_compras_backup_${new Date().toISOString().substring(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      showNotification('Backup completo exportado em arquivo JSON com sucesso!');
    } catch (err: any) {
      console.error(err);
      showNotification('Erro ao gerar arquivo de backup.', true);
    }
  };

  // Import JSON Backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Formato de arquivo JSON inválido.');
      }

      if (importBackup) {
        await importBackup({
          categories: Array.isArray(parsed.categories) ? parsed.categories : undefined,
          products: Array.isArray(parsed.products) ? parsed.products : undefined,
          purchases: Array.isArray(parsed.purchases) ? parsed.purchases : undefined,
          purchaseItems: typeof parsed.purchaseItems === 'object' ? parsed.purchaseItems : undefined
        });
        showNotification(
          `Backup restaurado com sucesso! (${parsed.categories?.length || 0} categorias, ${parsed.products?.length || 0} produtos e ${parsed.purchases?.length || 0} compras).`
        );
      } else {
        throw new Error('Função de importação não está disponível.');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Falha ao restaurar backup: ' + (err.message || 'Arquivo inválido'), true);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 flex items-center gap-2">
          <Sliders className="text-sky-500" />
          Ajustes, Preferências & Configurações
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Gerencie backups, preferências operacionais, dados de demonstração e versão do aplicativo.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle size={18} className="shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: Backup & Exportation */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <HardDrive size={16} className="text-sky-500" />
          Segurança, Backup & Exportação de Dados
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed text-justify">
          Mantenha uma cópia de segurança completa de todas as suas categorias, produtos cadastrados com código de barras, preços e listas de compras.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          {/* Export JSON Card */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-3">
            <div>
              <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                <Download size={14} className="text-sky-500" />
                Exportar Backup (JSON)
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Gera um arquivo completo com todos os dados da sua despensa e histórico.
              </p>
            </div>

            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Download size={13} />
              <span>Baixar Arquivo JSON</span>
            </button>
          </div>

          {/* Import JSON Card */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 space-y-3">
            <div>
              <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                <Upload size={14} className="text-emerald-500" />
                Restaurar Backup (JSON)
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Carrega categorias, produtos e listas a partir de um backup anterior.
              </p>
            </div>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              {importing ? (
                <>
                  <span className="inline-block animate-spin mr-1">⏳</span>
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Selecionar Arquivo Backup</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Operational Preferences */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <Store size={16} className="text-sky-500" />
          Padrões & Preferências de Compras
        </h3>
        <p className="text-xs text-neutral-500">
          Defina valores padrão pré-preenchidos para agilizar a criação de novas sessões de feira.
        </p>

        <form onSubmit={handleSavePreferences} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">
                Supermercado Preferencial Padrão
              </label>
              <input
                type="text"
                placeholder="Ex: Pão de Açúcar, Assaí, Atacadão"
                value={defaultMarket}
                onChange={(e) => setDefaultMarket(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">
                Tipo de Compra Padrão
              </label>
              <select
                value={defaultPurchaseType}
                onChange={(e) => setDefaultPurchaseType(e.target.value as PurchaseType)}
                className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="butcher">Açougue</option>
                <option value="emergency">Emergencial</option>
                <option value="pharmacy">Farmácia</option>
                <option value="monthly">Mensal</option>
                <option value="other">Outros</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pref-auto-barcode"
              checked={autoBarcodeScan}
              onChange={(e) => setAutoBarcodeScan(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="pref-auto-barcode" className="text-xs font-semibold text-neutral-700 cursor-pointer">
              Sugerir leitura de código de barras por padrão ao adicionar novos itens no carrinho
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
            >
              Salvar Preferências
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: Demonstration Seeder */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
          <Play size={16} className="text-sky-500" />
          Dados de Demonstração (Seed)
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed text-justify">
          Carregue uma paleta completa de categorias e produtos pré-configurados de supermercado brasileiro (Hortifruti, Açougue, Laticínios, Mercearia, Limpeza) com unidades de medida e preços de referência para testar o sistema.
        </p>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
        >
          {seeding ? (
            <>
              <span className="inline-block animate-spin mr-1">⏳</span>
              <span>Carregando Demonstração...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Preencher com Dados de Exemplo</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION 4: App Version & Android APK Info */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
            <Package size={16} className="text-sky-500" />
            Informações do Sistema & Versão
          </h3>
          <span className="text-xs font-black px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
            v{APP_VERSION_INFO.version} (Build #{APP_VERSION_INFO.buildNumber})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-200">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">ID do Pacote Android</span>
            <span className="text-xs font-mono font-bold text-neutral-800 block truncate">{APP_VERSION_INFO.packageId}</span>
          </div>

          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-200">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Compatibilidade APK</span>
            <span className="text-xs font-bold text-neutral-800 block">{APP_VERSION_INFO.minAndroidVersion} (SDK {APP_VERSION_INFO.targetSdkVersion})</span>
          </div>

          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-200">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Última Atualização</span>
            <span className="text-xs font-bold text-neutral-800 block">{formatReleaseDate(APP_VERSION_INFO.releaseDate)}</span>
          </div>
        </div>
      </div>

      {/* SECTION 5: Danger Zone */}
      <div className="bg-red-50/50 p-5 sm:p-6 rounded-3xl border border-red-200 space-y-4">
        <h3 className="font-black text-sm text-red-700 flex items-center gap-2">
          <ShieldAlert size={16} />
          Zona de Perigo
        </h3>
        <p className="text-xs text-red-700 leading-relaxed text-justify">
          Exclua permanentemente todos os produtos, categorias e históricos de compras registradas. Se estiver conectado à sua conta na nuvem, isso apagará os registros do Firestore. Esta ação é irreversível!
        </p>

        <button
          onClick={() => setShowClearConfirmModal(true)}
          disabled={clearing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
        >
          <Trash2 size={14} />
          <span>Limpar Todos os Dados Cadastrados</span>
        </button>
      </div>

      {/* Danger Zone Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white max-w-md w-full rounded-3xl p-5 sm:p-6 border border-red-200 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto pb-12 sm:pb-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="font-black text-base text-neutral-900">Excluir Todos os Dados?</h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Você está prestes a apagar <strong>todas as {categories.length} categorias</strong>, <strong>{products.length} produtos cadastrados</strong> e <strong>{purchases.length} listas de compras</strong>.
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800">
              ⚠️ Esta ação não pode ser desfeita. Se desejar guardar seus dados antes de limpar, faça o download de um Backup JSON primeiro.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearConfirm}
                disabled={clearing}
                className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-all"
              >
                {clearing ? 'Excluindo...' : 'Sim, Excluir Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
