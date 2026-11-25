// Modul: Global State, Cache Store, Routes & Konfigurasi Aplikasi
// ========================= GLOBAL STATE & SMART CACHE SISTEM =========================
let TOKEN = getSafeSession('ekasir_token') || null;
let USER_NAME = getSafeSession('ekasir_user') || '';
let USER_ROLE = getSafeSession('ekasir_role') || (String(USER_NAME).toLowerCase() === 'admin' ? 'Admin' : 'Kasir');
let CURRENT_USER = { name: USER_NAME, username: USER_NAME, role: USER_ROLE };
window._currentUser = CURRENT_USER;

let CURRENT_USER_PERMISSIONS = null;
try {
  const cachedPerms = getSafeSession('ekasir_permissions');
  if (cachedPerms) CURRENT_USER_PERMISSIONS = JSON.parse(cachedPerms);
} catch (e) { }

let AVAILABLE_ROLES = ['Admin', 'Koordinator', 'QC', 'Kasir', 'Finance'];
try {
  const cachedRoles = getSafeSession('ekasir_available_roles');
  if (cachedRoles) AVAILABLE_ROLES = JSON.parse(cachedRoles);
} catch (e) { }


let PRODUCTS_CACHE = [];
let CUSTOMERS_CACHE = [];
let SUPPLIERS_CACHE = [];
let FARMERS_CACHE = [];
let PRICE_TIERS_LIST = ['Reguler', 'Outlet', 'Bali Buda'];
let CURRENT_PRICE_TIER = 'Reguler';
let SELECTED_CUSTOMER = null;
let SELECTED_FAKTUR_ID = null;
let EDITING_TRANSACTION = null;
let CART = [];
let APP_SETTINGS = {};
let CURRENT_PRODUCT_TAB = 'all';
let PRODUCT_SEARCH_QUERY = '';
let ACTIVE_REQUESTS_COUNT = 0;
let CURRENT_REPORT_DATA = null;
let CURRENT_REPORT_FILTER = { period: 'month', startDate: '', endDate: '' };
let CURRENT_REPORT_SUBTAB = 'channels';
let CURRENT_LAPORAN_VIEW = 'sales';
let STOCK_VALUATION_DATA = null;
let STOCK_VALUATION_FILTER = { query: '', type: 'all', status: 'all' };
let ACCOUNTING_PERIODS_CACHE = [];
let CURRENT_CLOSING_WIZARD_DATA = null;

const CACHE_TTL_MS = 5 * 60 * 1000;
const DATA_CACHE = {
  dashboard: { data: null, timestamp: 0 },
  products: { data: null, timestamp: 0 },
  purchases: { data: null, timestamp: 0 },
  suppliers: { data: null, timestamp: 0 },
  farmers: { data: null, timestamp: 0 },
  consignments: { data: null, timestamp: 0 },
  outlets: { data: null, timestamp: 0 },
  receivables: { data: null, timestamp: 0 },
  customers: { data: null, timestamp: 0 },
  afterSales: { data: null, timestamp: 0 },
  productions: { data: null, timestamp: 0 },
  qc_records: { data: null, timestamp: 0 },
  settings: { data: null, timestamp: 0 },
  recentInvoices: { data: null, timestamp: 0 },
  batches: { data: null, timestamp: 0 },
  mutations: { data: null, timestamp: 0 }
};

function getCachedData(key) {
  if (DATA_CACHE[key] && DATA_CACHE[key].data !== null) {
    return DATA_CACHE[key].data;
  }
  try {
    const raw = sessionStorage.getItem('pos_cache_' + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data !== undefined) {
        if (!DATA_CACHE[key]) DATA_CACHE[key] = { data: null, timestamp: 0 };
        DATA_CACHE[key].data = parsed.data;
        DATA_CACHE[key].timestamp = parsed.timestamp || 0;
        return parsed.data;
      }
    }
  } catch (e) { }
  return null;
}

