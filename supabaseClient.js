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
const SUPABASE_URL = 'https://xozysfvlhcyjytukisul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlzZnZsaGN5anl0dWtpc3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDg3MzYsImV4cCI6MjEwNTUyNDczNn0.SNlrOxV3jx3H3pYxu9BAMi1zxsW-cmvty_FZL0-RsdQ';

const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};

try {
  const _createClientFn = window.supabase?.createClient || (typeof createClient === 'function' ? createClient : null);
  if (_createClientFn) {
    window.supabase = _createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client siap digunakan.');
  } else {
    console.error('❌ Library Supabase CDN belum termuat di index.html.');
  }
} catch (err) {
  console.error('❌ Gagal inisialisasi Supabase Client:', err);
}

// Global state untuk sesi pengguna lokal
window.CURRENT_SESSION = null;
window.CURRENT_USER_PROFILE = null;

// Helper pencadangan lokal riwayat mutasi stok
function saveMutationToLocalBackup(item) {
  try {
    const backup = JSON.parse(localStorage.getItem('idep_stock_mutations_backup') || '[]');
    const idx = backup.findIndex(b => b && b.id === item.id);
    if (idx >= 0) {
      backup[idx] = Object.assign({}, backup[idx], item);
    } else {
      backup.unshift(item);
    }
    if (backup.length > 500) backup.length = 500;
    localStorage.setItem('idep_stock_mutations_backup', JSON.stringify(backup));
  } catch (e) {
    console.warn('[LocalBackup] Gagal simpan mutasi:', e);
  }
}
window.saveMutationToLocalBackup = saveMutationToLocalBackup;

// ==============================================================================
// 1B. ENGINE NOTIFIKASI REALTIME & WEB PUSH (HANDPHONE / PWA)
// ==============================================================================
window.__LIVE_NOTIF_CHANNEL = window.__LIVE_NOTIF_CHANNEL || null;
window.__CURRENT_PUSH_ENDPOINT = window.__CURRENT_PUSH_ENDPOINT || '';

function ensureLiveNotifBroadcastChannel() {
  if (!supabase) return null;
  if (window.__LIVE_NOTIF_CHANNEL) return window.__LIVE_NOTIF_CHANNEL;
  try {
    const ch = supabase.channel('kios-idep-live-notifs', {
      config: { broadcast: { self: false } }
    });
    ch.subscribe();
    window.__LIVE_NOTIF_CHANNEL = ch;
    return ch;
  } catch (err) {
    return null;
  }
}

function emitOperationalNotification(notif) {
  if (!notif || typeof notif !== 'object') return null;
  try {
    const user = window.CURRENT_USER_PROFILE || window.CURRENT_USER || {};
    const actorName = notif.actor_name || user.full_name || user.name || user.username || window.USER_NAME || 'Sistem';
    const rawRoute = String(notif.route || '#dashboard');
    const detail = {
      id: notif.id || ('notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
      title: String(notif.title || '🔔 Kios IDEP'),
      body: String(notif.body || ''),
      category: String(notif.category || 'general'),
      route: rawRoute.startsWith('#') ? rawRoute : ('#' + rawRoute),
      urgent: Boolean(notif.urgent),
      actor_name: String(actorName),
      created_at: notif.created_at || new Date().toISOString()
    };

    // 1. Update pusat notifikasi di tab saat ini secara instan
    try {
      window.dispatchEvent(new CustomEvent('idep:local-notif-emitted', {
        detail: Object.assign({}, detail, { isFromCurrentTab: true, forceBanner: Boolean(notif.forceBanner) })
      }));
    } catch (e) {}

    // 2. Broadcast instan ke seluruh HP/tab lain yang sedang online via Supabase Realtime
    if (!notif.localOnly && supabase) {
      try {
        const ch = ensureLiveNotifBroadcastChannel();
        if (ch && typeof ch.send === 'function') {
          ch.send({
            type: 'broadcast',
            event: 'new_notif',
            payload: detail
          }).catch(function () {});
        }
      } catch (e) {}

      // 3. Simpan riwayat ke tabel app_notifications (aman jika tabel belum dibuat)
      try {
        supabase.from('app_notifications').insert({
          id: detail.id,
          title: detail.title,
          body: detail.body,
          category: detail.category,
          route: detail.route,
          urgent: detail.urgent,
          actor_name: detail.actor_name,
          created_at: detail.created_at
        }).then(function () {}, function () {});
      } catch (e) {}

      // 4. Kirim Web Push W3C (VAPID) ke HP yang sedang terkunci / aplikasi tertutup
      if (!notif.skipPush && supabase.functions && typeof supabase.functions.invoke === 'function') {
        try {
          supabase.functions.invoke('send-push', {
            body: {
              id: detail.id,
              title: detail.title,
              body: detail.body,
              category: detail.category,
              route: detail.route,
              urgent: detail.urgent,
              actor_name: detail.actor_name,
              excludeEndpoint: window.__CURRENT_PUSH_ENDPOINT || ''
            }
          }).then(function () {}, function () {});
        } catch (e) {}
      }
    }

    return detail;
  } catch (err) {
    console.warn('[Notif] Gagal mengirim sinyal notifikasi:', err);
    return null;
  }
}
window.emitOperationalNotification = emitOperationalNotification;
window.ensureLiveNotifBroadcastChannel = ensureLiveNotifBroadcastChannel;

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
    // Fallback: cek langsung ke tabel profiles jika akun dibuat dari menu Akun Pengguna
    const cleanUser = identifier.trim();
    const { data: profMatch } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (profMatch && profMatch.password && String(profMatch.password) === String(password)) {
      const userProfile = {
        id: profMatch.id,
        email: email,
        username: profMatch.username,
        name: profMatch.full_name || profMatch.name || profMatch.username,
        role: profMatch.role || 'Kasir',
        phone: profMatch.phone || ''
      };
      const fakeToken = 'local_' + profMatch.id + '_' + Date.now();
      window.CURRENT_SESSION = { access_token: fakeToken, user: userProfile };
      window.CURRENT_USER_PROFILE = userProfile;
      try {
        localStorage.setItem('ekasir_token', fakeToken);
        localStorage.setItem('ekasir_user', userProfile.name);
        localStorage.setItem('ekasir_role', userProfile.role);
        sessionStorage.setItem('ekasir_token', fakeToken);
        sessionStorage.setItem('ekasir_user', userProfile.name);
        sessionStorage.setItem('ekasir_role', userProfile.role);
        localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
        localStorage.setItem('idep_pos_token', fakeToken);
        localStorage.setItem('ekasir_last_activity', String(Date.now()));
        localStorage.removeItem('ekasir_idle_logout_notice');
        window.__IDLE_EXPIRED_ON_LOAD = false;
      } catch (e) { }
      return {
        success: true,
        token: fakeToken,
        user: userProfile,
        role: userProfile.role,
        name: userProfile.name
      };
    }
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

  const userDisplayName = userProfile.name || userProfile.username;
  const userRole = userProfile.role || 'Kasir';
  try {
    localStorage.setItem('ekasir_token', data.session.access_token);
    localStorage.setItem('ekasir_user', userDisplayName);
    localStorage.setItem('ekasir_role', userRole);
    sessionStorage.setItem('ekasir_token', data.session.access_token);
    sessionStorage.setItem('ekasir_user', userDisplayName);
    sessionStorage.setItem('ekasir_role', userRole);
    localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
    localStorage.setItem('idep_pos_token', data.session.access_token);
    localStorage.setItem('ekasir_last_activity', String(Date.now()));
    localStorage.removeItem('ekasir_idle_logout_notice');
    window.__IDLE_EXPIRED_ON_LOAD = false;
  } catch (e) {
    console.warn('[Session] Gagal menyimpan sesi:', e);
  }

  return {
    success: true,
    token: data.session.access_token,
    user: userProfile,
    role: userProfile.role,
    name: userProfile.name
  };
}

function isSupabaseSessionIdleExpired() {
  try {
    if (window.__IDLE_EXPIRED_ON_LOAD) return true;
    const lastAct = Number(localStorage.getItem('ekasir_last_activity') || 0);
    const rawMin = localStorage.getItem('ekasir_timeout_minutes');
    let timeoutMin = (rawMin !== null && rawMin !== '') ? Number(rawMin) : 30;
    if (isNaN(timeoutMin)) timeoutMin = 30;
    if (lastAct > 0 && timeoutMin > 0 && (Date.now() - lastAct >= timeoutMin * 60000)) {
      return true;
    }
  } catch (e) {}
  return false;
}

async function logoutSupabaseUser() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.CURRENT_SESSION = null;
  window.CURRENT_USER_PROFILE = null;
  try {
    localStorage.removeItem('ekasir_token');
    localStorage.removeItem('ekasir_user');
    localStorage.removeItem('ekasir_role');
    sessionStorage.removeItem('ekasir_token');
    sessionStorage.removeItem('ekasir_user');
    sessionStorage.removeItem('ekasir_role');
    localStorage.removeItem('idep_pos_user');
    localStorage.removeItem('idep_pos_token');
    localStorage.removeItem('ekasir_last_activity');
  } catch (e) {}
}

