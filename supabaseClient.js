(function () {
/**
 * ==============================================================================
 * E-KASIR v2 (KIOS IDEP) - SUPABASE CLIENT ADAPTER & API BRIDGE
 * ==============================================================================
 * File ini menggantikan seluruh ketergantungan `google.script.run` dengan
 * Supabase SDK (@supabase/supabase-js v2):
 * 1. Koneksi Supabase Client & Konfigurasi Lingkungan
 * 2. Autentikasi Pengguna & Manajemen Sesi (Supabase Auth + profiles table)
 * 3. Supabase Storage: Pengunggahan foto baki semai QC & tanda tangan serah terima
 * 4. PostgREST & RPC Bridge: Implementasi lengkap seluruh fungsi backend
 *    (POS, Pengadaan, Produksi, QC DHT, Konsinyasi, Faktur, Laporan, CRM, Settings)
 * ==============================================================================
 */

// 1. KREDENSIAL KONEKSI SUPABASE
const SUPABASE_CONFIG = {
  url: 'https://xozysfvlhcyjytukisul.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlzZnZsaGN5anl0dWtpc3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDg3MzYsImV4cCI6MjEwNTUyNDczNn0.SNlrOxV3jx3H3pYxu9BAMi1zxsW-cmvty_FZL0-RsdQ'
};
// Inisialisasi Supabase Client dari CDN resmi window.supabase
let supabase = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.warn('[Supabase] Library @supabase/supabase-js belum termuat. Pastikan CDN sudah dipasang di HTML.');
}

// Global state untuk sesi pengguna lokal
window.CURRENT_SESSION = null;
window.CURRENT_USER_PROFILE = null;

// ==============================================================================
// 2. HELPER UTILS (STORAGE & CONVERSIONS)
// ==============================================================================

/**
 * Konversi data URL base64 menjadi Blob murni untuk dikirim ke Supabase Storage
 */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Unggah gambar base64 langsung ke Supabase Storage dan kembalikan URL publiknya
 */
async function uploadToSupabaseStorage(bucketName, fileName, base64Data, contentType = 'image/jpeg') {
  if (!supabase) throw new Error('Supabase client belum terinisialisasi.');
  if (!base64Data) return '';

  const blob = dataURLtoBlob(base64Data);
  const cleanPath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(cleanPath, blob, {
      contentType: contentType,
      upsert: true
    });

  if (error) {
    console.error(`[Storage Upload Error] Bucket: ${bucketName}`, error);
    throw new Error(`Gagal mengunggah berkas ke ${bucketName}: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(cleanPath);

  return publicData.publicUrl;
}

// ==============================================================================
// 3. AUTENTIKASI PENGGUNA & MANAJEMEN ROLE
// ==============================================================================

async function loginSupabaseUser(identifier, password) {
  if (!supabase) throw new Error('Supabase client belum siap.');

  let email = identifier.trim();
  if (!email.includes('@')) {
    email = `${email.toLowerCase()}@idep.local`;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    throw new Error('Username atau kata sandi tidak valid. (' + error.message + ')');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const userProfile = {
    id: data.user.id,
    email: data.user.email,
    username: profile ? profile.username : (data.user.user_metadata?.username || email.split('@')[0]),
    name: profile ? profile.full_name : (data.user.user_metadata?.full_name || 'Staf Kios'),
    role: profile ? profile.role : (data.user.user_metadata?.role || 'Kasir'),
    phone: profile ? profile.phone : ''
  };

  window.CURRENT_SESSION = data.session;
  window.CURRENT_USER_PROFILE = userProfile;

  localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
  localStorage.setItem('idep_pos_token', data.session.access_token);

  return {
    success: true,
    token: data.session.access_token,
    user: userProfile,
    role: userProfile.role,
    name: userProfile.name
  };
}

async function logoutSupabaseUser() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.CURRENT_SESSION = null;
  window.CURRENT_USER_PROFILE = null;
  localStorage.removeItem('idep_pos_user');
  localStorage.removeItem('idep_pos_token');
}

async function checkSupabaseSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const userProfile = {
      id: session.user.id,
      email: session.user.email,
      username: profile ? profile.username : session.user.email.split('@')[0],
      name: profile ? profile.full_name : 'Staf Kios',
      role: profile ? profile.role : 'Kasir',
      phone: profile ? profile.phone : ''
    };

    window.CURRENT_SESSION = session;
    window.CURRENT_USER_PROFILE = userProfile;
    return userProfile;
  }
  return null;
}

// ==============================================================================
// 4. API BRIDGE: IMPLEMENTASI LENGKAP PENGGANTI `api(fnName, ...args)`
// ==============================================================================

async function api(fnName, ...args) {
  if (typeof setProgressLoading === 'function') setProgressLoading(true);

  try {
    const res = await dispatchApiCall(fnName, args);
    if (typeof setProgressLoading === 'function') setProgressLoading(false);
    return res;
  } catch (err) {
    if (typeof setProgressLoading === 'function') setProgressLoading(false);
    const errMsg = err && err.message ? err.message : String(err);
    console.error(`[API Error in ${fnName}]:`, err);
    if (errMsg.includes('UNAUTHORIZED') || errMsg.includes('JWT expired') || errMsg.includes('Invalid Refresh Token')) {
      if (typeof handleLogout === 'function') handleLogout();
      if (typeof showToast === 'function') showToast('Sesi berakhir. Silakan login kembali.', true);
    }
    throw err;
  }
}

/**
 * Router internal utama untuk memetakan fungsi lama ke Supabase
 */
async function dispatchApiCall(fnName, args) {
  if (!supabase) {
    throw new Error('Koneksi Supabase belum terpasang. Periksa SUPABASE_CONFIG.');
  }

  switch (fnName) {

    // --------------------------------------------------------------------------
    // A. AUTENTIKASI & PROFIL PENGGUNA
    // --------------------------------------------------------------------------
    case 'loginUser': {
      const [username, password] = args;
      return await loginSupabaseUser(username, password);
    }

    case 'getUsers': {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'saveUser': {
      const userPayload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await supabase.rpc('saveUser', { user_payload: userPayload });
      if (error) throw error;
      return data;
    }

    case 'deleteUser': {
      const userId = (args[1] !== undefined) ? args[1] : args[0];
      const { data, error } = await supabase.rpc('deleteUser', { user_id: String(userId) });
      if (error) throw error;
      return data;
    }

    // --------------------------------------------------------------------------
    // B. MASTER PRODUK, KEMASAN & PRICE TIERS
    // --------------------------------------------------------------------------
    case 'getProducts': {
      const { data, error } = await (window.supabaseClient || supabase).rpc('getProducts');
      if (error) {
        console.error('Error getProducts:', error);
        throw error;
      }
      return data || [];
    }

    case 'saveProduct': {
      const payload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await (window.supabaseClient || supabase).rpc('saveProduct', { product_payload: payload });
      if (error) {
        console.error('Error saveProduct:', error);
        throw error;
      }
      return data;
    }

    case 'saveBundledProducts': {
      const payload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await (window.supabaseClient || supabase).rpc('saveBundledProducts', { payload: payload });
      if (error) {
        console.error('Error saveBundledProducts:', error);
        throw error;
      }
      return data;
    }

    case 'deleteProduct': {
      const prodId = (args[1] !== undefined) ? args[1] : args[0];
      const { data, error } = await (window.supabaseClient || supabase).rpc('deleteProduct', { product_id: String(prodId) });
      if (error) {
        console.error('Error deleteProduct:', error);
        throw error;
      }
      return data;
    }

    // --------------------------------------------------------------------------
    // C. POS INITIAL DATA & TRANSAKSI
    // --------------------------------------------------------------------------
    case 'getPosInitData': {
      const [productsRes, batchesRes, tiersRes, customersRes] = await Promise.all([
        supabase.from('products').select(`*, packaging_types(*)`).eq('is_active', true),
        supabase.from('stock_batches')
          .select('*')
          .gt('qty_remaining', 0)
          .eq('quality_status', 'NORMAL')
          .eq('qc_status', 'APPROVED'),
        supabase.from('price_tiers').select('*'),
        supabase.from('customers').select('*').order('name', { ascending: true })
      ]);

      const batchMap = {};
      const stockMap = {};
      (batchesRes.data || []).forEach(b => {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
        batchMap[b.product_id].push(b);
        stockMap[b.product_id] = (stockMap[b.product_id] || 0) + Number(b.qty_remaining || 0);
      });

      const products = (productsRes.data || []).map(p => {
        const pTiers = (tiersRes.data || []).filter(t => t.product_id === p.id);
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          product_type: p.product_type,
          variant: p.variant || '',
          unit: p.unit || 'pcs',
          photo_url: p.photo_url || '',
          packaging_type_id: p.packaging_type_id,
          harvest_days: p.harvest_days || 0,
          active: p.is_active,
          is_active: p.is_active,
          stock: stockMap[p.id] || 0,
          batches: batchMap[p.id] || [],
          priceTiers: pTiers,
          packaging: p.packaging_types || null
        };
      });

      return {
        products: products,
        batches: batchesRes.data || [],
        price_tiers: tiersRes.data || [],
        customers: customersRes.data || []
      };
    }

    case 'createTransaction': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;

      const consumedItems = [];
      const txId = crypto.randomUUID();
      const invoiceNo = payload.invoice_no || `INV-${Date.now().toString().slice(-6)}`;

      for (const item of payload.items) {
        const { data: fifoResult, error: fifoErr } = await supabase.rpc('consume_stock_fifo', {
          p_product_id: item.product_id,
          p_qty: Number(item.qty),
          p_ref_id: txId,
          p_ref_type: 'sale',
          p_user_id: user ? user.id : null
        });

        if (fifoErr) {
          throw new Error(`Gagal memotong stok barang (${item.name || item.product_id}): ${fifoErr.message}`);
        }

        const primaryBatchId = fifoResult.consumed_batches && fifoResult.consumed_batches[0]
          ? fifoResult.consumed_batches[0].batch_id
          : null;

        consumedItems.push({
          transaction_id: txId,
          product_id: item.product_id,
          batch_id: primaryBatchId,
          qty: Number(item.qty),
          price: Number(item.price),
          cost: Number(fifoResult.total_cost || 0),
          subtotal: Number(item.subtotal || (item.qty * item.price))
        });
      }

      const { data: txRecord, error: txErr } = await supabase.from('transactions').insert({
        id: txId,
        invoice_no: invoiceNo,
        customer_id: payload.customer_id || null,
        customer_name: payload.customer_name || 'Pelanggan Umum',
        source: payload.source || 'POS',
        subtotal: Number(payload.subtotal || 0),
        tax: Number(payload.tax || 0),
        discount: Number(payload.discount || 0),
        total: Number(payload.total || 0),
        payment_method: payload.payment_method || 'CASH',
        payment_type: payload.payment_type || 'cash',
        status: 'COMPLETED',
        cashier_id: user ? user.id : null
      }).select().single();

      if (txErr) throw txErr;

      const { error: itemsErr } = await supabase.from('transaction_items').insert(consumedItems);
      if (itemsErr) throw itemsErr;

      if (payload.payment_type === 'installment') {
        const paidAmount = Number(payload.paid_amount || 0);
        const totalAmount = Number(payload.total || 0);
        await supabase.from('receivables').insert({
          transaction_id: txId,
          customer_id: payload.customer_id || null,
          total: totalAmount,
          paid: paidAmount,
          remaining: totalAmount - paidAmount,
          due_date: payload.due_date || null,
          status: paidAmount >= totalAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
        });
      }

      return {
        success: true,
        transaction_id: txId,
        invoice_no: invoiceNo,
        message: 'Transaksi berhasil disimpan!'
      };
    }

    case 'voidTransaction': {
      const [, transactionId, voidReason] = args;
      const user = window.CURRENT_USER_PROFILE;

      const { data, error } = await supabase.rpc('void_transaction', {
        p_transaction_id: transactionId,
        p_admin_id: user ? user.id : null,
        p_reason: voidReason || 'Pembatalan nota kasir'
      });

      if (error) throw error;
      return data;
    }

    case 'getTransactionDetail': {
      const [, transactionId] = args;
      const [txRes, itemsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('id', transactionId).single(),
        supabase.from('transaction_items').select('*, products(name, unit)').eq('transaction_id', transactionId)
      ]);

      if (txRes.error) throw txRes.error;

      return {
        transaction: txRes.data,
        items: (itemsRes.data || []).map(i => ({
          ...i,
          name: i.products ? i.products.name : 'Produk',
          unit: i.products ? i.products.unit : 'pcs'
        }))
      };
    }

    // --------------------------------------------------------------------------
    // D. PENGADAAN (PURCHASES, SUPPLIERS, FARMERS)
    // --------------------------------------------------------------------------
    case 'getPurchases': {
      const { data, error } = await (window.supabaseClient || supabase).rpc('getPurchases');
      if (error) throw error;
      return data || [];
    }

    case 'createPurchase': {
      const pPayload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await (window.supabaseClient || supabase).rpc('createPurchase', { purchase_payload: pPayload });
      if (error) throw error;
      return data;
    }

    case 'deletePurchase': {
      const purId = (args[1] !== undefined) ? args[1] : args[0];
      const { data, error } = await (window.supabaseClient || supabase).rpc('deletePurchase', { purchase_id: String(purId) });
      if (error) throw error;
      return data;
    }

    case 'getSuppliers': {
      const { data, error } = await (window.supabaseClient || supabase).rpc('getSuppliers');
      if (error) throw error;
      return data || [];
    }

    case 'saveSupplier': {
      const sPayload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await (window.supabaseClient || supabase).rpc('saveSupplier', { supplier_payload: sPayload });
      if (error) throw error;
      return data;
    }

    case 'getFarmers': {
      const { data, error } = await (window.supabaseClient || supabase).rpc('getFarmers');
      if (error) throw error;
      return data || [];
    }

    case 'saveFarmer': {
      const fPayload = (args[1] && typeof args[1] === 'object') ? args[1] : (typeof args[0] === 'object' ? args[0] : {});
      const { data, error } = await (window.supabaseClient || supabase).rpc('saveFarmer', { farmer_payload: fPayload });
      if (error) throw error;
      return data;
    }

    // --------------------------------------------------------------------------
    // E. PRODUKSI & PENGEMASAN MANDIRI (PRODUCTIONS)
    // --------------------------------------------------------------------------
    case 'getProductions': {
      const { data, error } = await supabase
        .from('productions')
        .select(`
          *,
          source_product:products!productions_source_product_id_fkey (name),
          target_product:products!productions_target_product_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        source_name: p.source_product ? p.source_product.name : '(dihapus)',
        target_name: p.target_product ? p.target_product.name : '(dihapus)',
        seed_cost: Number(p.seed_cost || 0),
        packaging_cost: Number(p.packaging_cost || 0)
      }));
    }

    case 'processProduction': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;
      const prodId = crypto.randomUUID();
      const grams = Number(payload.gram_used || 0);
      const pcs = Number(payload.pcs_produced || 0);
      const seedCost = Number(payload.seed_cost || 0);
      const packagingCost = Number(payload.packaging_cost || 0);

      // Hitung otomatis HPP jika bernilai 0
      let hppPerPiece = Number(payload.hpp_per_piece || 0);
      if (hppPerPiece <= 0) {
        hppPerPiece = pcs > 0 ? ((seedCost + packagingCost) / pcs) : (seedCost + packagingCost);
      }

      // 1. Validasi dan potong stok batch bahan baku curah
      const { data: srcBatch, error: srcErr } = await supabase
        .from('stock_batches')
        .select('*')
        .eq('id', payload.source_batch_id)
        .single();

      if (srcErr || !srcBatch) throw new Error('Batch asal bahan curah tidak ditemukan.');
      if (Number(srcBatch.qty_remaining) < grams) {
        throw new Error(`Stok batch asal tidak mencukupi (${srcBatch.qty_remaining} gr tersedia, butuh ${grams} gr).`);
      }

      await supabase
        .from('stock_batches')
        .update({
          qty_remaining: Number(srcBatch.qty_remaining) - grams,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.source_batch_id);

      await supabase.from('stock_movements').insert({
        product_id: payload.source_product_id,
        batch_id: payload.source_batch_id,
        type: 'production_out',
        qty: -grams,
        ref_id: prodId,
        notes: `Pengemasan benih menjadi ${pcs} kemasan`,
        created_by: user ? user.id : null
      });

      // 2. Buat batch baru untuk produk kemasan jadi
      const targetBatchId = crypto.randomUUID();
      const targetBatchCode = `PK-${Date.now().toString().slice(-6)}`;

      await supabase.from('stock_batches').insert({
        id: targetBatchId,
        batch_code: targetBatchCode,
        product_id: payload.target_product_id,
        qty_in: pcs,
        qty_remaining: pcs,
        buy_price: hppPerPiece,
        production_date: srcBatch.production_date || new Date().toISOString().split('T')[0],
        expiry_date: srcBatch.expiry_date || null,
        quality_status: 'NORMAL',
        qc_status: 'APPROVED'
      });

      await supabase.from('stock_movements').insert({
        product_id: payload.target_product_id,
        batch_id: targetBatchId,
        type: 'production_in',
        qty: pcs,
        ref_id: prodId,
        notes: `Hasil pengemasan dari batch ${srcBatch.batch_code}`,
        created_by: user ? user.id : null
      });

      // 3. Simpan riwayat di tabel productions
      const { data: prodRecord, error: prdErr } = await supabase.from('productions').insert({
        id: prodId,
        source_product_id: payload.source_product_id,
        target_product_id: payload.target_product_id,
        source_batch_id: payload.source_batch_id,
        gram_used: grams,
        pcs_produced: pcs,
        gram_per_pack: Number(payload.gram_per_pack || 0),
        hpp_per_piece: hppPerPiece,
        seed_cost: Number(payload.seed_cost || 0),
        packaging_cost: Number(payload.packaging_cost || 0)
      }).select().single();

      if (prdErr) throw prdErr;

      return {
        success: true,
        id: prodId,
        message: `Berhasil mengemas ${pcs} kemasan benih siap jual.`
      };
    }

    case 'deleteProduction': {
      const [, productionId] = args;
      const { error } = await supabase.from('productions').delete().eq('id', productionId);
      if (error) throw error;
      return { success: true };
    }

    // --------------------------------------------------------------------------
    // F. QUALITY CONTROL & OVEN DHT 24 JAM
    // --------------------------------------------------------------------------
    case 'getQCRecords': {
      const [batchesRes, prodsRes, logsRes, purchasesRes] = await Promise.all([
        supabase.from('stock_batches').select('*'),
        supabase.from('products').select('*'),
        supabase.from('seed_qc_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('id, farmer_name, created_at')
      ]);

      const batches = batchesRes.data || [];
      const products = prodsRes.data || [];
      const logs = logsRes.data || [];
      const purchases = purchasesRes.data || [];

      const prodMap = {};
      products.forEach(p => { prodMap[p.id] = p; });

      const purchMap = {};
      purchases.forEach(pu => { purchMap[pu.id] = pu; });

      const logsByBatch = {};
      logs.forEach(l => {
        const bId = String(l.batch_id);
        if (!logsByBatch[bId]) logsByBatch[bId] = [];
        logsByBatch[bId].push(l);
      });

      // Filter toples benih curah/baku (unit gram atau product_type raw_seed atau category Benih)
      const seedBatches = batches.filter(b => {
        const p = prodMap[b.product_id];
        if (!p) return false;
        const isSeed = String(p.category || '').toLowerCase().includes('benih');
        const isRaw = p.product_type === 'raw_seed' || p.unit === 'gram' || p.unit === 'gr' || p.unit === 'kg';
        return isSeed && isRaw;
      });

      const targetBatches = seedBatches.length > 0 ? seedBatches : batches.filter(b => {
        const p = prodMap[b.product_id];
        return p && String(p.category || '').toLowerCase().includes('benih');
      });

      const records = targetBatches.map(b => {
        const prod = prodMap[b.product_id] || {};
        const purch = purchMap[b.purchase_id] || {};
        const bLogs = logsByBatch[b.id] || [];
        const lastLog = bLogs.length > 0 ? bLogs[0] : null;

        const dhtLog = bLogs.find(l => l.stage === 'DHT_24JAM') || null;
        let dhtInfo = null;
        if (dhtLog) {
          dhtInfo = {
            oven_no: dhtLog.dht_oven_no || 'Oven 1',
            target_temp: Number(dhtLog.dht_target_temp || 50),
            start_time: dhtLog.dht_start_time || dhtLog.tested_at || '',
            end_time: dhtLog.dht_end_time || '',
            is_finished: String(dhtLog.status || '').toUpperCase() === 'PASSED' || String(dhtLog.status || '').toUpperCase() === 'COMPLETED'
          };
        }

        let qcStatus = String(b.qc_status || '').toUpperCase();
        const qualityStatus = String(b.quality_status || 'NORMAL').toUpperCase();

        const entryDate = b.received_at ? String(b.received_at).split('T')[0] : (purch.created_at ? String(purch.created_at).split('T')[0] : '');
        const lastDateStr = (lastLog && lastLog.tested_at) ? lastLog.tested_at : (b.received_at || b.production_date || entryDate);
        let isNeedsRetest = false;
        if (lastDateStr) {
          const lastTime = new Date(lastDateStr).getTime();
          if (!isNaN(lastTime)) {
            const ageDays = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
            if (ageDays > 180 && (qcStatus === 'APPROVED' || qualityStatus === 'APPROVED')) {
              isNeedsRetest = true;
            }
          }
        }

        let category = 'Menunggu Uji';
        if (isNeedsRetest) {
          category = 'Butuh Uji Berkala';
        } else if (qcStatus === 'APPROVED' || qualityStatus === 'APPROVED') {
          category = 'Lolos Mutu';
          qcStatus = 'APPROVED';
        } else if (qcStatus === 'REJECTED' || qualityStatus === 'QUARANTINE' || (lastLog && lastLog.status === 'FAILED')) {
          category = 'Karantina/Gagal';
          if (!qcStatus) qcStatus = 'REJECTED';
        } else if ((dhtInfo && !dhtInfo.is_finished) || qcStatus === 'IN_PROGRESS' || (lastLog && (lastLog.stage === 'DHT_24JAM' || lastLog.stage === 'UJI_2_IDEP'))) {
          category = 'Proses DHT';
        } else if (lastLog && (lastLog.stage === 'UJI_3_PASCA_DHT' || lastLog.stage === 'PASCA_DHT') && Number(lastLog.germination_rate || 0) >= 80) {
          category = 'Lolos Mutu';
          qcStatus = 'APPROVED';
        } else {
          category = 'Menunggu Uji';
        }

        if (!qcStatus) {
          qcStatus = category === 'Lolos Mutu' ? 'APPROVED' : (category === 'Karantina/Gagal' ? 'REJECTED' : 'PENDING_QC');
        }

        return {
          batch_id: b.id,
          batch_code: b.batch_code || b.id,
          product_id: b.product_id,
          product_name: prod.name || ('Produk ' + b.product_id),
          product_category: prod.category || 'Benih',
          farmer_name: purch.farmer_name || (lastLog ? lastLog.farmer_name : '') || '-',
          entry_date: entryDate,
          unit: prod.unit || 'gr',
          qty_in: Number(b.qty_in || 0),
          qty_remaining: Number(b.qty_remaining || 0),
          production_date: b.production_date || '',
          expiry_date: b.expiry_date || '',
          received_at: b.received_at || '',
          qc_status: qcStatus,
          quality_status: qualityStatus,
          category: category,
          needs_retest: isNeedsRetest,
          dht_info: dhtInfo,
          last_stage: lastLog ? lastLog.stage : '-',
          last_germination_rate: lastLog && lastLog.germination_rate !== null ? Number(lastLog.germination_rate) : null,
          last_tray_a: lastLog ? Number(lastLog.tray_a_count || 0) : null,
          last_tray_b: lastLog ? Number(lastLog.tray_b_count || 0) : null,
          last_photo_url: lastLog ? (lastLog.photo_url || '') : '',
          last_tested_at: lastLog ? lastLog.tested_at : '',
          last_tested_by: lastLog ? lastLog.tested_by : '',
          last_status: lastLog ? lastLog.status : 'PENDING',
          notes: lastLog ? (lastLog.notes || '') : '',
          history: bLogs
        };
      });

      return records;
    }

    case 'saveQCStageWithPhoto': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;

      let photoUrl = payload.photo_url || '';
      if (payload.imageBase64 && payload.imageBase64.startsWith('data:image')) {
        const fileName = `qc_${payload.batch_id}_${payload.stage || 'STAGE'}.jpg`;
        photoUrl = await uploadToSupabaseStorage('qc-photos', fileName, payload.imageBase64, payload.imageMimeType || 'image/jpeg');
      }

      let germRate = null;
      if (payload.tray_a !== undefined && payload.tray_b !== undefined) {
        germRate = (Number(payload.tray_a) + Number(payload.tray_b)) / 2;
      }

      let qcStatus = 'IN_PROGRESS';
      let batchQuality = 'NORMAL';
      let batchQcStatus = 'PENDING_QC';

      if (germRate !== null) {
        if (germRate >= 80) {
          qcStatus = 'PASSED';
          batchQuality = 'NORMAL';
          batchQcStatus = 'APPROVED';
        } else {
          qcStatus = 'FAILED';
          batchQuality = 'QUARANTINE';
          batchQcStatus = 'REJECTED';
        }
      }

      const qcCode = `QC-${Date.now().toString().slice(-6)}`;
      const { data: qcRecord, error: qcErr } = await supabase.from('seed_qc_logs').insert({
        qc_code: qcCode,
        batch_id: payload.batch_id,
        stage: payload.stage || 'RUTIN',
        germination_rate: germRate,
        tray_a_count: Number(payload.tray_a || 0),
        tray_b_count: Number(payload.tray_b || 0),
        photo_url: photoUrl,
        dht_oven_no: payload.dht_oven_no || null,
        dht_target_temp: payload.dht_target_temp ? Number(payload.dht_target_temp) : null,
        dht_start_time: payload.dht_start_time || null,
        dht_end_time: payload.dht_end_time || null,
        tested_by: user ? user.id : null,
        status: qcStatus,
        notes: payload.notes || ''
      }).select().single();

      if (qcErr) throw qcErr;

      if (germRate !== null) {
        await supabase.from('stock_batches').update({
          quality_status: batchQuality,
          qc_status: batchQcStatus,
          updated_at: new Date().toISOString()
        }).eq('id', payload.batch_id);
      }

      return {
        success: true,
        message: 'Catatan pengujian mutu QC berhasil disimpan!',
        photo_url: photoUrl,
        qc_record: qcRecord
      };
    }

    case 'startDHTSession': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;
      const startDate = payload.start_time ? new Date(payload.start_time) : new Date();
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      const qcCode = `DHT-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase.from('seed_qc_logs').insert({
        qc_code: qcCode,
        batch_id: payload.batch_id,
        stage: 'DHT_24JAM',
        dht_oven_no: payload.oven_no || 'Oven 1',
        dht_target_temp: Number(payload.target_temp || 50),
        dht_start_time: startDate.toISOString(),
        dht_end_time: endDate.toISOString(),
        tested_by: user ? user.id : null,
        status: 'IN_PROGRESS',
        notes: payload.notes || ''
      }).select().single();

      if (error) throw error;
      return { success: true, message: 'Sesi oven DHT 24 jam berhasil dimulai.', dht_record: data };
    }

    case 'completeDHTSession': {
      const [, payload] = args;
      const { data, error } = await supabase
        .from('seed_qc_logs')
        .update({
          status: 'COMPLETED',
          notes: payload.notes || 'Sesi DHT selesai tepat 24 jam.'
        })
        .eq('batch_id', payload.batch_id)
        .eq('stage', 'DHT_24JAM')
        .eq('status', 'IN_PROGRESS');

      if (error) throw error;
      return { success: true, message: 'Sesi oven DHT berhasil dituntaskan.' };
    }

    // --------------------------------------------------------------------------
    // G. KONSINYASI CABANG (OUTLETS, AUDITS, TRANSFERS)
    // --------------------------------------------------------------------------
    case 'getOutlets': {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'getAllConsignmentTransfers': {
      const { data, error } = await supabase
        .from('consignment_transfers')
        .select('*, outlets(name)')
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        outlet_name: t.outlets ? t.outlets.name : 'Outlet'
      }));
    }

    case 'transferStockToOutlet': {
      const [, payload] = args;
      const transferId = crypto.randomUUID();
      const invoiceNo = `SJ-${Date.now().toString().slice(-6)}`;
      const items = payload.items || [];

      // 1. Simpan Header Transfer
      await supabase.from('consignment_transfers').insert({
        id: transferId,
        outlet_id: payload.outlet_id,
        invoice_no: invoiceNo,
        total_pcs: items.reduce((sum, it) => sum + Number(it.qty || 0), 0),
        notes: payload.notes || '',
        delivery_status: 'PENDING'
      });

      // 2. Potong stok pusat via RPC FIFO dan catat item transfer
      for (const it of items) {
        await supabase.rpc('consume_stock_fifo', {
          p_product_id: it.product_id,
          p_qty: Number(it.qty),
          p_ref_id: transferId,
          p_ref_type: 'consignment_out'
        });

        await supabase.from('consignment_transfer_items').insert({
          transfer_id: transferId,
          product_id: it.product_id,
          qty: Number(it.qty),
          unit_price: Number(it.unit_price || 0)
        });

        // Update saldo rak cabang
        const { data: existStock } = await supabase
          .from('outlet_stocks')
          .select('qty_current')
          .eq('outlet_id', payload.outlet_id)
          .eq('product_id', it.product_id)
          .maybeSingle();

        const currentQty = existStock ? Number(existStock.qty_current || 0) : 0;
        await supabase.from('outlet_stocks').upsert({
          outlet_id: payload.outlet_id,
          product_id: it.product_id,
          qty_current: currentQty + Number(it.qty),
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, id: transferId, invoice_no: invoiceNo };
    }

    case 'submitConsignmentAudit': {
      const [, payload] = args;
      const auditId = crypto.randomUUID();
      const outletId = payload.outlet_id || payload.consignment_id;

      let displayPhotoUrl = payload.display_photo_url || '';
      if (payload.display_photo_base64 && payload.display_photo_base64.startsWith('data:image')) {
        displayPhotoUrl = await uploadToSupabaseStorage('qc-photos', `audit_display_${auditId}.jpg`, payload.display_photo_base64);
      }

      let sigIdepUrl = '';
      if (payload.sig_idep_base64 && payload.sig_idep_base64.startsWith('data:image')) {
        sigIdepUrl = await uploadToSupabaseStorage('signatures', `sig_idep_${auditId}.png`, payload.sig_idep_base64, 'image/png');
      }

      let sigOutletUrl = '';
      if (payload.sig_outlet_base64 && payload.sig_outlet_base64.startsWith('data:image')) {
        sigOutletUrl = await uploadToSupabaseStorage('signatures', `sig_outlet_${auditId}.png`, payload.sig_outlet_base64, 'image/png');
      }

      await supabase.from('consignment_audits').insert({
        id: auditId,
        outlet_id: outletId,
        audit_date: payload.audit_date || new Date().toISOString().split('T')[0],
        outlet_pic: payload.outlet_pic || '',
        display_photo_url: displayPhotoUrl,
        sig_idep_url: sigIdepUrl,
        sig_outlet_url: sigOutletUrl,
        notes: payload.notes || ''
      });

      for (const it of (payload.items || [])) {
        await supabase.from('consignment_audit_items').insert({
          audit_id: auditId,
          product_id: it.product_id,
          qty_system: Number(it.qty_system || 0),
          qty_actual: Number(it.qty_actual || 0),
          qty_sold: Number(it.qty_sold || 0),
          qty_returned: Number(it.qty_returned || 0),
          qty_missing: Number(it.qty_missing || 0),
          missing_chargeable: !!it.missing_chargeable,
          qty_restock: Number(it.qty_restock || 0)
        });

        // Update saldo rak cabang
        const newStock = Number(it.qty_actual || 0) + Number(it.qty_restock || 0);
        await supabase.from('outlet_stocks').upsert({
          outlet_id: outletId,
          product_id: it.product_id,
          qty_current: newStock,
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, id: auditId, message: 'Berita acara opname konsinyasi berhasil disimpan.' };
    }

    case 'createConsignmentInvoice': {
      const [, payload] = args;
      const { data: auditItems, error: aiErr } = await supabase
        .from('consignment_audit_items')
        .select('*, products(name)')
        .eq('audit_id', payload.audit_id);
      if (aiErr) throw aiErr;

      const soldItems = (auditItems || []).filter(it => Number(it.qty_sold || 0) > 0);
      return { success: true, count: soldItems.length, message: 'Nota konsinyasi siap diproses.' };
    }

    case 'confirmDeliveryReceipt': {
      const [, payload] = args;
      let signatureUrl = '';
      if (payload.signatureBase64 && payload.signatureBase64.startsWith('data:image')) {
        const sigFileName = `sig_transfer_${payload.deliveryId}.png`;
        signatureUrl = await uploadToSupabaseStorage('signatures', sigFileName, payload.signatureBase64, 'image/png');
      }

      const { data, error } = await supabase
        .from('consignment_transfers')
        .update({
          delivery_status: 'DELIVERED',
          actual_recipient_name: payload.actualRecipientName,
          recipient_role: payload.recipientRole || 'Staf Outlet',
          recipient_signature_url: signatureUrl,
          received_at: new Date().toISOString(),
          delivery_notes: payload.deliveryNotes || ''
        })
        .eq('id', payload.deliveryId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: 'Serah terima surat jalan berhasil diselesaikan!', data: data };
    }

    // --------------------------------------------------------------------------
    // H. CRM PELANGGAN, PIUTANG & AFTER SALES
    // --------------------------------------------------------------------------
    case 'getCustomers': {
      const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'saveCustomer': {
      const [, payload] = args;
      const { data, error } = await supabase.from('customers').upsert(payload).select().single();
      if (error) throw error;
      return { success: true, customer: data };
    }

    case 'getReceivables': {
      const { data, error } = await supabase
        .from('receivables')
        .select('*, customers(name, phone), transactions(invoice_no, created_at)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    case 'recordReceivablePayment': {
      const [, payload] = args;
      const amount = Number(payload.amount);

      const { error: payErr } = await supabase.from('receivable_payments').insert({
        receivable_id: payload.receivable_id,
        amount: amount,
        payment_method: payload.payment_method || 'CASH',
        notes: payload.notes || ''
      });
      if (payErr) throw payErr;

      const { data: rec, error: recErr } = await supabase
        .from('receivables')
        .select('*')
        .eq('id', payload.receivable_id)
        .single();
      if (recErr) throw recErr;

      const newPaid = Number(rec.paid) + amount;
      const newRemaining = Math.max(0, Number(rec.total) - newPaid);
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      await supabase.from('receivables').update({
        paid: newPaid,
        remaining: newRemaining,
        status: newStatus
      }).eq('id', payload.receivable_id);

      return { success: true, message: 'Pembayaran piutang berhasil dicatat.' };
    }

    // --------------------------------------------------------------------------
    // I. FAKTUR & CETAK NOTA
    // --------------------------------------------------------------------------
    case 'getInvoiceData': {
      const [, transactionId] = args;
      const [txRes, itemsRes, settingsRes] = await Promise.all([
        supabase.from('transactions').select('*, customers(*)').eq('id', transactionId).single(),
        supabase.from('transaction_items').select('*, products(name, unit)').eq('transaction_id', transactionId),
        supabase.from('settings').select('*')
      ]);

      if (txRes.error) throw txRes.error;

      const settingsObj = {};
      (settingsRes.data || []).forEach(s => { settingsObj[s.key] = s.value; });

      // Ambil piutang jika pembayaran cicilan / tempo
      let recData = null;
      if (txRes.data.payment_type === 'installment') {
        const { data: rData } = await supabase.from('receivables').select('*').eq('transaction_id', transactionId).maybeSingle();
        recData = rData;
      }

      return {
        transaction: txRes.data,
        items: (itemsRes.data || []).map(i => ({
          ...i,
          name: i.products ? i.products.name : 'Produk',
          unit: i.products ? i.products.unit : 'pcs'
        })),
        customer: txRes.data.customers || { name: txRes.data.customer_name, phone: '' },
        receivable: recData,
        settings: settingsObj
      };
    }

    case 'getRecentTransactionsForInvoice': {
      const [, startDate, endDate] = args;
      let query = supabase
        .from('transactions')
        .select('id, invoice_no, customer_name, total, subtotal, tax, payment_method, payment_type, status, created_at, transaction_items(*, products(name, unit))')
        .order('created_at', { ascending: false })
        .limit(50);

      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        items: (t.transaction_items || []).map(i => ({
          ...i,
          name: i.products ? i.products.name : 'Produk',
          unit: i.products ? i.products.unit : 'pcs'
        }))
      }));
    }

    // --------------------------------------------------------------------------
    // J. DASHBOARD & STATISTIK REALTIME
    // --------------------------------------------------------------------------
    case 'getDashboardSummary': {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [txTodayRes, prodsRes, batchesRes, receivablesRes] = await Promise.all([
        supabase.from('transactions')
          .select('total')
          .neq('status', 'VOID')
          .gte('created_at', `${today}T00:00:00Z`),
        supabase.from('products')
          .select('id, name, unit')
          .eq('is_active', true),
        supabase.from('stock_batches')
          .select('id, product_id, batch_code, qty_remaining, expiry_date, quality_status, qc_status')
          .gt('qty_remaining', 0),
        supabase.from('receivables')
          .select('id, customer_id, total, remaining, due_date, status')
          .neq('status', 'PAID')
          .neq('status', 'CANCELLED')
      ]);

      const todaySales = (txTodayRes.data || []).reduce((sum, t) => sum + Number(t.total || 0), 0);
      const todayTransactionCount = (txTodayRes.data || []).length;
      const allBatches = batchesRes.data || [];
      const allProds = prodsRes.data || [];

      // Hitung stok per produk untuk daftar stok menipis (<= 5)
      const stockPerProd = {};
      allBatches.forEach(b => {
        if (b.quality_status === 'NORMAL') {
          stockPerProd[b.product_id] = (stockPerProd[b.product_id] || 0) + Number(b.qty_remaining || 0);
        }
      });

      const lowStock = allProds
        .map(p => ({
          id: p.id,
          name: p.name,
          stock: stockPerProd[p.id] || 0,
          unit: p.unit || 'pcs'
        }))
        .filter(p => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock);

      // Daftar batch mendekati kedaluwarsa (<= 30 hari ke depan)
      const expiring = allBatches
        .filter(b => b.expiry_date && b.expiry_date <= in30Days && Number(b.qty_remaining) > 0)
        .map(b => {
          const prod = allProds.find(p => p.id === b.product_id);
          return {
            id: b.id,
            product_id: prod ? prod.name : b.batch_code,
            batch_code: b.batch_code,
            expiry_date: b.expiry_date,
            remaining: b.qty_remaining
          };
        })
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      return {
        todaySales: todaySales,
        todayTransactionCount: todayTransactionCount,
        receivables: receivablesRes.data || [],
        lowStock: lowStock,
        expiring: expiring,
        omzet_today: todaySales,
        total_tx_today: todayTransactionCount
      };
    }

    // --------------------------------------------------------------------------
    // K. LAPORAN & VALUASI STOK
    // --------------------------------------------------------------------------
    case 'getReport': {
      const [, period, customStartDate, customEndDate] = args;
      const now = new Date();
      let p = typeof period === 'object' && period ? (period.period || 'month') : (period || 'month');
      let startDateStr = typeof period === 'object' && period ? (period.startDate || '') : (customStartDate || '');
      let endDateStr = typeof period === 'object' && period ? (period.endDate || '') : (customEndDate || '');

      let startDate = new Date();
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (p === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (p === 'week') {
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (p === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      } else if (p === 'custom' && startDateStr) {
        startDate = new Date(`${startDateStr}T00:00:00Z`);
        if (endDateStr) endDate = new Date(`${endDateStr}T23:59:59Z`);
      } else {
        p = 'month';
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }

      const isoStart = startDate.toISOString();
      const isoEnd = endDate.toISOString();

      const [txRes, itemsRes] = await Promise.all([
        supabase.from('transactions')
          .select('*')
          .neq('status', 'VOID')
          .gte('created_at', isoStart)
          .lte('created_at', isoEnd)
          .order('created_at', { ascending: false }),
        supabase.from('transaction_items')
          .select('*, products(name, category)')
      ]);

      const transactions = txRes.data || [];
      const txIds = new Set(transactions.map(t => t.id));
      const relevantItems = (itemsRes.data || []).filter(i => txIds.has(i.transaction_id));

      let totalSubtotal = 0;
      let totalCost = 0;
      const prodStats = {};
      const payMethods = {};

      transactions.forEach(t => {
        totalSubtotal += Number(t.subtotal || t.total || 0);
        payMethods[t.payment_method] = (payMethods[t.payment_method] || 0) + Number(t.total || 0);
      });

      relevantItems.forEach(it => {
        const cost = Number(it.cost || 0);
        totalCost += cost;
        const pName = it.products ? it.products.name : 'Produk';
        if (!prodStats[pName]) prodStats[pName] = { name: pName, qty: 0, revenue: 0, profit: 0 };
        prodStats[pName].qty += Number(it.qty || 0);
        prodStats[pName].revenue += Number(it.subtotal || 0);
        prodStats[pName].profit += (Number(it.subtotal || 0) - cost);
      });

      const grossMargin = totalSubtotal - totalCost;
      const grossMarginPct = totalSubtotal > 0 ? ((grossMargin / totalSubtotal) * 100).toFixed(1) : '0';

      const topProducts = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue);

      return {
        period: p,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        summary: {
          totalSubtotal: totalSubtotal,
          totalRevenue: totalSubtotal,
          totalTransactions: transactions.length,
          totalCost: totalCost,
          grossMargin: grossMargin,
          grossMarginPct: grossMarginPct
        },
        topProducts: topProducts,
        transactions: transactions,
        paymentMethods: payMethods
      };
    }

    case 'getReportExportData': {
      const [, filterPayload] = args;
      const rep = await dispatchApiCall('getReport', [null, filterPayload]);
      return rep.transactions || [];
    }

    case 'getStockValuationReport': {
      const [prodsRes, batchesRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('stock_batches').select('*').gt('qty_remaining', 0)
      ]);

      const prodMap = {};
      (prodsRes.data || []).forEach(p => { prodMap[p.id] = p; });

      let totalPackedPcs = 0;
      let totalBulkGrams = 0;
      let totalAssetValue = 0;
      const uniqueVarieties = new Set();

      const items = (batchesRes.data || []).map(b => {
        const prod = prodMap[b.product_id] || {};
        const qty = Number(b.qty_remaining || 0);
        const buyPrice = Number(b.buy_price || 0);
        const assetVal = qty * buyPrice;

        totalAssetValue += assetVal;
        uniqueVarieties.add(prod.name || b.product_id);

        if (prod.unit === 'gram' || prod.product_type === 'raw_seed') {
          totalBulkGrams += qty;
        } else {
          totalPackedPcs += qty;
        }

        return {
          id: b.id,
          batch_code: b.batch_code,
          product_name: prod.name || 'Produk',
          category: prod.category || 'Benih',
          product_type: prod.product_type || 'raw_seed',
          unit: prod.unit || 'pcs',
          qty_remaining: qty,
          buy_price: buyPrice,
          asset_value: assetVal,
          expiry_date: b.expiry_date,
          quality_status: b.quality_status,
          qc_status: b.qc_status
        };
      });

      return {
        success: true,
        summary: {
          totalVarieties: uniqueVarieties.size,
          totalPackedPcs: totalPackedPcs,
          totalBulkGrams: totalBulkGrams,
          totalAssetValue: totalAssetValue
        },
        items: items
      };
    }

    // --------------------------------------------------------------------------
    // L. PENGATURAN SISTEM (SETTINGS)
    // --------------------------------------------------------------------------
    case 'getSettings': {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const settingsObj = {};
      (data || []).forEach(s => { settingsObj[s.key] = s.value; });
      return settingsObj;
    }

    case 'saveSettings': {
      const [, payload] = args;
      const entries = Object.keys(payload).map(k => ({
        key: k,
        value: String(payload[k]),
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('settings').upsert(entries);
      if (error) throw error;
      return { success: true };
    }

    case 'getRolePermissions': {
      const { data, error } = await supabase.rpc('getRolePermissions');
      if (error) {
        console.error('[Supabase Bridge] Error memanggil RPC getRolePermissions:', error);
        return {
          roles: ['Admin', 'Koordinator', 'QC', 'Kasir'],
          permissions: {
            Admin: { dashboard: { can_view: true, can_edit: true, can_delete: true } }
          }
        };
      }
      return data;
    }

    case 'saveRolePermissions': {
      const payload = args[1] || args[0];
      const { data, error } = await supabase.rpc('saveRolePermissions', { permissions_payload: payload });
      if (error) {
        console.error('[Supabase Bridge] Error memanggil RPC saveRolePermissions:', error);
        throw error;
      }
      return data || { success: true };
    }

    // --------------------------------------------------------------------------
    // M. TAMBAHAN FITUR: BATCH, MUTASI, OUTLET DETAIL & DANGER ZONE
    // --------------------------------------------------------------------------
    case 'getStockBatches': {
      const pId = (args[1] !== undefined) ? args[1] : args[0];
      const { data, error } = await (window.supabaseClient || supabase).rpc('getStockBatches', { prod_id: String(pId) });
      if (error) throw error;
      return data || [];
    }

    case 'getStockMovements': {
      const [, productId] = args;
      let q = supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(50);
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }

    case 'saveOutlet': {
      const [, payload] = args;
      const outletObj = {
        name: payload.name,
        pic_name: payload.pic_name,
        phone: payload.phone || '',
        address: payload.address || '',
        price_tier: payload.price_tier || 'Outlet',
        visit_interval_days: Number(payload.visit_interval_days) || 14,
        notes: payload.notes || '',
        status: payload.status || 'ACTIVE'
      };
      if (payload.id) {
        outletObj.id = payload.id;
      }
      const { data, error } = await supabase.from('outlets').upsert(outletObj).select().single();
      if (error) throw error;
      return { success: true, id: data.id, outlet: data };
    }

    case 'getOutletDetail': {
      const [, outletId] = args;
      const [outletRes, stocksRes, transfersRes, auditsRes] = await Promise.all([
        supabase.from('outlets').select('*').eq('id', outletId).single(),
        supabase.from('outlet_stocks').select('*, products(name, unit)').eq('outlet_id', outletId),
        supabase.from('consignment_transfers').select('*').eq('outlet_id', outletId).order('sent_at', { ascending: false }).limit(30),
        supabase.from('consignment_audits').select('*, consignment_audit_items(*)').eq('outlet_id', outletId).order('audit_date', { ascending: false }).limit(30)
      ]);
      if (outletRes.error) throw outletRes.error;
      return {
        outlet: outletRes.data,
        stocks: (stocksRes.data || []).map(s => ({
          ...s,
          product_name: s.products ? s.products.name : 'Produk',
          unit: s.products ? s.products.unit : 'pcs'
        })),
        transfers: transfersRes.data || [],
        audits: auditsRes.data || []
      };
    }

    case 'getDeliveryOrderReceiptData': {
      const [, transferId] = args;
      const targetId = transferId || args[0];
      const { data: transfer, error: tErr } = await supabase
        .from('consignment_transfers')
        .select('*, outlets(*)')
        .eq('id', targetId)
        .single();
      if (tErr) throw tErr;

      const { data: items, error: iErr } = await supabase
        .from('consignment_transfer_items')
        .select('*, products(name, unit)')
        .eq('transfer_id', targetId);
      if (iErr) throw iErr;

      return {
        transfer: transfer,
        outlet: transfer.outlets || {},
        items: (items || []).map(it => ({
          ...it,
          name: it.products ? it.products.name : 'Produk',
          unit: it.products ? it.products.unit : 'pcs'
        }))
      };
    }

    case 'getConsignmentSuratJalanPdf': {
      return { success: true, url: '' };
    }

    case 'deleteTransaction': {
      const [, transactionId] = args;
      await supabase.from('receivables').delete().eq('transaction_id', transactionId);
      await supabase.from('transaction_items').delete().eq('transaction_id', transactionId);
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) throw error;
      return { success: true };
    }

    case 'updateTransaction': {
      const [, transactionId, updates] = args;
      const { error } = await supabase.from('transactions').update(updates).eq('id', transactionId);
      if (error) throw error;
      return { success: true };
    }

    case 'deleteCustomer': {
      const [, customerId] = args;
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      if (error) throw error;
      return { success: true };
    }

    case 'getCustomerDetail': {
      const [, customerId] = args;
      const [custRes, txRes, recRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).single(),
        supabase.from('transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20),
        supabase.from('receivables').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
      ]);
      if (custRes.error) throw custRes.error;
      return {
        customer: custRes.data,
        transactions: txRes.data || [],
        receivables: recRes.data || []
      };
    }

    case 'resetTestingData': {
      const [, selectedModules] = args;
      const mods = Array.isArray(selectedModules) ? selectedModules : ['pos'];
      if (mods.includes('pos')) {
        await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('receivables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (mods.includes('consign')) {
        await supabase.from('consignment_audit_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('consignment_audits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('consignment_transfer_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('consignment_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('outlet_stocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (mods.includes('aftersales')) {
        try { await supabase.from('after_sales_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { }
        try { await supabase.from('consultation_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch (e) { }
      }
      return { success: true, message: 'Data riwayat uji coba berhasil dikosongkan!' };
    }

    case 'getRolePermissions': {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'role_permissions').maybeSingle();
      if (data && data.value) {
        try { return JSON.parse(data.value); } catch (e) { }
      }
      return null;
    }

    case 'saveRolePermissions': {
      const [, perms] = args;
      const { error } = await supabase.from('settings').upsert({
        key: 'role_permissions',
        value: JSON.stringify(perms),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return { success: true };
    }

    case 'changePassword': {
      const [, newPassword] = args;
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, message: 'Password berhasil diperbarui.' };
    }

    // --------------------------------------------------------------------------
    // DEFAULT FALLBACK: PANGGIL RPC ATAU TABEL POSTGREST SESUAI NAMA
    // --------------------------------------------------------------------------
    default: {
      console.warn(`[Supabase Bridge] Menjalankan fallback RPC/Tabel untuk fungsi '${fnName}'`);
      const { data: rpcData, error: rpcError } = await supabase.rpc(fnName, args[1] || {});
      if (!rpcError) return rpcData;

      throw new Error(`Fungsi backend '${fnName}' belum diimplementasikan pada supabaseClient.`);
    }
  }
}

// Ekspor fungsi ke objek global window agar dapat diakses dari seluruh modul frontend
window.supabaseClient = supabase;
window.api = api;
window.dispatchApiCall = dispatchApiCall;
window.loginSupabaseUser = loginSupabaseUser;
window.logoutSupabaseUser = logoutSupabaseUser;
window.checkSupabaseSession = checkSupabaseSession;
window.uploadToSupabaseStorage = uploadToSupabaseStorage;

// Inisialisasi otomatis saat script dimuat
document.addEventListener('DOMContentLoaded', () => {
  checkSupabaseSession().then(user => {
    if (user && typeof updateUserInfoUI === 'function') {
      updateUserInfoUI(user);
    }
  });
});
  })();