function setCachedData(key, data) {
  if (!DATA_CACHE[key]) DATA_CACHE[key] = { data: null, timestamp: 0 };
  const now = Date.now();
  DATA_CACHE[key].data = data;
  DATA_CACHE[key].timestamp = now;
  try {
    sessionStorage.setItem('pos_cache_' + key, JSON.stringify({ data: data, timestamp: now }));
  } catch (e) { }
}

function isCacheValid(key) {
  if (!DATA_CACHE[key] || DATA_CACHE[key].data === null) {
    getCachedData(key);
  }
  const item = DATA_CACHE[key];
  return !!(item && item.data !== null && (Date.now() - item.timestamp < CACHE_TTL_MS));
}

function hasCacheData(key) {
  const data = getCachedData(key);
  if (data === null || data === undefined) return false;
  if (Array.isArray(data)) return data.length > 0;
  return true;
}

function invalidateCache(key) {
  if (key) {
    if (DATA_CACHE[key]) DATA_CACHE[key].timestamp = 0;
    try { sessionStorage.removeItem('pos_cache_' + key); } catch (e) { }
  } else {
    Object.keys(DATA_CACHE).forEach(function (k) {
      if (DATA_CACHE[k]) DATA_CACHE[k].timestamp = 0;
      try { sessionStorage.removeItem('pos_cache_' + k); } catch (e) { }
    });
  }
}

const ACTIVE_ROUTES = [
  'dashboard', 'produk', 'stok', 'produksi', 'qc', 'pembelian',
  'pos', 'konsinyasi', 'piutang', 'crm', 'purnajual', 'purna-jual',
  'laporan', 'pengaturan', 'faktur'
];


const API_WRITE_MODULE_MAP = {
  'saveProduct': 'produk',
  'importBulkProducts': 'produk',
  'saveBundledProducts': 'produk',
  'adjustStockBatch': 'stok',
  'createStockMutation': 'stok',
  'processProduction': 'produksi',
  'saveQCStageWithPhoto': 'qc',
  'startDHTSession': 'qc',
  'completeDHTSession': 'qc',
  'createPurchase': 'pembelian',
  'saveSupplier': 'pembelian',
  'saveFarmer': 'pembelian',
  'createTransaction': 'pos',
  'updateTransaction': 'faktur',
  'saveOutlet': 'konsinyasi',
  'transferStockToOutlet': 'konsinyasi',
  'submitConsignmentAudit': 'konsinyasi',
  'createConsignmentInvoice': 'konsinyasi',
  'confirmDeliveryReceipt': 'konsinyasi',
  'recordReceivablePayment': 'piutang',
  'createExpense': 'expenses',
  'createExpenseCategory': 'expenses',
  'saveCustomer': 'crm',
  'submitAfterSalesClaim': 'purnajual',
  'updateAfterSalesClaimStatus': 'purnajual',
  'saveConsultationLog': 'purnajual',
  'markFollowUpStatus': 'purnajual',
  'saveSettings': 'pengaturan',
  'saveRolePermissions': 'pengaturan',
  'saveUser': 'pengaturan',
  'setupTelegramWebhook': 'pengaturan',
  'testTelegramConnection': 'pengaturan'
};

const API_DELETE_MODULE_MAP = {
  'deleteProduct': 'produk',
  'deleteProduction': 'produksi',
  'deletePurchase': 'pembelian',
  'voidTransaction': 'faktur',
  'deleteTransaction': 'faktur',
  'deleteExpense': 'expenses',
  'deleteExpenseCategory': 'expenses',
  'deleteOutlet': 'konsinyasi',
  'deleteCustomer': 'crm',
  'deleteUser': 'pengaturan',
  'resetTestingData': 'pengaturan'
};


const FALLBACK_PRICE_TIER_PRESETS = [
  { name: 'Reguler', price: 25000, default: true },
  { name: 'Outlet', price: 20000 },
  { name: 'Bali Buda', price: 20300 }
];

function getDefaultPriceTierPresets() {
  if (window.APP_SETTINGS && window.APP_SETTINGS['price_tiers_preset']) {
    try {
      const raw = window.APP_SETTINGS['price_tiers_preset'];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('Gagal parse price_tiers_preset:', e);
    }
  }
  return FALLBACK_PRICE_TIER_PRESETS;
}