async function checkSupabaseSession() {
  if (!supabase) return null;
  if (isSupabaseSessionIdleExpired()) {
    await logoutSupabaseUser();
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    const userProfile = {
      id: session.user.id,
      email: session.user.email,
      username: profile ? profile.username : session.user.email.split('@')[0],
      name: profile ? (profile.full_name || profile.name || profile.username) : 'Staf Kios',
      role: profile ? (profile.role || 'Kasir') : 'Kasir',
      phone: profile ? (profile.phone || '') : ''
    };

    window.CURRENT_SESSION = session;
    window.CURRENT_USER_PROFILE = userProfile;
    try {
      const userDisplayName = userProfile.name || userProfile.username;
      const userRole = userProfile.role || 'Kasir';
      localStorage.setItem('ekasir_token', session.access_token);
      localStorage.setItem('ekasir_user', userDisplayName);
      localStorage.setItem('ekasir_role', userRole);
      sessionStorage.setItem('ekasir_token', session.access_token);
      sessionStorage.setItem('ekasir_user', userDisplayName);
      sessionStorage.setItem('ekasir_role', userRole);
      localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
    } catch (e) {}
    return userProfile;
  }

  // Fallback untuk akun pengguna yang login melalui tabel profiles (local token)
  try {
    const savedUserRaw = localStorage.getItem('idep_pos_user');
    const savedToken = localStorage.getItem('idep_pos_token') || localStorage.getItem('ekasir_token') || '';
    if (savedUserRaw && savedToken) {
      const parsedUser = JSON.parse(savedUserRaw);
      if (parsedUser && (parsedUser.id || parsedUser.username)) {
        let q = supabase.from('profiles').select('*');
        if (parsedUser.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(parsedUser.id))) {
          q = q.eq('id', parsedUser.id);
        } else {
          q = q.ilike('username', String(parsedUser.username || parsedUser.id));
        }
        const { data: freshProfile } = await q.maybeSingle();
        const userProfile = freshProfile ? {
          id: freshProfile.id,
          email: parsedUser.email || (freshProfile.username + '@idep.local'),
          username: freshProfile.username,
          name: freshProfile.full_name || freshProfile.name || freshProfile.username,
          role: freshProfile.role || 'Kasir',
          phone: freshProfile.phone || ''
        } : parsedUser;

        window.CURRENT_SESSION = { access_token: savedToken, user: userProfile };
        window.CURRENT_USER_PROFILE = userProfile;
        const userDisplayName = userProfile.name || userProfile.username;
        const userRole = userProfile.role || 'Kasir';
        localStorage.setItem('ekasir_user', userDisplayName);
        localStorage.setItem('ekasir_role', userRole);
        sessionStorage.setItem('ekasir_user', userDisplayName);
        sessionStorage.setItem('ekasir_role', userRole);
        localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
        return userProfile;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Helper Pemotongan Stok FIFO Multi-Batch Tanpa Ketergantungan RPC Database
 */
async function consumeStockFIFOClient(productId, qtyNeeded, refId, refNo, mutationType = 'KELUAR_PENJUALAN', preferredBatchId = null) {
  if (!supabase) throw new Error('Supabase client belum siap.');
  qtyNeeded = Number(qtyNeeded || 0);
  if (qtyNeeded <= 0) {
    return { total_cost: 0, batch_codes: [], primary_batch_id: null, primary_expiry: null };
  }

  // 1. Ambil daftar stock_batches untuk productId yang qty_remaining > 0
  const { data: batches, error } = await supabase
    .from('stock_batches')
    .select('*')
    .eq('product_id', productId)
    .gt('qty_remaining', 0)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('production_date', { ascending: true });

  if (error) throw error;
  let batchList = batches ? [...batches] : [];

  // Jika preferredBatchId diisi, dahulukan batch tersebut
  if (preferredBatchId) {
    const prefIdx = batchList.findIndex(b => b.id === preferredBatchId || b.batch_code === preferredBatchId || b.batch_no === preferredBatchId);
    if (prefIdx > 0) {
      const pref = batchList.splice(prefIdx, 1)[0];
      batchList.unshift(pref);
    }
  }

  let remainingToDeduct = qtyNeeded;
  let totalCost = 0;
  const batchCodes = [];
  let primaryBatchId = null;
  let primaryExpiry = null;

  for (const batch of batchList) {
    if (remainingToDeduct <= 0) break;
    const currentQty = Number(batch.qty_remaining || 0);
    if (currentQty <= 0) continue;

    const deduct = Math.min(remainingToDeduct, currentQty);
    const newQty = currentQty - deduct;
    const unitCost = Number(batch.cost_per_unit !== undefined && batch.cost_per_unit !== null ? batch.cost_per_unit : (batch.buy_price || 0));
    totalCost += deduct * unitCost;

    const bCode = batch.batch_code || batch.batch_no || batch.id;
    if (!batchCodes.includes(bCode)) batchCodes.push(bCode);
    if (!primaryBatchId) {
      primaryBatchId = batch.id;
      primaryExpiry = batch.expiry_date || null;
    }

    // Update qty_remaining di stock_batches
    await supabase
      .from('stock_batches')
      .update({ qty_remaining: newQty, updated_at: new Date().toISOString() })
      .eq('id', batch.id);

    // Catat ke stock_movements
    try {
      await supabase.from('stock_movements').insert({
        id: crypto.randomUUID(),
        product_id: productId,
        batch_id: batch.id,
        movement_type: 'OUT',
        qty: deduct,
        reference_type: mutationType === 'KELUAR_KONSINYASI' ? 'consignment_out' : 'sale',
        reference_id: refId || '',
        notes: `Pengeluaran ${deduct} unit (${refNo || refId || 'FIFO'})`
      });
    } catch (e) {
      console.warn('[FIFO] Gagal catat stock_movements:', e);
    }

    // Catat ke stock_mutations
    try {
      const mutRecord = {
        id: crypto.randomUUID(),
        product_id: productId,
        batch_id: batch.id,
        mutation_type: mutationType || 'KELUAR_PENJUALAN',
        qty_change: -deduct,
        qty_after: newQty,
        reference_no: refNo || refId || '',
        notes: `FIFO Out: ${refNo || refId}`
      };
      await supabase.from('stock_mutations').insert(mutRecord);
      if (typeof saveMutationToLocalBackup === 'function') {
        saveMutationToLocalBackup(mutRecord);
      }
    } catch (e) {
      console.warn('[FIFO] Gagal catat stock_mutations:', e);
    }

    remainingToDeduct -= deduct;
  }

  // Sinkronkan kolom stock di tabel products dari total qty_remaining stock_batches
  let syncedRemainingStock = null;
  try {
    const { data: allB } = await supabase
      .from('stock_batches')
      .select('qty_remaining')
      .eq('product_id', productId);
    const totalRemaining = (allB || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);
    syncedRemainingStock = totalRemaining;
    await supabase
      .from('products')
      .update({ stock: totalRemaining })
      .eq('id', productId);
  } catch (e) {
    console.warn('[FIFO] Gagal sinkronkan total stok produk:', e);
  }

  return {
    total_cost: totalCost,
    batch_codes: batchCodes,
    primary_batch_id: primaryBatchId,
    primary_expiry: primaryExpiry,
    remaining_stock: syncedRemainingStock
  };
}
window.consumeStockFIFOClient = consumeStockFIFOClient;


// ==============================================================================
// 4. API BRIDGE: IMPLEMENTASI LENGKAP PENGGANTI `api(fnName, ...args)`
// ==============================================================================

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
      return (data || []).map(u => ({
        ...u,
        username: u.username || '',
        full_name: u.full_name || u.name || u.username || '',
        name: u.name || u.full_name || u.username || '',
        role: u.role || 'Kasir'
      }));
    }

    case 'getBatchRecallContacts': {
      const [, batchId] = args;
      const [batchRes, claimsCountRes, txItemsRes, consignRes] = await Promise.all([
        supabase.from('stock_batches').select('*, products(name, category)').or(`id.eq.${batchId},batch_no.eq.${batchId}`).maybeSingle(),
        supabase.from('after_sales_claims').select('id', { count: 'exact', head: true }).eq('batch_id', batchId),
        supabase.from('transaction_items').select('*, transactions(invoice_no, customer_name, customer_phone, created_at)').eq('batch_id', batchId),
        supabase.from('consignment_transfer_items').select('*, consignment_transfers(invoice_no, transfer_date, outlets(name, phone))').eq('batch_id', batchId)
      ]);

      const bData = batchRes.data || {};
      const prodName = bData.products?.name || bData.product_name || 'Benih';
      const batchInfo = {
        id: batchId,
        product_name: prodName,
        quality_status: bData.quality_status || 'NORMAL',
        farmer_name: bData.farmer_name || '-',
        production_date: bData.production_date ? formatDateIndo(bData.production_date) : '-',
        expiry_date: bData.expiry_date ? formatDateIndo(bData.expiry_date) : '-',
        qty_remaining: Number(bData.qty_remaining || 0),
        complaint_count: claimsCountRes.count || 0
      };

      const contacts = [];
      let totalDistributed = 0;

      (txItemsRes.data || []).forEach(it => {
        const tx = it.transactions || {};
        const qty = Number(it.qty || 0);
        totalDistributed += qty;
        const phone = (tx.customer_phone || '').trim();
        let waLink = '';
        if (phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
          const msg = encodeURIComponent(`Halo ${tx.customer_name || 'Bpk/Ibu'}, kami dari Kios IDEP ingin mengonfirmasi terkait benih ${prodName} (Batch: ${batchId}) yang Anda beli pada ${formatDateIndo(tx.created_at)}.`);
          waLink = `https://wa.me/${cleanPhone}?text=${msg}`;
        }
        contacts.push({
          category: 'Pelanggan POS',
          ref_no: tx.invoice_no || it.transaction_id || '-',
          date: formatDateIndo(tx.created_at),
          name: tx.customer_name || 'Pelanggan POS',
          phone: phone,
          qty: qty,
          wa_link: waLink
        });
      });

      (consignRes.data || []).forEach(it => {
        const tr = it.consignment_transfers || {};
        const outlet = tr.outlets || {};
        const qty = Number(it.qty || 0);
        totalDistributed += qty;
        const phone = (outlet.phone || '').trim();
        let waLink = '';
        if (phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
          const msg = encodeURIComponent(`Halo ${outlet.name || 'Mitra Outlet'}, kami dari Kios IDEP ingin mengonfirmasi terkait stok benih ${prodName} (Batch: ${batchId}) pada Surat Jalan ${tr.invoice_no || '-'}.`);
          waLink = `https://wa.me/${cleanPhone}?text=${msg}`;
        }
        contacts.push({
          category: 'Outlet Konsinyasi',
          ref_no: tr.invoice_no || '-',
          date: formatDateIndo(tr.transfer_date),
          name: outlet.name || 'Outlet Konsinyasi',
          phone: phone,
          qty: qty,
          wa_link: waLink
        });
      });

      return {
        batch_info: batchInfo,
        contacts: contacts,
        total_qty_distributed: totalDistributed
      };
    }

    case 'saveUser': {
      const [, payload] = args;
      if (!payload || !String(payload.username || '').trim()) {
        throw new Error('Username wajib diisi.');
      }
      const cleanUsername = String(payload.username).trim();
      const rawId = String(payload.id || '').trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
      let targetId = isUuid ? rawId : null;
      let isExistingUser = Boolean(rawId);

      // Cek apakah username sudah ada di database
      const { data: existingByUsername } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (!isExistingUser && existingByUsername && existingByUsername.id) {
        throw new Error('Username "' + cleanUsername + '" sudah digunakan oleh akun lain. Silakan pilih username lain.');
      }

      if (!targetId && existingByUsername && existingByUsername.id) {
        targetId = existingByUsername.id;
      }
      if (!targetId) {
        targetId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
      }

      const displayName = String(payload.name || payload.full_name || cleanUsername).trim();
      const targetRole = String(cleanUsername).toLowerCase() === 'admin' ? 'Admin' : (payload.role || 'Kasir');
      const nowIso = new Date().toISOString();

      const upsertData = {
        id: targetId,
        username: cleanUsername,
        full_name: displayName,
        name: displayName,
        role: targetRole,
        updated_at: nowIso
      };
      if (!isExistingUser) {
        upsertData.created_at = nowIso;
      }
      if (payload.password && String(payload.password).trim() !== '') {
        upsertData.password = String(payload.password);
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(upsertData)
        .select()
        .single();
      if (error) throw error;
      return { success: true, user: data };
    }

    case 'deleteUser': {
      const [, userId, username] = args;
      const checkName = String(username || userId || '').trim().toLowerCase();
      if (checkName === 'admin') {
        throw new Error('Akun administrator utama tidak dapat dihapus.');
      }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId || ''));
      if (isUuid) {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
      }
      if (username && String(username).trim()) {
        await supabase.from('profiles').delete().ilike('username', String(username).trim());
      } else if (!isUuid && userId) {
        const { error } = await supabase.from('profiles').delete().ilike('username', String(userId).trim());
        if (error) throw error;
      }
      return { success: true };
    }

    // --------------------------------------------------------------------------
    // B. MASTER PRODUK, KEMASAN & PRICE TIERS
    // --------------------------------------------------------------------------
    case 'getProducts': {
      const [prodsRes, batchesRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            price_tiers (*),
            packaging_types (*)
          `)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('stock_batches')
          .select('*')
          .gt('qty_remaining', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('production_date', { ascending: true })
      ]);

      if (prodsRes.error) throw prodsRes.error;

      // Susun mapping batch dan total stok aktif per product_id
      const batchMap = {};
      const stockMap = {};
      (batchesRes.data || []).forEach(b => {
        const qStatus = String(b.quality_status || 'NORMAL').toUpperCase();
        const qcStatus = String(b.qc_status || 'APPROVED').toUpperCase();
        if (qStatus !== 'QUARANTINE' && qcStatus !== 'REJECTED') {
          if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
          batchMap[b.product_id].push(b);
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + Number(b.qty_remaining || 0);
        }
      });

      return (prodsRes.data || []).map(p => ({
        id: p.id,
        sku: p.sku || '',
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
        priceTiers: p.price_tiers || [],
        packaging: p.packaging_types || null
      }));
    }

    case 'saveProduct': {
      const [, payload] = args;
      const isSeed = String(payload.product_type || payload.category || '').toLowerCase().includes('benih');
      const productObj = {
        name: payload.name,
        ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
        category: payload.category || 'Benih',
        product_type: payload.product_type || 'raw_seed',
        variant: payload.variant || '',
        unit: payload.unit || 'pcs',
        photo_url: payload.photo_url || '',
        packaging_type_id: payload.packaging_type_id || null,
        harvest_days: Number(payload.harvest_days) || 0,
        is_active: payload.active !== false,
        active: payload.active !== false,
        is_seed: isSeed
      };

      let productId = payload.id;
      if (productId) {
        const { error } = await supabase.from('products').update(productObj).eq('id', productId);
        if (error) throw error;
      } else {
        const newId = crypto.randomUUID();
        const insertObj = {
          id: newId,
          ...productObj
        };
        const { data, error } = await supabase.from('products').insert(insertObj).select('id').single();
        if (error) throw error;
        productId = data ? data.id : newId;
      }

      if (Array.isArray(payload.priceTiers)) {
        await supabase.from('price_tiers').delete().eq('product_id', productId);
        const tiersToInsert = payload.priceTiers
          .filter(t => t.tier_name && Number(t.price) >= 0)
          .map(t => ({
            id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
            product_id: productId,
            tier_name: t.tier_name,
            price: Number(t.price)
          }));
        if (tiersToInsert.length > 0) {
          await supabase.from('price_tiers').insert(tiersToInsert);
        }
      }

      return { success: true, id: productId, message: 'Produk berhasil disimpan.' };
    }

    case 'deleteProduct': {
      const [, productId] = args;
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);
      if (error) throw error;
      return { success: true };
    }

    case 'importBulkProducts': {
      const [, productsArray] = args;
      const list = Array.isArray(productsArray) ? productsArray : (Array.isArray(args[0]) ? args[0] : []);
      if (!list || list.length === 0) {
        return { success: true, count: 0, totalRequested: 0, errors: [], message: 'Tidak ada data produk untuk diimpor.' };
      }

      // 1. Kumpulkan list SKU untuk query eksisting di database
      const skuList = list
        .map(p => String(p.sku || p.SKU || '').trim())
        .filter(Boolean);

      const existingMap = {};
      if (skuList.length > 0) {
        const { data: existingData, error: fetchErr } = await supabase
          .from('products')
          .select('id, sku, name')
          .in('sku', skuList);
        if (fetchErr) throw fetchErr;
        (existingData || []).forEach(p => {
          if (p.sku) existingMap[p.sku.toLowerCase()] = p;
        });
      }

      let totalSuccess = 0;
      const errors = [];

      for (const item of list) {
        try {
          const sku = String(item.sku || item.SKU || '').trim();
          const name = String(item.name || item.nama_produk || item.Nama_Produk || '').trim();
          if (!sku || !name) {
            continue; // Lewati baris tanpa SKU atau Nama
          }

          const category = String(item.category || item.kategori || item.Kategori || 'Benih').trim() || 'Benih';
          const productType = String(item.product_type || item.tipe_produk || item.Tipe_Produk || 'Benih').trim() || 'Benih';
          const unit = String(item.unit || item.satuan || item.Satuan || 'pcs').trim() || 'pcs';
          const harvestDays = Number(item.harvest_days || item.umur_panen || item.Umur_Panen) || 0;
          const isSeed = (category + ' ' + productType).toLowerCase().includes('benih');

          let productId;
          const existing = existingMap[sku.toLowerCase()];

          if (existing) {
            productId = existing.id;
            const { error: updErr } = await supabase
              .from('products')
              .update({
                name: name,
                category: category,
                product_type: productType,
                unit: unit,
                harvest_days: harvestDays,
                is_active: true,
                active: true,
                is_seed: isSeed,
                updated_at: new Date().toISOString()
              })
              .eq('id', productId);
            if (updErr) throw updErr;
          } else {
            productId = crypto.randomUUID();
            const { error: insErr } = await supabase
              .from('products')
              .insert({
                id: productId,
                sku: sku,
                name: name,
                category: category,
                product_type: productType,
                variant: item.variant || '',
                unit: unit,
                harvest_days: harvestDays,
                is_active: true,
                active: true,
                is_seed: isSeed,
                stock: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            if (insErr) throw insErr;
            // Catat ke map jika ada kemunculan SKU yang sama berikutnya
            existingMap[sku.toLowerCase()] = { id: productId, sku: sku, name: name };
          }

          // Parse Price Tiers: Reguler, Outlet, Bali Buda
          const parseNum = (val) => {
            if (val === undefined || val === null) return null;
            let str = String(val).trim().replace(/^Rp\\.?\\s*/i, '');
            if (!str) return null;
            if (/^\\d{1,3}(\\.\\d{3})+$/.test(str)) {
              str = str.replace(/\\./g, '');
            } else if (/^\\d{1,3}(,\\d{3})+$/.test(str)) {
              str = str.replace(/,/g, '');
            } else {
              str = str.replace(/[^0-9.-]/g, '');
            }
            if (!str) return null;
            const num = Number(str);
            return isNaN(num) ? null : num;
          };

          const pReg = parseNum(item.harga_reguler ?? item.Harga_Reguler ?? item.reguler ?? item.price_reguler);
          const pOut = parseNum(item.harga_outlet ?? item.Harga_Outlet ?? item.outlet ?? item.price_outlet);
          const pBB = parseNum(item.harga_bali_buda ?? item.Harga_Bali_Buda ?? item.bali_buda ?? item.price_bali_buda);

          const tiersToInsert = [];
          if (pReg !== null && pReg >= 0) {
            tiersToInsert.push({
              id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
              product_id: productId,
              tier_name: 'Reguler',
              price: pReg
            });
          }
          if (pOut !== null && pOut >= 0) {
            tiersToInsert.push({
              id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
              product_id: productId,
              tier_name: 'Outlet',
              price: pOut
            });
          }
          if (pBB !== null && pBB >= 0) {
            tiersToInsert.push({
              id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
              product_id: productId,
              tier_name: 'Bali Buda',
              price: pBB
            });
          }

          if (Array.isArray(item.priceTiers)) {
            item.priceTiers.forEach(pt => {
              const ptPrice = parseNum(pt.price);
              if (pt.tier_name && ptPrice !== null && ptPrice >= 0) {
                if (!tiersToInsert.some(t => t.tier_name.toLowerCase() === String(pt.tier_name).toLowerCase())) {
                  tiersToInsert.push({
                    id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
                    product_id: productId,
                    tier_name: String(pt.tier_name).trim(),
                    price: ptPrice
                  });
                }
              }
            });
          }

          if (tiersToInsert.length > 0) {
            await supabase.from('price_tiers').delete().eq('product_id', productId);
            const { error: tierErr } = await supabase.from('price_tiers').insert(tiersToInsert);
            if (tierErr) throw tierErr;
          }

          totalSuccess++;
        } catch (itemErr) {
          console.error('Error importing product item:', item, itemErr);
          errors.push({ sku: item.sku || item.SKU, error: itemErr.message || String(itemErr) });
        }
      }

      return {
        success: true,
        count: totalSuccess,
        totalRequested: list.length,
        errors: errors,
        message: 'Berhasil mengimpor/memperbarui ' + totalSuccess + ' produk katalog.'
      };
    }

    // --------------------------------------------------------------------------
    // C. POS INITIAL DATA & TRANSAKSI
    // --------------------------------------------------------------------------
    case 'getPosInitData': {
      const [productsRes, batchesRes, tiersRes, customersRes, settingsRes] = await Promise.all([
        supabase.from('products').select(`*, packaging_types(*)`).eq('is_active', true),
        supabase.from('stock_batches')
          .select('*')
          .gt('qty_remaining', 0)
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('production_date', { ascending: true }),
        supabase.from('price_tiers').select('*'),
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase.from('settings').select('*')
      ]);

      const batchMap = {};
      const stockMap = {};
      (batchesRes.data || []).forEach(b => {
        const qStatus = String(b.quality_status || 'NORMAL').toUpperCase();
        const qcStatus = String(b.qc_status || 'APPROVED').toUpperCase();
        if (qStatus !== 'QUARANTINE' && qcStatus !== 'REJECTED') {
          if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
          batchMap[b.product_id].push(b);
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + Number(b.qty_remaining || 0);
        }
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
        priceTiers: ['Reguler', 'Outlet', 'Bali Buda'],
        customers: customersRes.data || [],
        settings: (settingsRes?.data || []).reduce((acc, s) => {
          if (s && s.key) acc[s.key] = s.value;
          return acc;
        }, {})
      };
    }

    case 'createTransaction': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;

      const consumedItems = [];
      const txId = crypto.randomUUID();
      const invoiceNo = payload.invoice_no || `INV-${Date.now().toString().slice(-6)}`;

      // Hitung subtotal, tax, dan total
      let calcSubtotal = 0;
      for (const item of (payload.items || [])) {
        calcSubtotal += Number(item.qty || 0) * Number(item.price || 0);
      }
      const subtotal = payload.subtotal !== undefined ? Number(payload.subtotal) : calcSubtotal;
      const taxRate = Number(payload.taxRate || 0);
      const tax = payload.tax !== undefined ? Number(payload.tax) : Math.round(subtotal * taxRate);
      const total = payload.total !== undefined ? Number(payload.total) : (subtotal + tax);

      // Pendaftaran pelanggan otomatis jika opsi save_as_member aktif
      let customerId = (payload.customer_id && String(payload.customer_id).trim() !== '') ? payload.customer_id : null;
      if (!customerId && payload.save_as_member && payload.customer_name) {
        try {
          const newCustId = crypto.randomUUID();
          const { data: newCust, error: custErr } = await supabase.from('customers').insert({
            id: newCustId,
            name: String(payload.customer_name).trim(),
            phone: payload.customer_phone ? String(payload.customer_phone).trim() : '',
            category: 'Reguler'
          }).select().single();
          if (!custErr && newCust) {
            customerId = newCust.id;
          }
        } catch (e) {
          console.warn('[POS] Gagal mendaftarkan pelanggan otomatis:', e);
        }
      }

      // Pemotongan stok multi-batch FIFO client
      const lowStockAfterSale = [];
      for (const item of (payload.items || [])) {
        const prefBatch = item.batch_id || item.selected_batch_id || null;
        const fifoResult = await consumeStockFIFOClient(
          item.product_id,
          Number(item.qty),
          txId,
          invoiceNo,
          'KELUAR_PENJUALAN',
          prefBatch
        );

        if (fifoResult.remaining_stock !== null && fifoResult.remaining_stock !== undefined && fifoResult.remaining_stock <= 5) {
          lowStockAfterSale.push({
            name: item.name || item.product_name || 'Produk',
            remaining: fifoResult.remaining_stock,
            unit: item.unit || 'pcs'
          });
        }

        consumedItems.push({
          transaction_id: txId,
          product_id: item.product_id,
          batch_id: fifoResult.primary_batch_id || prefBatch,
          qty: Number(item.qty),
          price: Number(item.price),
          cost: Number(fifoResult.total_cost || 0),
          subtotal: Number(item.subtotal || (Number(item.qty) * Number(item.price)))
        });
      }

      const txStatus = payload.payment_type === 'installment' ? 'tempo' : 'paid';
      const txInsertData = {
        id: txId,
        invoice_no: invoiceNo,
        customer_id: customerId,
        customer_name: payload.customer_name || 'Pelanggan Umum',
        source: payload.source || 'POS',
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_method: payload.payment_method || 'CASH',
        payment_type: payload.payment_type || 'cash',
        status: txStatus
      };

      if (payload.transaction_date) {
        try {
          const parsedD = new Date(payload.transaction_date);
          if (!isNaN(parsedD.getTime())) {
            txInsertData.created_at = parsedD.toISOString();
          }
        } catch (e) {}
      }

      const { data: txRecord, error: txErr } = await supabase.from('transactions').insert(txInsertData).select().single();
      if (txErr) throw txErr;

      const { error: itemsErr } = await supabase.from('transaction_items').insert(consumedItems);
      if (itemsErr) throw itemsErr;

      if (payload.payment_type === 'installment') {
        const paidAmount = Number(payload.downPayment !== undefined ? payload.downPayment : (payload.paid_amount || 0));
        const totalAmount = total;
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          transaction_id: txId,
          customer_id: customerId,
          total: totalAmount,
          paid: paidAmount,
          remaining: remainingAmount,
          due_date: payload.due_date || null,
          status: 'active'
        });
      }

      emitOperationalNotification({
        title: '💰 Transaksi Baru ' + invoiceNo,
        body: (payload.customer_name || 'Pelanggan Umum') + ' • Rp ' + Number(total || 0).toLocaleString('id-ID') + ' (' + (payload.payment_type === 'installment' ? 'Tempo/Piutang' : (payload.payment_method || 'CASH')) + ')',
        category: 'sales',
        route: '#faktur',
        urgent: false
      });

      if (lowStockAfterSale.length > 0) {
        const hasZeroStock = lowStockAfterSale.some(s => Number(s.remaining) <= 0);
        const lowSummary = lowStockAfterSale.slice(0, 3).map(s => s.name + ' (sisa ' + s.remaining + ' ' + s.unit + ')').join(', ');
        emitOperationalNotification({
          title: hasZeroStock ? '🔴 Stok Habis Pasca Transaksi!' : '⚠️ Stok Menipis Pasca Transaksi',
          body: lowSummary + (lowStockAfterSale.length > 3 ? ' +' + (lowStockAfterSale.length - 3) + ' produk lainnya' : '') + ' setelah nota ' + invoiceNo + '.',
          category: 'stock',
          route: '#stok',
          urgent: hasZeroStock
        });
      }

      return {
        success: true,
        id: txId,
        transaction_id: txId,
        invoice_no: invoiceNo,
        subtotal: subtotal,
        tax: tax,
        total: total,
        date: txRecord?.created_at || new Date().toISOString(),
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
      emitOperationalNotification({
        title: '🚨 Nota Dibatalkan (VOID)',
        body: 'Transaksi #' + transactionId + ' dibatalkan. Alasan: ' + (voidReason || 'Pembatalan nota kasir'),
        category: 'security',
        route: '#faktur',
        urgent: true
      });
      return data;
    }

    case 'getTransactionDetail': {
      const [, transactionId] = args;

      let txQuery = supabase.from('transactions').select('*');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
        txQuery = txQuery.or(`id.eq.${transactionId},invoice_no.eq.${transactionId}`);
      } else {
        txQuery = txQuery.eq('invoice_no', transactionId);
      }

      const txRes = await txQuery.maybeSingle();
      if (txRes.error) throw txRes.error;
      if (!txRes.data) throw new Error(`Data transaksi #${transactionId} tidak ditemukan.`);
      const tx = txRes.data;
      let normStatus = String(tx.status || '').toLowerCase();
      if (normStatus === 'completed') normStatus = 'paid';
      const normTx = { ...tx, status: normStatus };

      const itemsRes = await supabase
        .from('transaction_items')
        .select('*, products(name, unit)')
        .eq('transaction_id', tx.id);

      if (itemsRes.error) throw itemsRes.error;

      return {
        transaction: normTx,
        items: (itemsRes.data || []).map(i => {
          const pName = i.products ? i.products.name : (i.product_name || i.name || 'Produk');
          const pUnit = i.products ? i.products.unit : (i.unit || 'pcs');
          return {
            ...i,
            name: pName,
            product_name: pName,
            unit: pUnit
          };
        })
      };
    }

    // --------------------------------------------------------------------------
    // D. PENGADAAN (PURCHASES, SUPPLIERS, FARMERS)
    // --------------------------------------------------------------------------
    case 'getPurchases': {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(name), farmers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        supplier_name: p.suppliers ? p.suppliers.name : '(tidak diketahui)',
        farmer_name: p.farmers ? p.farmers.name : (p.farmer_name || '-')
      }));
    }

    case 'createPurchase': {
      const [, purchase] = args;
      const purchaseId = crypto.randomUUID();
      const invoiceNo = purchase.invoice_no || `PUR-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      // 1. Simpan Header Pembelian
      const { error: purErr } = await supabase.from('purchases').insert({
        id: purchaseId,
        invoice_no: invoiceNo,
        supplier_id: purchase.supplier_id || null,
        farmer_id: purchase.farmer_id || null,
        total: Number(purchase.total || 0),
        notes: purchase.notes || ''
      });
      if (purErr) throw purErr;

      // 2. Simpan Item-Item menjadi Purchase Items, Stock Batches, dan Stock Movements
      for (const item of (purchase.items || [])) {
        const batchId = crypto.randomUUID();
        const batchCode = item.batch_no ? String(item.batch_no).trim() : `B-${Date.now().toString().slice(-6)}`;
        const qtyIn = Number(item.qty || 0);
        const buyPrice = Number(item.buy_price || 0);

        // Identifikasi apakah produk curah (berdasarkan unit 'gr'/'gram', inventory_type 'curah', atau flag is_curah)
        const unitLower = String(item.unit || '').toLowerCase().trim();
        const invLower = String(item.inventory_type || '').toLowerCase().trim();
        const isCurah = Boolean(item.is_curah) || unitLower === 'gr' || unitLower === 'gram' || invLower === 'curah' || invLower === 'curah mentah';

        const additionalCost = isCurah ? 0 : Number(item.additional_cost || 0);
        const costPerUnit = isCurah ? buyPrice : Number(item.cost_per_unit !== undefined ? item.cost_per_unit : (buyPrice + additionalCost));

        // Benih curah masuk ke antrean PENDING_QC; non-benih/pabrikan langsung APPROVED & NORMAL
        const isSeed = item.is_seed !== false && item.category !== 'Non-Benih';
        const qcStatus = isSeed ? 'PENDING_QC' : 'APPROVED';
        const qualityStatus = isSeed ? 'QUARANTINE' : 'NORMAL';

        // 2a. Simpan ke purchase_items jika tabel tersedia
        try {
          await supabase.from('purchase_items').insert({
            purchase_id: purchaseId,
            product_id: item.product_id,
            batch_no: batchCode,
            qty: qtyIn,
            buy_price: buyPrice,
            additional_cost: isCurah ? 0 : additionalCost,
            cost_per_unit: isCurah ? buyPrice : costPerUnit,
            subtotal: qtyIn * (isCurah ? buyPrice : costPerUnit),
            production_date: item.production_date || null,
            expiry_date: item.expiry_date || null
          });
        } catch (itemErr) {
          console.warn('[Supabase] Warning saat insert purchase_items:', itemErr);
        }

        // 2b. Simpan ke stock_batches (cost_per_unit = HPP Final Landed Cost, buy_price = harga beli dasar)
        await supabase.from('stock_batches').insert({
          id: batchId,
          batch_code: batchCode,
          product_id: item.product_id,
          purchase_id: purchaseId,
          qty_in: qtyIn,
          qty_remaining: qtyIn,
          buy_price: buyPrice,
          cost_per_unit: isCurah ? buyPrice : costPerUnit,
          production_date: item.production_date || null,
          expiry_date: item.expiry_date || null,
          quality_status: qualityStatus,
          qc_status: qcStatus
        });

        // 2c. Simpan riwayat mutasi masuk (legacy)
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          batch_id: batchId,
          type: 'purchase_in',
          qty: qtyIn,
          ref_id: purchaseId,
          notes: `Pembelian #${invoiceNo}`
        });

        // 2d. Integrasi Log Mutasi Terpusat: MASUK_PEMBELIAN (+qty, reference_no: invoiceNo)
        try {
          const itemUnit = item.unit || 'pcs';
          const purchaseMutation = {
            id: crypto.randomUUID(),
            product_id: item.product_id,
            batch_id: batchId,
            reference_no: invoiceNo,
            mutation_type: 'MASUK_PEMBELIAN',
            qty: qtyIn, // angka positif
            unit: itemUnit,
            notes: `Faktur Pembelian #${invoiceNo} (Batch: ${batchCode})`,
            created_at: now
          };
          await supabase.from('stock_mutations').insert(purchaseMutation);
          saveMutationToLocalBackup(purchaseMutation);
        } catch (mutErr) {
          console.warn('[Supabase] Warning saat insert stock_mutations (createPurchase):', mutErr);
          saveMutationToLocalBackup({
            id: crypto.randomUUID(),
            product_id: item.product_id,
            batch_id: batchId,
            reference_no: invoiceNo,
            mutation_type: 'MASUK_PEMBELIAN',
            qty: qtyIn,
            unit: item.unit || 'pcs',
            notes: `Faktur Pembelian #${invoiceNo} (Batch: ${batchCode})`,
            created_at: now
          });
        }
      }

      return { success: true, id: purchaseId, message: 'Faktur pembelian berhasil disimpan.' };
    }

    case 'deletePurchase': {
      const [, purchaseId] = args;
      try {
        await supabase.from('purchase_items').delete().eq('purchase_id', purchaseId);
      } catch (e) { }
      await supabase.from('stock_batches').delete().eq('purchase_id', purchaseId);
      await supabase.from('stock_movements').delete().eq('ref_id', purchaseId);
      const { error } = await supabase.from('purchases').delete().eq('id', purchaseId);
      if (error) throw error;
      return { success: true };
    }

    case 'getSuppliers': {
      const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'saveSupplier': {
      const [, supplier] = args;
      const { data, error } = await supabase.from('suppliers').upsert(supplier).select().single();
      if (error) throw error;
      return { success: true, id: data.id };
    }

    case 'getFarmers': {
      const { data, error } = await supabase.from('farmers').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'saveFarmer': {
      const [, farmer] = args;
      const code = farmer.code || (farmer.name ? farmer.name.slice(0, 3).toUpperCase() : 'FAR');
      const { data, error } = await supabase.from('farmers').upsert({
        ...farmer,
        code: code
      }).select().single();
      if (error) throw error;
      return { success: true, id: data.id, name: data.name, code: data.code };
    }

    // --------------------------------------------------------------------------
    // E. PRODUKSI & PENGEMASAN MANDIRI (PRODUCTIONS)
    // --------------------------------------------------------------------------
    case 'getProductions': {
      let prods = [];
      try {
        const { data, error } = await supabase
          .from('productions')
          .select(`
            *,
            source_product:products!productions_source_product_id_fkey (name),
            target_product:products!productions_target_product_id_fkey (name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        prods = data || [];
      } catch (relErr) {
        console.warn('[Supabase] Warning getProductions join fkey gagal, fallback ke select *:', relErr);
        // Fallback: select tanpa explicit foreign key alias
        const { data: rawProds, error: rawErr } = await supabase
          .from('productions')
          .select('*')
          .order('created_at', { ascending: false });
        if (rawErr) throw rawErr;

        // Ambil mapping nama produk
        const { data: prodsList } = await supabase.from('products').select('id, name');
        const pMap = {};
        (prodsList || []).forEach(p => { pMap[p.id] = p.name; });

        prods = (rawProds || []).map(p => ({
          ...p,
          source_product: { name: pMap[p.source_product_id] || '(dihapus)' },
          target_product: { name: pMap[p.target_product_id] || '(dihapus)' }
        }));
      }

      return (prods || []).map(p => {
        const costPerUnit = Number(p.cost_per_unit !== undefined && p.cost_per_unit !== null ? p.cost_per_unit : (p.hpp_per_piece || 0));
        return {
          ...p,
          source_name: p.source_product ? p.source_product.name : '(dihapus)',
          target_name: p.target_product ? p.target_product.name : '(dihapus)',
          seed_cost: Number(p.seed_cost || 0),
          packaging_cost: Number(p.packaging_cost || 0),
          cost_per_unit: costPerUnit,
          hpp_per_piece: costPerUnit
        };
      });
    }

    case 'processProduction': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;
      const prodId = crypto.randomUUID();
      const grams = Number(payload.gram_used || 0);
      const pcs = Number(payload.pcs_produced || 0);
      const seedCost = Number(payload.seed_cost || 0);
      const packagingCost = Number(payload.packaging_cost || 0);

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

      // Ambil HPP per gram dari batch curah terpilih (sourceBatch.cost_per_unit atau fallback ke sourceBatch.buy_price)
      const hppPerGram = Number(srcBatch.cost_per_unit !== undefined && srcBatch.cost_per_unit !== null
        ? srcBatch.cost_per_unit
        : (srcBatch.buy_price || payload.hpp_per_gram || 0));

      const biayaKemasanPerPcs = Number(payload.packaging_cost_per_unit !== undefined
        ? payload.packaging_cost_per_unit
        : (pcs > 0 ? (packagingCost / pcs) : 0));

      // Hitung:
      // modalBenihPerPcs = (gramDiambil * hppPerGram) / pcsRiil
      // hppFinalSachet = modalBenihPerPcs + biayaKemasanPerPcs
      const modalBenihPerPcs = pcs > 0 ? ((grams * hppPerGram) / pcs) : 0;
      const modalBenihRounded = Math.round(modalBenihPerPcs || 0);
      const hppFinalSachet = Math.round((modalBenihPerPcs || 0) + (biayaKemasanPerPcs || 0));

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
        notes: `Pengemasan benih menjadi ${pcs} kemasan (Batch: ${payload.lot_no || srcBatch.batch_code})`,
        created_by: user ? user.id : null
      });

      // 2. Buat batch baru untuk produk kemasan jadi (stock_batches)
      // Hormati prinsip lot traceability 1:1 mengikuti nomor batch bahan mentah
      const targetBatchId = crypto.randomUUID();
      const targetBatchCode = payload.lot_no || payload.source_batch_code || srcBatch.batch_code || `PK-${Date.now().toString().slice(-6)}`;

      await supabase.from('stock_batches').insert({
        id: targetBatchId,
        batch_code: targetBatchCode,
        product_id: payload.target_product_id,
        qty_in: pcs,
        qty_remaining: pcs,
        buy_price: modalBenihRounded,
        cost_per_unit: hppFinalSachet,
        production_date: payload.production_date || srcBatch.production_date || new Date().toISOString().split('T')[0],
        expiry_date: payload.expiry_date || srcBatch.expiry_date || null,
        quality_status: 'NORMAL',
        qc_status: 'APPROVED',
        farmer_name: srcBatch.farmer_name || null
      });

      await supabase.from('stock_movements').insert({
        product_id: payload.target_product_id,
        batch_id: targetBatchId,
        type: 'production_in',
        qty: pcs,
        ref_id: prodId,
        notes: `Hasil pengemasan dari batch ${srcBatch.batch_code || payload.source_batch_id}`,
        created_by: user ? user.id : null
      });

      // 2b. Integrasi Log Kemas Mandiri Terpusat ke tabel stock_mutations
      try {
        let targetProdName = payload.target_product_name || '';
        if (!targetProdName) {
          const { data: tProd } = await supabase.from('products').select('name').eq('id', payload.target_product_id).maybeSingle();
          if (tProd) targetProdName = tProd.name;
        }
        const srcBatchCode = srcBatch.batch_code || payload.source_batch_id || '-';

        // a. Pengeluaran bahan baku curah:
        const curahMutation = {
          id: crypto.randomUUID(),
          product_id: payload.source_product_id,
          batch_id: payload.source_batch_id,
          reference_no: srcBatchCode,
          mutation_type: 'KELUAR_PRODUKSI',
          qty: -grams,
          unit: 'gr',
          notes: `Kemas Mandiri -> ${targetProdName || 'Kemasan Sachet'} (Batch Asal: ${srcBatchCode})`,
          created_at: new Date().toISOString()
        };

        // b. Pemasukan sachet hasil kemasan:
        const sachetMutation = {
          id: crypto.randomUUID(),
          product_id: payload.target_product_id,
          batch_id: targetBatchId,
          reference_no: targetBatchCode,
          mutation_type: 'MASUK_PRODUKSI',
          qty: pcs,
          unit: 'pcs',
          notes: `Hasil Kemas Mandiri Batch: ${targetBatchCode}`,
          created_at: new Date().toISOString()
        };

        await supabase.from('stock_mutations').insert([curahMutation, sachetMutation]);
        saveMutationToLocalBackup(curahMutation);
        saveMutationToLocalBackup(sachetMutation);
      } catch (mutErr) {
        console.warn('[Supabase] Warning saat insert stock_mutations (processProduction):', mutErr);
        const sCode = srcBatch.batch_code || payload.source_batch_id || '-';
        saveMutationToLocalBackup({
          id: crypto.randomUUID(),
          product_id: payload.source_product_id,
          batch_id: payload.source_batch_id,
          reference_no: sCode,
          mutation_type: 'KELUAR_PRODUKSI',
          qty: -grams,
          unit: 'gr',
          notes: `Kemas Mandiri -> ${payload.target_product_name || 'Kemasan Sachet'} (Batch Asal: ${sCode})`,
          created_at: new Date().toISOString()
        });
        saveMutationToLocalBackup({
          id: crypto.randomUUID(),
          product_id: payload.target_product_id,
          batch_id: targetBatchId,
          reference_no: targetBatchCode,
          mutation_type: 'MASUK_PRODUKSI',
          qty: pcs,
          unit: 'pcs',
          notes: `Hasil Kemas Mandiri Batch: ${targetBatchCode}`,
          created_at: new Date().toISOString()
        });
      }

      // 3. Sinkronisasi saldo stok tabel products:
      // A. Update kolom stock produk curah terkait di tabel products dengan sisa saldo terbarunya
      const { data: curSrcBatches } = await supabase
        .from('stock_batches')
        .select('qty_remaining')
        .eq('product_id', payload.source_product_id);
      const newSourceStock = (curSrcBatches || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);

      await supabase
        .from('products')
        .update({
          stock: newSourceStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.source_product_id);

      // B. Tambahkan pcs ke kolom stock produk kemasan sachet target di tabel products
      const { data: curTgtBatches } = await supabase
        .from('stock_batches')
        .select('qty_remaining')
        .eq('product_id', payload.target_product_id);
      const newTargetStock = (curTgtBatches || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);

      await supabase
        .from('products')
        .update({
          stock: newTargetStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.target_product_id);

      // 4. Simpan riwayat di tabel productions
      const { data: prodRecord, error: prdErr } = await supabase.from('productions').insert({
        id: prodId,
        source_product_id: payload.source_product_id,
        target_product_id: payload.target_product_id,
        source_batch_id: payload.source_batch_id,
        gram_used: grams,
        pcs_produced: pcs,
        gram_per_pack: Number(payload.gram_per_pack || 0),
        hpp_per_piece: hppFinalSachet,
        cost_per_unit: hppFinalSachet,
        packaging_cost_per_unit: biayaKemasanPerPcs,
        seed_cost: Math.round(grams * hppPerGram),
        packaging_cost: Math.round(biayaKemasanPerPcs * pcs)
      }).select().single();

      if (prdErr) throw prdErr;

      // 5. Simpan riwayat di tabel packaging_logs jika tersedia
      try {
        await supabase.from('packaging_logs').insert({
          id: prodId,
          production_id: prodId,
          source_product_id: payload.source_product_id,
          target_product_id: payload.target_product_id,
          source_batch_id: payload.source_batch_id,
          target_batch_id: targetBatchId,
          gram_used: grams,
          pcs_produced: pcs,
          cost_per_unit: hppFinalSachet,
          packaging_cost_per_unit: biayaKemasanPerPcs,
          buy_price: modalBenihRounded,
          created_at: new Date().toISOString()
        });
      } catch (pLogErr) {
        console.warn('[Supabase] Warning saat insert packaging_logs:', pLogErr);
      }

      return {
        success: true,
        id: prodId,
        hpp_per_piece: hppFinalSachet,
        cost_per_unit: hppFinalSachet,
        message: `Berhasil mengemas ${pcs} kemasan benih siap jual.`
      };
    }

    case 'deleteProduction': {
      const [, productionId] = args;
      // Ambil data produksi terlebih dahulu untuk rollback saldo
      const { data: prod, error: getErr } = await supabase
        .from('productions')
        .select('*')
        .eq('id', productionId)
        .maybeSingle();

      if (getErr) throw getErr;

      if (prod) {
        // 1. Kembalikan gram benih curah ke batch asal
        if (prod.source_batch_id && Number(prod.gram_used) > 0) {
          const { data: sBatch } = await supabase
            .from('stock_batches')
            .select('qty_remaining')
            .eq('id', prod.source_batch_id)
            .maybeSingle();
          if (sBatch) {
            await supabase.from('stock_batches').update({
              qty_remaining: Number(sBatch.qty_remaining || 0) + Number(prod.gram_used || 0),
              updated_at: new Date().toISOString()
            }).eq('id', prod.source_batch_id);
          }
        }

        // 2. Cari movement target kemasan jadi dan kurangi/hapus batch kemasan yang tercipta
        const { data: movs } = await supabase
          .from('stock_movements')
          .select('id, batch_id, qty, type')
          .eq('ref_id', productionId);

        if (movs && movs.length > 0) {
          for (const m of movs) {
            if (m.type === 'production_in' && m.batch_id) {
              const { data: tBatch } = await supabase
                .from('stock_batches')
                .select('qty_remaining, qty_in')
                .eq('id', m.batch_id)
                .maybeSingle();
              if (tBatch) {
                const newRem = Math.max(0, Number(tBatch.qty_remaining || 0) - Number(prod.pcs_produced || m.qty || 0));
                if (newRem <= 0 && Number(tBatch.qty_remaining || 0) === Number(tBatch.qty_in || 0)) {
                  await supabase.from('stock_batches').delete().eq('id', m.batch_id);
                } else {
                  await supabase.from('stock_batches').update({
                    qty_remaining: newRem,
                    updated_at: new Date().toISOString()
                  }).eq('id', m.batch_id);
                }
              }
            }
          }
          await supabase.from('stock_movements').delete().eq('ref_id', productionId);
        }

        // 3. Sinkronisasi saldo tabel products untuk kedua produk terkait
        if (prod.source_product_id) {
          const { data: curSBatches } = await supabase.from('stock_batches').select('qty_remaining').eq('product_id', prod.source_product_id);
          const totalSrc = (curSBatches || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);
          await supabase.from('products').update({ stock: totalSrc, updated_at: new Date().toISOString() }).eq('id', prod.source_product_id);
        }
        if (prod.target_product_id) {
          const { data: curTBatches } = await supabase.from('stock_batches').select('qty_remaining').eq('product_id', prod.target_product_id);
          const totalTgt = (curTBatches || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);
          await supabase.from('products').update({ stock: totalTgt, updated_at: new Date().toISOString() }).eq('id', prod.target_product_id);
        }

        // 4. Hapus log packaging jika ada
        try {
          await supabase.from('packaging_logs').delete().eq('production_id', productionId);
        } catch (_) {}
      }

      // 5. Hapus record riwayat productions
      const { error } = await supabase.from('productions').delete().eq('id', productionId);
      if (error) throw error;
      return { success: true };
    }

    case 'saveBundledProducts': {
      const [, payload] = args;
      // Buat produk curah + varian kemasan sekaligus
      const raw = payload.rawProduct || {};
      const rawId = raw.id || crypto.randomUUID();
      const { data: rawProd, error: rawErr } = await supabase.from('products').insert({
        id: rawId,
        name: raw.name,
        category: raw.category || 'Benih',
        product_type: 'raw_seed',
        unit: raw.unit || 'gr',
        is_active: true,
        active: true,
        is_seed: true
      }).select('id').single();

      if (rawErr) throw rawErr;
      const actualRawId = rawProd ? rawProd.id : rawId;

      if (Array.isArray(raw.priceTiers) && raw.priceTiers.length > 0) {
        const rawTiers = raw.priceTiers
          .filter(t => t.tier_name && Number(t.price) >= 0)
          .map(t => ({
            id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
            product_id: actualRawId,
            tier_name: t.tier_name,
            price: Number(t.price || 0)
          }));
        if (rawTiers.length > 0) {
          await supabase.from('price_tiers').insert(rawTiers);
        }
      }

      const packList = payload.packProducts || payload.packagedProducts || [];
      for (const pack of packList) {
        const packId = pack.id || crypto.randomUUID();
        const { data: pProd } = await supabase.from('products').insert({
          id: packId,
          name: pack.name,
          category: raw.category || 'Benih',
          product_type: 'packaged_seed',
          variant: pack.variant || '',
          unit: pack.unit || 'pcs',
          packaging_type_id: pack.packaging_type_id || null,
          is_active: true,
          active: true,
          is_seed: true
        }).select('id').single();

        const actualPackId = pProd ? pProd.id : packId;

        if (Array.isArray(pack.priceTiers) && pack.priceTiers.length > 0) {
          const tiers = pack.priceTiers
            .filter(t => t.tier_name && Number(t.price) >= 0)
            .map(t => ({
              id: 'PT-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
              product_id: actualPackId,
              tier_name: t.tier_name,
              price: Number(t.price || 0)
            }));
          if (tiers.length > 0) {
            await supabase.from('price_tiers').insert(tiers);
          }
        }
      }

      return {
        success: true,
        raw_id: actualRawId,
        raw_name: raw.name,
        count: 1 + packList.length
      };
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
          history: bLogs.map(l => ({
            ...l,
            photo_drive_url: l.photo_url || ''
          }))
        };
      });

      return records;
    }

    case 'saveQCStageWithPhoto': {
      const [, payload] = args;
      const user = window.CURRENT_USER_PROFILE;

      let photoUrl = payload.photo_url || '';
      if (payload.imageBase64 && payload.imageBase64.startsWith('data:image')) {
        try {
          const fileName = `qc_${payload.batch_id}_${payload.stage || 'STAGE'}.jpg`;
          photoUrl = await uploadToSupabaseStorage('qc-photos', fileName, payload.imageBase64, payload.imageMimeType || 'image/jpeg');
        } catch (uploadErr) {
          console.warn('[QC Upload Storage Fallback] Menggunakan base64 sebagai fallback photo_url:', uploadErr);
          photoUrl = payload.imageBase64;
        }
      }

      let germRate = null;
      if (payload.tray_a !== undefined && payload.tray_b !== undefined) {
        germRate = Number(payload.tray_a || 0) + Number(payload.tray_b || 0);
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

      if (batchQuality === 'QUARANTINE' || qcStatus === 'FAILED') {
        emitOperationalNotification({
          title: '🚨 Karantina QC Lot Benih!',
          body: 'Batch ' + (payload.batch_code || payload.batch_id) + ' gagal standar mutu' + (germRate !== null ? ' (Daya tumbuh ' + germRate + '%)' : '') + ' dan masuk status KARANTINA.',
          category: 'qc',
          route: '#qc',
          urgent: true
        });
      } else if (qcStatus === 'PASSED') {
        emitOperationalNotification({
          title: '✅ Lot Benih Lolos Uji QC',
          body: 'Batch ' + (payload.batch_code || payload.batch_id) + ' lolos uji mutu dengan daya tumbuh ' + germRate + '%.',
          category: 'qc',
          route: '#qc',
          urgent: false
        });
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
      emitOperationalNotification({
        title: '🔥 Oven DHT 24 Jam Dimulai',
        body: 'Batch ' + (payload.batch_code || payload.batch_id) + ' masuk ' + (payload.oven_no || 'Oven 1') + ' (' + Number(payload.target_temp || 50) + '°C).',
        category: 'qc',
        route: '#qc',
        urgent: false
      });
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
      emitOperationalNotification({
        title: '✅ Sesi Oven DHT Selesai',
        body: 'Pengeringan DHT 24 jam untuk Batch ' + (payload.batch_code || payload.batch_id) + ' telah dituntaskan.',
        category: 'qc',
        route: '#qc',
        urgent: false
      });
      return { success: true, message: 'Sesi oven DHT berhasil dituntaskan.' };
    }

    // --------------------------------------------------------------------------
    // G. KONSINYASI CABANG (OUTLETS, AUDITS, TRANSFERS)
    // --------------------------------------------------------------------------
    case 'getOutlets': {
      const [outletsRes, stocksRes, auditsRes] = await Promise.all([
        supabase.from('outlets').select('*').order('name', { ascending: true }),
        supabase.from('outlet_stocks').select('outlet_id, qty_current'),
        supabase.from('consignment_audits').select('outlet_id, audit_date, created_at').order('audit_date', { ascending: false })
      ]);
      if (outletsRes.error) throw outletsRes.error;

      const stockSumMap = {};
      (stocksRes.data || []).forEach(s => {
        if (!s || !s.outlet_id) return;
        stockSumMap[s.outlet_id] = (stockSumMap[s.outlet_id] || 0) + Number(s.qty_current || 0);
      });

      const lastAuditMap = {};
      (auditsRes.data || []).forEach(a => {
        if (!a || !a.outlet_id) return;
        const dt = a.audit_date || a.created_at;
        if (dt && !lastAuditMap[a.outlet_id]) {
          lastAuditMap[a.outlet_id] = dt;
        }
      });

      const nowMs = Date.now();
      const enriched = (outletsRes.data || []).map(o => {
        const isInactive = String(o.status || 'active').trim().toLowerCase() === 'inactive';
        const refDateStr = lastAuditMap[o.id] || o.created_at || null;
        let daysSinceAudit = 0;
        if (refDateStr) {
          const parsedMs = new Date(refDateStr).getTime();
          if (!isNaN(parsedMs)) {
            daysSinceAudit = Math.max(0, Math.floor((nowMs - parsedMs) / 86400000));
          }
        }
        const auditStatus = daysSinceAudit > 30 ? 'red' : (daysSinceAudit > 14 ? 'yellow' : 'green');
        return {
          ...o,
          status: isInactive ? 'inactive' : 'active',
          total_stock_pcs: stockSumMap[o.id] || 0,
          last_audit_date: lastAuditMap[o.id] || null,
          days_since_audit: daysSinceAudit,
          audit_status: auditStatus
        };
      });

      enriched.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''), 'id');
      });

      return enriched;
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

      // 2. Potong stok pusat via FIFO client dan catat item transfer
      for (const it of items) {
        const prefBatch = it.batch_id || it.selected_batch_id || null;
        await consumeStockFIFOClient(
          it.product_id,
          Number(it.qty),
          transferId,
          invoiceNo,
          'KELUAR_KONSINYASI',
          prefBatch
        );

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

      const totalSoldAudit = (payload.items || []).reduce((sum, it) => sum + Number(it.qty_sold || 0), 0);
      emitOperationalNotification({
        title: '🏪 Opname Konsinyasi Selesai',
        body: 'Audit rak mitra selesai dicatat (' + totalSoldAudit + ' pcs terjual' + (payload.outlet_pic ? ', PIC: ' + payload.outlet_pic : '') + ').',
        category: 'finance',
        route: '#konsinyasi',
        urgent: false
      });

      return { success: true, id: auditId, message: 'Berita acara opname konsinyasi berhasil disimpan.' };
    }

    case 'createConsignmentInvoice': {
      const [, payload] = args;
      const { data: rawAuditItems, error: aiErr } = await supabase
        .from('consignment_audit_items')
        .select('*')
        .eq('audit_id', payload.audit_id);
      if (aiErr) throw aiErr;

      const auditItems = rawAuditItems || [];
      const prodIds = [...new Set(auditItems.map(it => it.product_id).filter(Boolean))];
      let pMap = {};
      if (prodIds.length > 0) {
        try {
          const { data: prods } = await supabase.from('products').select('id, name').in('id', prodIds);
          (prods || []).forEach(p => { if (p && p.id) pMap[p.id] = p.name; });
        } catch (e) {
          console.warn('Gagal memuat produk audit konsinyasi:', e);
        }
      }

      const soldItems = auditItems.filter(it => Number(it.qty_sold || 0) > 0).map(it => ({
        ...it,
        products: { name: pMap[it.product_id] || it.product_name || 'Produk' }
      }));
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
      return (data || []).map(r => {
        const remaining = Number(r.remaining !== undefined ? r.remaining : (Number(r.total || 0) - Number(r.paid || 0)));
        const rawStatus = String(r.status || '').toUpperCase();
        const isActive = remaining > 0 || ['UNPAID', 'PARTIAL', 'ACTIVE'].includes(rawStatus);
        return {
          ...r,
          remaining: remaining,
          customer_name: r.customers?.name || r.customer_name || 'Pelanggan Umum',
          customer_phone: r.customers?.phone || r.customer_phone || '-',
          invoice_no: r.transactions?.invoice_no || r.invoice_no || ('INV-' + String(r.id || '').slice(0, 8)),
          status: isActive ? 'active' : 'lunas'
        };
      });
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

      emitOperationalNotification({
        title: '💳 Pembayaran Piutang Diterima',
        body: 'Cicilan Rp ' + Number(amount || 0).toLocaleString('id-ID') + ' dicatat (' + (newStatus === 'PAID' ? 'LUNAS' : 'Sisa Rp ' + Number(newRemaining || 0).toLocaleString('id-ID')) + ').',
        category: 'finance',
        route: '#piutang',
        urgent: false
      });

      return { success: true, message: 'Pembayaran piutang berhasil dicatat.' };
    }

    // --------------------------------------------------------------------------
    // I. FAKTUR & CETAK NOTA
    // --------------------------------------------------------------------------
    case 'getInvoiceData': {
      const [, transactionId] = args;

      let txQuery = supabase.from('transactions').select('*');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
        txQuery = txQuery.or(`id.eq.${transactionId},invoice_no.eq.${transactionId}`);
      } else {
        txQuery = txQuery.eq('invoice_no', transactionId);
      }

      const [txRes, settingsRes] = await Promise.all([
        txQuery.maybeSingle(),
        supabase.from('settings').select('*')
      ]);

      if (txRes.error) throw txRes.error;
      if (!txRes.data) throw new Error(`Data transaksi #${transactionId} tidak ditemukan.`);
      const tx = txRes.data;

      const [itemsRes, custRes, recRes] = await Promise.all([
        supabase.from('transaction_items').select('*, products(name, unit)').eq('transaction_id', tx.id),
        tx.customer_id
          ? supabase.from('customers').select('*').eq('id', tx.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        tx.payment_type === 'installment'
          ? supabase.from('receivables').select('*').eq('transaction_id', tx.id).maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      const settingsObj = {};
      (settingsRes.data || []).forEach(s => { settingsObj[s.key] = s.value; });

      const custData = (custRes && custRes.data)
        ? custRes.data
        : { name: tx.customer_name || 'Pelanggan Umum', phone: '' };

      let totalCost = 0;
      let totalGrossProfit = 0;
      const mappedItems = (itemsRes.data || []).map(i => {
        const prodName = i.products ? i.products.name : (i.product_name || i.name || 'Produk');
        const prodUnit = i.products ? i.products.unit : (i.unit || 'pcs');
        const sub = Number(i.subtotal !== undefined ? i.subtotal : (Number(i.qty || 0) * Number(i.price || 0)));
        const cost = Number(i.cost || 0);
        const profit = sub - cost;
        const marginPct = sub > 0 ? Math.round((profit / sub) * 100) : 0;
        totalCost += cost;
        totalGrossProfit += profit;
        return {
          ...i,
          name: prodName,
          product_name: prodName,
          unit: prodUnit,
          subtotal: sub,
          cost: cost,
          gross_profit: profit,
          margin_percent: marginPct
        };
      });

      let normStatus = String(tx.status || '').toLowerCase();
      if (normStatus === 'completed') normStatus = 'paid';

      const enrichedTx = {
        ...tx,
        status: normStatus,
        total_cost: totalCost,
        gross_profit: totalGrossProfit
      };

      return {
        transaction: enrichedTx,
        items: mappedItems,
        customer: custData,
        receivable: recRes ? recRes.data : null,
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
      return (data || []).map(t => {
        let normStatus = String(t.status || '').toLowerCase();
        if (normStatus === 'completed') normStatus = 'paid';
        return {
          ...t,
          status: normStatus,
          items: (t.transaction_items || []).map(i => {
            const prodName = i.products ? i.products.name : (i.product_name || i.name || 'Produk');
            const prodUnit = i.products ? i.products.unit : (i.unit || 'pcs');
            return {
              ...i,
              name: prodName,
              product_name: prodName,
              unit: prodUnit
            };
          })
        };
      });
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
        const qStatus = String(b.quality_status || 'NORMAL').toUpperCase();
        const qcStatus = String(b.qc_status || 'APPROVED').toUpperCase();
        if (qStatus !== 'QUARANTINE' && qcStatus !== 'REJECTED') {
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

      const txRes = await supabase.from('transactions')
        .select('*')
        .neq('status', 'VOID')
        .gte('created_at', isoStart)
        .lte('created_at', isoEnd)
        .order('created_at', { ascending: false });

      const transactions = txRes.data || [];
      const txIds = transactions.map(t => t.id).filter(Boolean);
      let relevantItems = [];

      if (txIds.length > 0) {
        // Ambil items per batch (maks 100 ID) agar terhindar dari URL length limit
        const chunkSize = 100;
        for (let i = 0; i < txIds.length; i += chunkSize) {
          const chunk = txIds.slice(i, i + chunkSize);
          const { data: itemBatch, error: itemErr } = await supabase.from('transaction_items')
            .select('*, products(name, category)')
            .in('transaction_id', chunk);
          if (!itemErr && Array.isArray(itemBatch)) {
            relevantItems.push(...itemBatch);
          }
        }
      }

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
        const buyPrice = Number(b.cost_per_unit || b.buy_price || 0);
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
      const { error } = await supabase.from('settings').upsert(entries, { onConflict: 'key' });
      if (error) throw error;
      return { success: true };
    }

    // --------------------------------------------------------------------------
    // M. TAMBAHAN FITUR: BATCH, MUTASI, OUTLET DETAIL & DANGER ZONE
    // --------------------------------------------------------------------------
    case 'getStockBatches': {
      const [, productId] = args;
      let q = supabase
        .from('stock_batches')
        .select('*')
        .order('expiry_date', { ascending: true, nullsFirst: false })
        .order('production_date', { ascending: true });
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
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

    case 'getStockMutations': {
      const [, productId] = args;
      let remoteData = [];
      try {
        let q = supabase
          .from('stock_mutations')
          .select('*, product:products(name, unit)')
          .order('created_at', { ascending: false })
          .limit(150);
        if (productId) q = q.eq('product_id', productId);
        const { data, error } = await q;
        if (error) {
          let q2 = supabase
            .from('stock_mutations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(150);
          if (productId) q2 = q2.eq('product_id', productId);
          const { data: data2, error: err2 } = await q2;
          if (err2) throw err2;
          remoteData = data2 || [];
        } else {
          remoteData = data || [];
        }
      } catch (err) {
        console.warn('[Supabase] Warning getStockMutations remote query:', err);
      }

      // Gabungkan dengan cadangan data mutasi lokal
      try {
        const localBackup = JSON.parse(localStorage.getItem('idep_stock_mutations_backup') || '[]');
        const map = new Map();
        remoteData.forEach(item => { if (item && item.id) map.set(item.id, item); });
        localBackup.forEach(item => {
          if (item && item.id && !map.has(item.id)) {
            if (!productId || item.product_id === productId) {
              map.set(item.id, item);
            }
          }
        });
        const combined = Array.from(map.values());
        combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return combined;
      } catch (e) {
        return remoteData;
      }
    }

    case 'createStockMutation': {
      const [, payload] = args;
      const item = {
        id: payload.id || crypto.randomUUID(),
        product_id: payload.product_id,
        batch_id: payload.batch_id || null,
        reference_no: payload.reference_no || null,
        mutation_type: payload.mutation_type,
        qty: Number(payload.qty || 0),
        unit: payload.unit || 'pcs',
        notes: payload.notes || '',
        created_at: payload.created_at || new Date().toISOString()
      };
      saveMutationToLocalBackup(item);
      try {
        const { data, error } = await supabase.from('stock_mutations').insert(item).select().maybeSingle();
        if (error) throw error;
        return data || item;
      } catch (e) {
        console.warn('[Supabase] createStockMutation local saved only:', e);
        return item;
      }
    }

    case 'adjustStockBatch': {
      const [, payload] = args;
      const batchId = payload && payload.batch_id;
      const productId = payload && payload.product_id;
      const adjType = (payload && payload.adjustment_type === 'PLUS') ? 'PLUS' : 'MINUS';
      const qtyNum = Math.abs(Number((payload && payload.qty) || 0));
      if (!batchId || !productId || qtyNum <= 0) {
        throw new Error('Data batch, produk, dan kuantitas koreksi tidak valid.');
      }

      // 1. Ambil data batch terkini
      let currentBatch = null;
      try {
        const { data: bData, error: bErr } = await supabase.from('stock_batches').select('*').eq('id', batchId).single();
        if (bErr) throw bErr;
        currentBatch = bData;
      } catch (errB) {
        console.warn('[adjustStockBatch] Gagal fetch stock_batches:', errB);
      }

      const prevQty = currentBatch ? Number(currentBatch.qty_remaining || 0) : 0;
      const newBatchQty = adjType === 'MINUS' ? Math.max(0, prevQty - qtyNum) : (prevQty + qtyNum);
      const diffQty = adjType === 'MINUS' ? -qtyNum : qtyNum;
      const mutationType = adjType === 'MINUS' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN';
      const refNo = 'ADJ-' + Date.now().toString().slice(-6);
      const reasonLabel = (payload && payload.reason) || 'KOREKSI_STOK';
      const notesFull = `[${reasonLabel}] ${(payload && payload.notes) || '-'} (Petugas: ${(payload && payload.user_name) || 'Admin'})`;

      // 2. Update stock_batches
      try {
        await supabase.from('stock_batches').update({
          qty_remaining: newBatchQty,
          updated_at: new Date().toISOString()
        }).eq('id', batchId);
      } catch (updBatErr) {
        console.warn('[adjustStockBatch] Update batch remote warn:', updBatErr);
      }

      // 3. Update total stok di tabel products
      try {
        const { data: allB } = await supabase.from('stock_batches').select('qty_remaining').eq('product_id', productId);
        if (allB && Array.isArray(allB)) {
          const totalRemaining = allB.reduce((sum, item) => sum + Number(item.qty_remaining || 0), 0);
          await supabase.from('products').update({
            stock: totalRemaining,
            updated_at: new Date().toISOString()
          }).eq('id', productId);
        }
      } catch (updProdErr) {
        console.warn('[adjustStockBatch] Update product stock warn:', updProdErr);
      }

      // 4. Catat mutasi stok ke stock_mutations
      const mutItem = {
        id: crypto.randomUUID(),
        product_id: productId,
        batch_id: batchId,
        reference_no: refNo,
        mutation_type: mutationType,
        qty: diffQty,
        unit: (payload && payload.unit) || 'pcs',
        notes: notesFull,
        created_at: new Date().toISOString()
      };
      saveMutationToLocalBackup(mutItem);
      try {
        await supabase.from('stock_mutations').insert(mutItem);
      } catch (mutErr) {
        console.warn('[adjustStockBatch] Insert mutation warn:', mutErr);
      }

      // 5. Catat ke stock_movements jika tabel tersedia
      try {
        await supabase.from('stock_movements').insert({
          product_id: productId,
          batch_id: batchId,
          type: adjType === 'MINUS' ? 'adjustment_out' : 'adjustment_in',
          qty: diffQty,
          notes: notesFull
        });
      } catch (movErr) {}

      emitOperationalNotification({
        title: '⚖️ Koreksi Stok Manual (' + (adjType === 'MINUS' ? '-' : '+') + qtyNum + ')',
        body: 'Batch ' + (currentBatch ? (currentBatch.batch_code || batchId) : batchId) + ': ' + prevQty + ' → ' + newBatchQty + ' (' + reasonLabel + ').',
        category: 'security',
        route: '#stok',
        urgent: adjType === 'MINUS'
      });

      return {
        success: true,
        batch_id: batchId,
        product_id: productId,
        old_qty: prevQty,
        new_qty: newBatchQty,
        diff: diffQty,
        reference_no: refNo
      };
    }

    case 'saveOutlet': {
      const [, payload] = args;
      const cleanName = String(payload.name || '').trim();
      if (!cleanName) {
        throw new Error('Nama outlet mitra wajib diisi.');
      }
      if (!payload.id) {
        const { data: dupList } = await supabase
          .from('outlets')
          .select('id, name')
          .ilike('name', cleanName)
          .limit(1);
        if (Array.isArray(dupList) && dupList.length > 0) {
          throw new Error('Outlet mitra dengan nama "' + cleanName + '" sudah terdaftar.');
        }
      }
      const isInactive = String(payload.status || 'ACTIVE').trim().toLowerCase() === 'inactive';
      const outletObj = {
        name: cleanName,
        pic_name: String(payload.pic_name || '').trim(),
        phone: payload.phone || '',
        address: payload.address || '',
        price_tier: payload.price_tier || 'Outlet',
        visit_interval_days: Number(payload.visit_interval_days) || 14,
        notes: payload.notes || '',
        status: isInactive ? 'INACTIVE' : 'ACTIVE',
        updated_at: new Date().toISOString()
      };
      if (payload.id) {
        outletObj.id = payload.id;
      }
      const { data, error } = await supabase.from('outlets').upsert(outletObj).select().single();
      if (error) throw error;
      return { success: true, id: data.id, outlet: data };
    }

    case 'deleteOutlet': {
      const [, outletId] = args;
      if (!outletId) throw new Error('ID outlet tidak valid.');

      const [stkCheck, trfCheck, audCheck] = await Promise.all([
        supabase.from('outlet_stocks').select('qty_current').eq('outlet_id', outletId),
        supabase.from('consignment_transfers').select('id').eq('outlet_id', outletId).limit(1),
        supabase.from('consignment_audits').select('id').eq('outlet_id', outletId).limit(1)
      ]);

      const activeQty = (stkCheck.data || []).reduce((s, r) => s + Number(r.qty_current || 0), 0);
      if (activeQty > 0 || (trfCheck.data && trfCheck.data.length > 0) || (audCheck.data && audCheck.data.length > 0)) {
        throw new Error('Outlet ini sudah memiliki stok rak atau riwayat surat jalan/opname. Silakan ubah statusnya menjadi Nonaktif.');
      }

      await supabase.from('outlet_stocks').delete().eq('outlet_id', outletId);
      const { error } = await supabase.from('outlets').delete().eq('id', outletId);
      if (error) throw error;
      return { success: true };
    }

    case 'getOutletDetail': {
      const [, outletId] = args;
      const [outletRes, stocksRes, transfersRes, auditsRes, tiersRes] = await Promise.all([
        supabase.from('outlets').select('*').eq('id', outletId).single(),
        supabase.from('outlet_stocks').select('*, products(name, unit, sell_price)').eq('outlet_id', outletId),
        supabase.from('consignment_transfers').select('*').eq('outlet_id', outletId).order('sent_at', { ascending: false }).limit(30),
        supabase.from('consignment_audits').select('*, consignment_audit_items(*)').eq('outlet_id', outletId).order('audit_date', { ascending: false }).limit(30),
        supabase.from('price_tiers').select('product_id, tier_name, price')
      ]);
      if (outletRes.error) throw outletRes.error;

      const outletRow = outletRes.data || {};
      const outletTierName = String(outletRow.price_tier || 'Outlet').trim().toLowerCase();
      const tiersByProd = {};
      (tiersRes.data || []).forEach(t => {
        if (!t || !t.product_id) return;
        if (!tiersByProd[t.product_id]) tiersByProd[t.product_id] = [];
        tiersByProd[t.product_id].push(t);
      });

      const auditsList = auditsRes.data || [];
      const latestAuditStr = (auditsList[0] && (auditsList[0].audit_date || auditsList[0].created_at)) || outletRow.created_at || null;
      let daysSinceAudit = 0;
      if (latestAuditStr) {
        const ms = new Date(latestAuditStr).getTime();
        if (!isNaN(ms)) daysSinceAudit = Math.max(0, Math.floor((Date.now() - ms) / 86400000));
      }
      const normalizedOutlet = {
        ...outletRow,
        status: String(outletRow.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
        days_since_audit: daysSinceAudit,
        audit_status: daysSinceAudit > 30 ? 'red' : (daysSinceAudit > 14 ? 'yellow' : 'green')
      };

      return {
        outlet: normalizedOutlet,
        stocks: (stocksRes.data || []).map(s => {
          const pTiers = tiersByProd[s.product_id] || [];
          const exactTier = pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === outletTierName)
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'outlet')
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'reguler');
          const unitPrice = exactTier ? Number(exactTier.price || 0) : Number(s.products?.sell_price || 0);
          const qtyCur = Number(s.qty_current || 0);
          return {
            ...s,
            product_name: s.products ? s.products.name : 'Produk',
            unit: s.products ? s.products.unit : 'pcs',
            tier_price: unitPrice,
            subtotal: qtyCur * unitPrice
          };
        }),
        transfers: transfersRes.data || [],
        audits: auditsList
      };
    }

    case 'getDeliveryOrderReceiptData': {
      const [, transferId] = args;
      const targetId = transferId || args[0];

      // 1. Ambil data header transfer
      let transfer = null;
      const { data: tData, error: tErr } = await supabase
        .from('consignment_transfers')
        .select('*, outlets(*)')
        .eq('id', targetId)
        .maybeSingle();

      if (tErr || !tData) {
        const { data: dtData, error: dtErr } = await supabase
          .from('consignment_transfers')
          .select('*')
          .eq('id', targetId)
          .single();
        if (dtErr) throw dtErr;
        transfer = dtData;
        if (transfer && transfer.outlet_id) {
          const { data: oData } = await supabase
            .from('outlets')
            .select('*')
            .eq('id', transfer.outlet_id)
            .maybeSingle();
          transfer.outlets = oData || {};
        }
      } else {
        transfer = tData;
      }

      // 2. Ambil data item transfer secara mandiri (hindari error 'relationship in schema cache')
      const { data: rawItems, error: iErr } = await supabase
        .from('consignment_transfer_items')
        .select('*')
        .eq('transfer_id', targetId);
      if (iErr) throw iErr;

      const items = rawItems || [];

      // 3. Ambil data produk terkait secara independen
      const productIds = [...new Set(items.map(it => it.product_id).filter(Boolean))];
      let productsMap = {};
      if (productIds.length > 0) {
        try {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, unit, sku')
            .in('id', productIds);
          (prods || []).forEach(p => {
            if (p && p.id) productsMap[p.id] = p;
          });
        } catch (pErr) {
          console.warn('Gagal memuat produk untuk surat jalan:', pErr);
        }
      }

      // 4. Cari kode batch dari stock_mutations atau stock_movements jika batch_id belum ada di item
      let batchMap = {};
      try {
        const { data: muts } = await supabase
          .from('stock_mutations')
          .select('product_id, batch_id')
          .or(`reference_no.eq.${targetId},reference_no.eq.${transfer.invoice_no || ''}`)
          .in('product_id', productIds);

        if (muts && muts.length > 0) {
          const bIds = [...new Set(muts.map(m => m.batch_id).filter(Boolean))];
          const { data: bData } = await supabase
            .from('stock_batches')
            .select('id, batch_code')
            .in('id', bIds);
          const bCodeMap = {};
          (bData || []).forEach(b => { if (b && b.id) bCodeMap[b.id] = b.batch_code || b.id; });
          muts.forEach(m => {
            const code = bCodeMap[m.batch_id] || m.batch_id;
            if (code) {
              if (!batchMap[m.product_id]) batchMap[m.product_id] = [];
              if (!batchMap[m.product_id].includes(code)) batchMap[m.product_id].push(code);
            }
          });
        }
      } catch (e) {
        console.warn('Gagal lookup batch code:', e);
      }

      return {
        transfer: transfer,
        outlet: transfer.outlets || {},
        items: items.map(it => {
          const prod = productsMap[it.product_id] || {};
          const prodName = prod.name || it.name || it.product_name || 'Produk';
          const prodUnit = prod.unit || it.unit || 'pcs';
          const prodSku = prod.sku || it.sku || '';
          const batchDisplay = it.batch_id || (batchMap[it.product_id] ? batchMap[it.product_id].join(', ') : '-');
          return {
            ...it,
            name: prodName,
            product_name: prodName,
            unit: prodUnit,
            sku: prodSku,
            batch_id: batchDisplay
          };
        })
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
      const [, transactionId, payload] = args;
      if (!transactionId) throw new Error('Transaction ID wajib diisi untuk pembaruan nota.');

      // 1. Ambil transaction_items lama untuk di-rollback stoknya ke stock_batches
      const { data: oldItems } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId);

      if (Array.isArray(oldItems)) {
        for (const item of oldItems) {
          const qtyToReturn = Number(item.qty || 0);
          if (qtyToReturn > 0) {
            // Jika ada batch_id, kembalikan ke batch tersebut
            if (item.batch_id) {
              const { data: batch } = await supabase
                .from('stock_batches')
                .select('qty_remaining')
                .eq('id', item.batch_id)
                .maybeSingle();
              if (batch) {
                const newQty = Number(batch.qty_remaining || 0) + qtyToReturn;
                await supabase
                  .from('stock_batches')
                  .update({ qty_remaining: newQty, updated_at: new Date().toISOString() })
                  .eq('id', item.batch_id);
              }
            }
            // Catat rollback ke mutasi
            try {
              await supabase.from('stock_mutations').insert({
                id: crypto.randomUUID(),
                product_id: item.product_id,
                batch_id: item.batch_id || null,
                mutation_type: 'MASUK_KOREKSI_NOTA',
                qty_change: qtyToReturn,
                qty_after: 0,
                reference_no: payload?.invoice_no || transactionId,
                notes: `Rollback Koreksi Nota #${transactionId}`
              });
            } catch (e) {}

            // Sinkronkan total stock pada products
            try {
              const { data: allB } = await supabase
                .from('stock_batches')
                .select('qty_remaining')
                .eq('product_id', item.product_id);
              const totalRemaining = (allB || []).reduce((sum, b) => sum + Number(b.qty_remaining || 0), 0);
              await supabase
                .from('products')
                .update({ stock: totalRemaining })
                .eq('id', item.product_id);
            } catch (e) {}
          }
        }
      }

      // 2. Hapus transaction_items dan receivables lama
      await supabase.from('transaction_items').delete().eq('transaction_id', transactionId);
      await supabase.from('receivables').delete().eq('transaction_id', transactionId);

      // 3. Hitung subtotal, tax, dan total baru
      let calcSubtotal = 0;
      for (const it of (payload?.items || [])) {
        calcSubtotal += Number(it.qty || 0) * Number(it.price || 0);
      }
      const subtotal = payload?.subtotal !== undefined ? Number(payload.subtotal) : calcSubtotal;
      const taxRate = Number(payload?.taxRate || 0);
      const tax = payload?.tax !== undefined ? Number(payload.tax) : Math.round(subtotal * taxRate);
      const total = payload?.total !== undefined ? Number(payload.total) : (subtotal + tax);

      // 4. Potong ulang stok menggunakan consumeStockFIFOClient
      const invoiceNo = payload?.invoice_no || `INV-${Date.now().toString().slice(-6)}`;
      const consumedItems = [];
      for (const item of (payload?.items || [])) {
        const prefBatch = item.batch_id || item.selected_batch_id || null;
        const fifoResult = await consumeStockFIFOClient(
          item.product_id,
          Number(item.qty),
          transactionId,
          invoiceNo,
          'KELUAR_PENJUALAN',
          prefBatch
        );

        consumedItems.push({
          transaction_id: transactionId,
          product_id: item.product_id,
          batch_id: fifoResult.primary_batch_id || prefBatch,
          qty: Number(item.qty),
          price: Number(item.price),
          cost: Number(fifoResult.total_cost || 0),
          subtotal: Number(item.subtotal || (Number(item.qty) * Number(item.price)))
        });
      }

      // Insert transaction_items baru
      if (consumedItems.length > 0) {
        const { error: insErr } = await supabase.from('transaction_items').insert(consumedItems);
        if (insErr) throw insErr;
      }

      // Update tabel transactions
      const txStatus = payload?.payment_type === 'installment' ? 'tempo' : 'paid';
      const txUpdateData = {
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_method: payload?.payment_method || 'CASH',
        payment_type: payload?.payment_type || 'cash',
        status: txStatus
      };
      if (payload?.customer_id) txUpdateData.customer_id = payload.customer_id;
      if (payload?.customer_name) txUpdateData.customer_name = payload.customer_name;

      const { error: txErr } = await supabase.from('transactions').update(txUpdateData).eq('id', transactionId);
      if (txErr) throw txErr;

      // Jika installment, buat receivables baru
      if (payload?.payment_type === 'installment') {
        const paidAmount = Number(payload.downPayment !== undefined ? payload.downPayment : (payload.paid_amount || 0));
        const totalAmount = total;
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          transaction_id: transactionId,
          customer_id: payload.customer_id || null,
          total: totalAmount,
          paid: paidAmount,
          remaining: remainingAmount,
          due_date: payload.due_date || null,
          status: 'active'
        });
      }

      emitOperationalNotification({
        title: '✏️ Koreksi Faktur ' + invoiceNo,
        body: 'Nota ' + invoiceNo + ' diperbarui menjadi Rp ' + Number(total || 0).toLocaleString('id-ID') + '.',
        category: 'security',
        route: '#faktur',
        urgent: false
      });

      return {
        success: true,
        id: transactionId,
        invoice_no: invoiceNo,
        total: total,
        subtotal: subtotal,
        tax: tax,
        date: new Date().toISOString()
      };
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
      const { data: rows } = await supabase
        .from('settings')
        .select('value, updated_at')
        .eq('key', 'role_permissions')
        .order('updated_at', { ascending: false })
        .limit(1);
      const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      let perms = null;
      if (data && data.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          perms = (parsed && parsed.permissions && typeof parsed.permissions === 'object') ? parsed.permissions : parsed;
        } catch (e) { }
      }
      const defaultAll = { can_view: true, can_edit: true, can_delete: true };
      const viewOnly = { can_view: true, can_edit: false, can_delete: false };
      const modules = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'expenses', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
      const basePerms = {
        'Admin': {},
        'Koordinator': {},
        'QC': {},
        'Kasir': {}
      };
      modules.forEach(m => {
        basePerms['Admin'][m] = Object.assign({}, defaultAll);
        basePerms['Koordinator'][m] = Object.assign({}, viewOnly);
        basePerms['QC'][m] = (['dashboard', 'qc', 'stok', 'produksi'].includes(m)) ? Object.assign({}, defaultAll) : Object.assign({}, viewOnly);
        basePerms['Kasir'][m] = (['dashboard', 'pos', 'produk', 'faktur', 'crm', 'purnajual'].includes(m)) ? Object.assign({}, defaultAll) : Object.assign({}, viewOnly);
      });

      if (!perms || typeof perms !== 'object' || Array.isArray(perms)) {
        perms = basePerms;
      } else {
        // Pastikan 4 role utama tetap ada, sambil mempertahankan seluruh role baru/kustom dari database
        Object.keys(basePerms).forEach(baseRole => {
          if (!perms[baseRole] || typeof perms[baseRole] !== 'object') {
            perms[baseRole] = basePerms[baseRole];
          }
        });
      }
      return {
        roles: Object.keys(perms),
        permissions: perms
      };
    }

    case 'saveRolePermissions': {
      const [, perms] = args;
      const toSave = (perms && perms.permissions && typeof perms.permissions === 'object') ? perms.permissions : perms;
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('settings').upsert({
        key: 'role_permissions',
        value: JSON.stringify(toSave),
        updated_at: nowIso
      }, { onConflict: 'key' });
      if (error) {
        // Fallback: update jika sudah ada, insert jika belum ada
        const { data: exist } = await supabase.from('settings').select('key').eq('key', 'role_permissions').limit(1);
        if (exist && exist.length > 0) {
          const { error: updErr } = await supabase.from('settings').update({
            value: JSON.stringify(toSave),
            updated_at: nowIso
          }).eq('key', 'role_permissions');
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('settings').insert({
            key: 'role_permissions',
            value: JSON.stringify(toSave),
            updated_at: nowIso
          });
          if (insErr) throw insErr;
        }
      }
      return {
        success: true,
        roles: Object.keys(toSave || {}),
        permissions: toSave
      };
    }

    case 'changePassword': {
      const [, newPassword] = args;
      if (!newPassword || String(newPassword).length < 6) {
        throw new Error('Password baru minimal 6 karakter.');
      }
      let updatedInProfile = false;
      const currentProf = window.CURRENT_USER_PROFILE;
      if (currentProf && (currentProf.id || currentProf.username)) {
        let q = supabase.from('profiles').update({
          password: String(newPassword),
          updated_at: new Date().toISOString()
        });
        if (currentProf.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(currentProf.id))) {
          q = q.eq('id', currentProf.id);
        } else {
          q = q.ilike('username', String(currentProf.username));
        }
        const { error: profErr } = await q;
        if (!profErr) updatedInProfile = true;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
          if (authErr && !updatedInProfile) throw authErr;
        } else if (!updatedInProfile) {
          throw new Error('Sesi pengguna tidak ditemukan.');
        }
      } catch (err) {
        if (!updatedInProfile) throw err;
      }
      return { success: true, message: 'Password berhasil diperbarui.' };
    }

    // --------------------------------------------------------------------------
    // N. MODUL MANAJEMEN BIAYA & PENGELUARAN (OPERATIONAL EXPENSES)
    // --------------------------------------------------------------------------
    case 'getExpenses': {
      const { data, error } = await supabase
        .from('operational_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    case 'createExpense': {
      const [, payload] = args;
      const { data, error } = await supabase
        .from('operational_expenses')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return { success: true, expense: data };
    }

    case 'deleteExpense': {
      const [, expenseId] = args;
      const { error } = await supabase
        .from('operational_expenses')
        .delete()
        .eq('id', expenseId);
      if (error) throw error;
      return { success: true };
    }

    case 'getExpenseCategories': {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }

    case 'createExpenseCategory': {
      const [, payload] = args;
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return { success: true, category: data };
    }

    case 'deleteExpenseCategory': {
      const [, categoryId] = args;
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
      return { success: true };
    }

    // --------------------------------------------------------------------------
    // O. MODUL PURNA JUAL, KLAIM GARANSI & RECALL BATCH
    // --------------------------------------------------------------------------
    case 'getAllBatchesForRecall': {
      const [batchesRes, claimsRes] = await Promise.all([
        supabase
          .from('stock_batches')
          .select('*, products(name, category, variant, unit)')
          .order('expiry_date', { ascending: true }),
        supabase
          .from('after_sales_claims')
          .select('batch_id')
      ]);

      const claimCounts = {};
      (claimsRes.data || []).forEach(c => {
        if (c.batch_id) {
          claimCounts[c.batch_id] = (claimCounts[c.batch_id] || 0) + 1;
        }
      });

      const list = (batchesRes.data || []).map(b => {
        const cCount = claimCounts[b.batch_no] || claimCounts[b.id] || 0;
        const qualityStatus = (cCount >= 3 || b.quality_status === 'QUARANTINE') ? 'QUARANTINE' : (b.quality_status || 'NORMAL');
        return {
          id: b.batch_no || b.id,
          batch_id: b.batch_no || b.id,
          product_id: b.product_id,
          product_name: b.products?.name || b.product_name || 'Benih',
          quality_status: qualityStatus,
          complaint_count: cCount,
          qty_remaining: Number(b.qty_remaining || 0),
          farmer_name: b.farmer_name || '-',
          production_date: b.production_date ? formatDateIndo(b.production_date) : '-',
          expiry_date: b.expiry_date ? formatDateIndo(b.expiry_date) : '-'
        };
      });

      return list;
    }

    case 'getAfterSalesClaims': {
      const { data, error } = await supabase
        .from('after_sales_claims')
        .select('*, products(name, variant)')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[Claims] Gagal query after_sales_claims:', error);
        return [];
      }
      return (data || []).map(c => ({
        id: c.id,
        claim_date: c.created_at ? formatDateIndo(c.created_at) : (c.claim_date || '-'),
        created_at: c.created_at,
        customer_name: c.customer_name || 'Pelanggan',
        customer_phone: c.customer_phone || '-',
        product_id: c.product_id,
        product_name: c.products?.name || c.product_name || 'Produk Benih',
        batch_id: c.batch_id || '-',
        claim_reason: c.claim_reason || c.reason || '-',
        sowing_date: c.sowing_date || '',
        media_type: c.media_type || '',
        resolution_type: c.resolution_type || 'Ganti Benih Baru',
        replacement_qty: c.replacement_qty || 1,
        photo_url: c.photo_url || '',
        resolution_notes: c.resolution_notes || c.notes || '',
        status: c.status || 'PENDING'
      }));
    }

    case 'submitAfterSalesClaim': {
      const [, payload] = args;
      const claimRow = {
        transaction_id: payload.transaction_id || null,
        customer_name: payload.customer_name || 'Pelanggan',
        customer_phone: payload.customer_phone || '',
        product_id: payload.product_id || null,
        batch_id: payload.batch_id || '',
        claim_reason: payload.claim_reason || '',
        sowing_date: payload.sowing_date || null,
        media_type: payload.media_type || '',
        resolution_type: payload.resolution_type || 'Ganti Benih Baru',
        photo_url: payload.photo_url || '',
        resolution_notes: payload.resolution_notes || '',
        replacement_qty: payload.replacement_qty || 1,
        status: 'PENDING',
        created_at: new Date().toISOString()
      };

      const { data: inserted, error } = await supabase
        .from('after_sales_claims')
        .insert([claimRow])
        .select()
        .single();
      if (error) throw error;

      let isQuarantined = false;
      if (payload.batch_id) {
        const { count } = await supabase
          .from('after_sales_claims')
          .select('id', { count: 'exact', head: true })
          .eq('batch_id', payload.batch_id);

        if ((count || 0) >= 3) {
          isQuarantined = true;
          await supabase
            .from('stock_batches')
            .update({ quality_status: 'QUARANTINE', updated_at: new Date().toISOString() })
            .or(`batch_no.eq.${payload.batch_id},id.eq.${payload.batch_id}`);
        }
      }

      emitOperationalNotification({
        title: isQuarantined ? '🚨 Klaim Garansi & Auto-Karantina Batch!' : '🌱 Klaim Purna Jual Baru',
        body: (payload.customer_name || 'Pelanggan') + ' mengajukan klaim ' + (payload.product_name || 'benih') + (payload.batch_id ? ' (Batch ' + payload.batch_id + ')' : '') + '.' + (isQuarantined ? ' Batch otomatis dikarantina (≥3 klaim)!' : ''),
        category: 'aftersales',
        route: '#purnajual',
        urgent: Boolean(isQuarantined)
      });

      return {
        success: true,
        id: inserted ? inserted.id : '',
        is_quarantined: isQuarantined,
        message: 'Klaim garansi purna jual berhasil disimpan.'
      };
    }

    case 'updateAfterSalesClaimStatus': {
      const [, claimId, newStatus] = args;
      const { error } = await supabase
        .from('after_sales_claims')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', claimId);
      if (error) throw error;
      return { success: true };
    }

    case 'getConsultationLogs': {
      const { data, error } = await supabase
        .from('consultation_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[Consultation] Gagal query consultation_logs:', error);
        return [];
      }
      return (data || []).map(l => ({
        id: l.id,
        consultation_date: l.created_at ? formatDateIndo(l.created_at) : (l.consultation_date || '-'),
        created_at: l.created_at,
        customer_name: l.customer_name || 'Pelanggan',
        customer_phone: l.customer_phone || '-',
        topic: l.topic || 'Umum',
        problem_details: l.problem_details || '',
        solution_given: l.solution_given || '',
        handled_by: l.handled_by || 'Staf IDEP'
      }));
    }

    case 'saveConsultationLog': {
      const [, payload] = args;
      const { data, error } = await supabase
        .from('consultation_logs')
        .insert([{
          customer_name: payload.customer_name || 'Pelanggan',
          customer_phone: payload.customer_phone || '',
          topic: payload.topic || 'Umum',
          problem_details: payload.problem_details || '',
          solution_given: payload.solution_given || '',
          handled_by: payload.handled_by || 'Staf IDEP',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      if (error) throw error;
      return { success: true, id: data ? data.id : '' };
    }

    case 'searchBatchTraceability': {
      const [, prodId, expQuery] = args;
      let q = supabase
        .from('stock_batches')
        .select('*, products(name, category, variant, unit), purchases(farmer_name)')
        .order('expiry_date', { ascending: true });

      if (prodId) {
        q = q.eq('product_id', prodId);
      }

      const { data, error } = await q;
      if (error) throw error;

      let list = (data || []).map(b => {
        const prod = b.products || {};
        const isRaw = (prod.unit === 'gr' || prod.unit === 'gram' || prod.variant === 'Curah' || String(prod.name || '').toLowerCase().includes('curah'));
        const farmerName = b.purchases?.farmer_name || b.farmer_name || '-';
        const batchCode = b.batch_code || b.batch_no || b.id;
        return {
          id: b.id,
          batch_id: batchCode,
          product_id: b.product_id,
          product_name: prod.name || b.product_name || 'Produk',
          farmer_name: farmerName,
          expiry_date: b.expiry_date || '',
          received_at: b.received_at || b.created_at || '',
          production_date: b.production_date || '',
          qty_remaining: Number(b.qty_remaining || 0),
          qty_in: Number(b.initial_qty !== undefined ? b.initial_qty : (b.qty_in !== undefined ? b.qty_in : b.qty_remaining)),
          unit: prod.unit || (isRaw ? 'gr' : 'pcs'),
          is_raw: isRaw,
          quality_status: b.quality_status || 'NORMAL'
        };
      });

      if (expQuery && String(expQuery).trim()) {
        const rawQ = String(expQuery).trim().toLowerCase();
        const cleanExp = rawQ.replace(/[^a-z0-9]/g, '');
        list = list.filter(b => {
          const rawExp = String(b.expiry_date || '').toLowerCase();
          const cleanRawExp = rawExp.replace(/[^a-z0-9]/g, '');
          const batchCodeClean = String(b.batch_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          if (rawExp.includes(rawQ)) return true;
          if (batchCodeClean.includes(cleanExp)) return true;
          if (cleanRawExp.includes(cleanExp)) return true;

          if (cleanExp.length === 4) {
            const p1 = cleanExp.slice(0, 2);
            const p2 = cleanExp.slice(2, 4);
            if (rawExp.includes(p1) && rawExp.includes(p2)) return true;
          }
          return false;
        });
      }

      return list;
    }

    case 'searchTransactionsForClaim': {
      const [, query] = args;
      const cleanQ = (query || '').trim().toLowerCase();
      if (!cleanQ) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*, products(name, is_seed))')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const filtered = (data || []).filter(t => {
        const inv = String(t.invoice_no || t.id || '').toLowerCase();
        const cName = String(t.customer_name || '').toLowerCase();
        const cPhone = String(t.customer_phone || '').toLowerCase();
        const hasBatch = (t.transaction_items || []).some(ti => String(ti.batch_id || '').toLowerCase().includes(cleanQ));
        return inv.includes(cleanQ) || cName.includes(cleanQ) || cPhone.includes(cleanQ) || hasBatch;
      });

      return filtered.map(t => ({
        id: t.invoice_no || t.id,
        created_at: t.created_at,
        customer_name: t.customer_name || 'Pelanggan Umum',
        customer_phone: t.customer_phone || '',
        items: (t.transaction_items || []).map(ti => ({
          product_id: ti.product_id,
          product_name: ti.products?.name || ti.product_name || 'Benih',
          batch_id: ti.batch_id || '',
          is_seed: ti.products?.is_seed !== false,
          qty: ti.qty
        }))
      }));
    }

    case 'getFollowUpList': {
      const [txRes, savedFollowUpsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, transaction_items(*, products(name, harvest_days, is_seed))')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'follow_up_statuses')
          .maybeSingle()
      ]);

      let savedStatuses = {};
      if (savedFollowUpsRes.data && savedFollowUpsRes.data.value) {
        try { savedStatuses = JSON.parse(savedFollowUpsRes.data.value); } catch (e) { }
      }

      const now = new Date();
      const h7List = [];
      const harvestList = [];
      const historyList = [];

      (txRes.data || []).forEach(tx => {
        if (!tx.created_at) return;
        const seedItems = (tx.transaction_items || []).filter(it => it.products?.is_seed !== false);
        if (seedItems.length === 0) return;

        const txDate = new Date(tx.created_at);
        const diffDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));
        const summary = seedItems.map(it => `${it.products?.name || 'Benih'} (${it.qty} pcs)`).join(', ');
        const custName = tx.customer_name || 'Pelanggan';
        const custPhone = tx.customer_phone || '';

        // H+7 Cek Semai (Antrean untuk transaksi 5 - 14 hari yang lalu)
        const h7Id = `h7_${tx.id}`;
        const h7Saved = savedStatuses[h7Id];
        const h7Status = h7Saved ? h7Saved.status : (diffDays >= 5 && diffDays <= 14 ? 'PENDING' : null);

        if (h7Status) {
          const item = {
            id: h7Id,
            touchpoint_type: 'H7_GERMINATION',
            status: h7Status,
            customer_name: custName,
            customer_phone: custPhone,
            transaction_id: tx.invoice_no || tx.id,
            products_summary: summary,
            greeted_at: h7Saved?.greeted_at || null,
            greeted_by: h7Saved?.greeted_by || null,
            notes: h7Saved?.notes || null
          };
          if (h7Status === 'PENDING') h7List.push(item);
          else historyList.push(item);
        }

        // Siap Panen (Berdasarkan estimasi harvest_days)
        const maxHarvestDays = Math.max(...seedItems.map(it => Number(it.products?.harvest_days || 30)));
        const harvestId = `hrv_${tx.id}`;
        const hrvSaved = savedStatuses[harvestId];
        const hrvStatus = hrvSaved ? hrvSaved.status : (diffDays >= (maxHarvestDays - 5) && diffDays <= (maxHarvestDays + 7) ? 'PENDING' : null);

        if (hrvStatus) {
          const item = {
            id: harvestId,
            touchpoint_type: 'HARVEST_ROTATION',
            status: hrvStatus,
            customer_name: custName,
            customer_phone: custPhone,
            transaction_id: tx.invoice_no || tx.id,
            products_summary: summary,
            greeted_at: hrvSaved?.greeted_at || null,
            greeted_by: hrvSaved?.greeted_by || null,
            notes: hrvSaved?.notes || null
          };
          if (hrvStatus === 'PENDING') harvestList.push(item);
          else historyList.push(item);
        }
      });

      return {
        h7List: h7List,
        harvestList: harvestList,
        historyList: historyList,
        counts: {
          h7Count: h7List.length,
          harvestCount: harvestList.length,
          historyCount: historyList.length,
          totalActive: h7List.length + harvestList.length
        }
      };
    }

    case 'markFollowUpStatus': {
      const [, followUpId, status, notes] = args;
      const { data } = await supabase.from('settings').select('value').eq('key', 'follow_up_statuses').maybeSingle();
      let statuses = {};
      if (data && data.value) {
        try { statuses = JSON.parse(data.value); } catch (e) { }
      }
      statuses[followUpId] = {
        status: status,
        notes: notes || '',
        greeted_at: formatDateIndo(new Date().toISOString()),
        greeted_by: (window.CURRENT_USER_PROFILE && window.CURRENT_USER_PROFILE.name) || 'Kasir'
      };
      await supabase.from('settings').upsert({
        key: 'follow_up_statuses',
        value: JSON.stringify(statuses),
        updated_at: new Date().toISOString()
      });
      return { success: true };
    }

    case 'testTelegramConnection': {
      const { data } = await supabase.from('settings').select('key, value');
      const settingsMap = {};
      (data || []).forEach(s => { settingsMap[s.key] = s.value; });
      const token = (settingsMap['telegram_bot_token'] || '').trim();
      const chatId = (settingsMap['telegram_chat_id'] || '').trim();

      if (!token || !chatId) {
        throw new Error('Token bot atau Chat ID Telegram belum dikonfigurasi pada menu Pengaturan.');
      }

      const text = encodeURIComponent('🔔 *KIOS IDEP POS - Tes Notifikasi*\nKoneksi bot Telegram Kios IDEP berhasil terhubung dan siap mengirimkan notifikasi operasional!');
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}&parse_mode=Markdown`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(`Telegram API Error: ${json.description || 'Gagal mengirim pesan'}`);
      }
      return { success: true, message: 'Pesan tes berhasil dikirim ke Telegram!' };
    }

    case 'setupTelegramWebhook': {
      const [, webAppUrl] = args;
      const { data } = await supabase.from('settings').select('key, value');
      const settingsMap = {};
      (data || []).forEach(s => { settingsMap[s.key] = s.value; });
      const token = (settingsMap['telegram_bot_token'] || '').trim();

      if (!token) {
        throw new Error('Token bot Telegram belum dikonfigurasi.');
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webAppUrl)}`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(`Telegram Webhook Error: ${json.description || 'Gagal registrasi webhook'}`);
      }
      return { success: true, message: json.description || 'Webhook Telegram berhasil didaftarkan!' };
    }

    // --------------------------------------------------------------------------
    // M. NOTIFIKASI LANGSUNG KE HANDPHONE (WEB PUSH & PUSAT NOTIFIKASI)
    // --------------------------------------------------------------------------
    case 'savePushSubscription': {
      const [, payload] = args;
      if (!payload || !payload.endpoint) {
        return { success: false, error: 'Endpoint langganan push kosong.' };
      }
      window.__CURRENT_PUSH_ENDPOINT = String(payload.endpoint);
      const user = window.CURRENT_USER_PROFILE || window.CURRENT_USER || {};
      const cats = Array.isArray(payload.categories)
        ? payload.categories
        : ['security', 'sales', 'stock', 'qc', 'finance', 'aftersales'];
      const prefsMap = {};
      ['security', 'sales', 'stock', 'qc', 'finance', 'aftersales'].forEach(k => {
        prefsMap[k] = cats.includes(k);
      });
      const row = {
        user_id: String(payload.user_id || user.id || ''),
        username: String(payload.username || user.username || window.USER_NAME || ''),
        role: String(payload.role || user.role || window.USER_ROLE || ''),
        device_label: String(payload.device_label || navigator.userAgent || '').slice(0, 180),
        endpoint: String(payload.endpoint),
        p256dh: String(payload.p256dh || ''),
        auth: String(payload.auth || ''),
        categories: cats,
        preferences: prefsMap,
        active: true,
        updated_at: new Date().toISOString()
      };
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(row, { onConflict: 'endpoint' });
        if (error) {
          return {
            success: true,
            mode: 'realtime_local',
            warning: error.message || 'Tabel push_subscriptions belum diaktifkan di Supabase.'
          };
        }
        return { success: true, mode: 'full_web_push' };
      } catch (err) {
        return {
          success: true,
          mode: 'realtime_local',
          warning: (err && err.message) || 'Mode notifikasi lokal & realtime aktif.'
        };
      }
    }

    case 'removePushSubscription': {
      const [, endpoint] = args;
      if (endpoint && window.__CURRENT_PUSH_ENDPOINT === endpoint) {
        window.__CURRENT_PUSH_ENDPOINT = '';
      }
      if (!endpoint) return { success: true };
      try {
        await supabase
          .from('push_subscriptions')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('endpoint', String(endpoint));
      } catch (e) {}
      return { success: true };
    }

    case 'getRecentAppNotifications': {
      const [, limitCount] = args;
      const maxRows = Number(limitCount || 40);
      try {
        const { data, error } = await supabase
          .from('app_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(maxRows);
        if (error) return [];
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    }

    case 'sendTestWebPush': {
      const [, payload] = args;
      const bodyPayload = Object.assign({
        title: '🔔 Tes Notifikasi Kios IDEP',
        body: 'Selamat! Handphone Anda sudah terhubung dan siap menerima notifikasi operasional Kios IDEP secara langsung.',
        category: 'general',
        route: '#dashboard',
        urgent: false
      }, payload || {});
      try {
        if (!supabase.functions || typeof supabase.functions.invoke !== 'function') {
          return { success: false, fallback: true, error: 'Supabase Edge Functions belum tersedia.' };
        }
        const { data, error } = await supabase.functions.invoke('send-push', {
          body: bodyPayload
        });
        if (error) {
          return { success: false, fallback: true, error: error.message || String(error) };
        }
        return { success: true, data: data };
      } catch (err) {
        return { success: false, fallback: true, error: (err && err.message) || String(err) };
      }
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
window.supabase = supabase;
window.dispatchApiCall = dispatchApiCall;
window.loginSupabaseUser = loginSupabaseUser;
window.logoutSupabaseUser = logoutSupabaseUser;
window.checkSupabaseSession = checkSupabaseSession;
window.uploadToSupabaseStorage = uploadToSupabaseStorage;
window.importBulkProducts = (token, productsArray) => dispatchApiCall('importBulkProducts', [token, productsArray]);

// Inisialisasi otomatis saat script dimuat
document.addEventListener('DOMContentLoaded', () => {
  checkSupabaseSession().then(user => {
    if (user && typeof updateUserInfoUI === 'function') {
      updateUserInfoUI(user);
    }
  });
});
