// Modul Layanan API (Core): Users, Produk, Pengadaan, Produksi, QC & Mutasi Stok FIFO

/**
 * Helper kelayakan batch untuk penjualan, pengurangan FIFO, dan Kemas Mandiri.
 * Mengizinkan batch lama tanpa nilai qc_status (dianggap APPROVED/NORMAL),
 * serta memblokir batch berstatus QUARANTINE, REJECTED, PENDING_QC, atau IN_PROGRESS.
 */
function isBatchEligibleForSale(b) {
  if (!b) return false;
  const qStatus = String(b.quality_status || 'NORMAL').toUpperCase().trim();
  const qcStatus = String(b.qc_status || 'APPROVED').toUpperCase().trim();
  if (qStatus === 'QUARANTINE') return false;
  if (qcStatus === 'REJECTED' || qcStatus === 'PENDING_QC' || qcStatus === 'IN_PROGRESS') return false;
  return true;
}

/**
 * Helper menyelesaikan konteks metadata QC terbaca (batch_code, product_name, farmer_name, tested_by)
 * dari payload atau lookup stock_batches/products agar selaras dengan skema seed_qc_logs.
 */
async function resolveQCLogContext(payload) {
  const user = window.CURRENT_USER_PROFILE || window.CURRENT_USER || null;
  const testedBy = (user && (user.full_name || user.name || user.username || user.email || user.id))
    ? String(user.full_name || user.name || user.username || user.email || user.id).trim()
    : 'Sistem';

  let batchCode = (payload && payload.batch_code) ? String(payload.batch_code).trim() : '';
  let productName = (payload && payload.product_name) ? String(payload.product_name).trim() : '';
  let farmerName = (payload && payload.farmer_name) ? String(payload.farmer_name).trim() : '';

  if (payload && payload.batch_id && (!batchCode || !productName || !farmerName)) {
    try {
      let metaRes = await supabase
        .from('stock_batches')
        .select('batch_code, farmer_name, products(name), purchases(farmer_name, farmers(name))')
        .eq('id', payload.batch_id)
        .maybeSingle();

      if (metaRes.error) {
        metaRes = await supabase
          .from('stock_batches')
          .select('batch_code, farmer_name, products(name)')
          .eq('id', payload.batch_id)
          .maybeSingle();
      }

      const meta = metaRes.data;
      if (meta) {
        if (!batchCode && meta.batch_code) batchCode = String(meta.batch_code).trim();
        if (!productName && meta.products && meta.products.name) productName = String(meta.products.name).trim();
        if (!farmerName) {
          farmerName = (meta.purchases && meta.purchases.farmers && meta.purchases.farmers.name) ||
            (meta.purchases && meta.purchases.farmer_name) ||
            meta.farmer_name ||
            '';
        }
      }
    } catch (e) {
      console.warn('[QC] Gagal lookup konteks batch:', e);
    }
  }

  return {
    batch_code: batchCode || (payload && payload.batch_id ? String(payload.batch_id) : '-'),
    product_name: productName || '',
    farmer_name: farmerName || '',
    tested_by: testedBy
  };
}

/**
 * Konversi string tanggal YYYY-MM-DD (atau ISO) menjadi timestamp lokal yang akurat
 */
function parseLocalTransactionCreatedAt(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (!raw) return null;
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]) - 1;
    const d = Number(ymdMatch[3]);
    const now = new Date();
    const localDt = new Date(y, m, d, now.getHours(), now.getMinutes(), now.getSeconds());
    return isNaN(localDt.getTime()) ? null : localDt.toISOString();
  }
  const parsedD = new Date(raw);
  return isNaN(parsedD.getTime()) ? null : parsedD.toISOString();
}

/**
 * Bangun rincian biaya tambahan (ongkir, QRIS MDR, uang tunai/kembalian) & total akhir transaksi
 */
function buildTransactionFeeRecord(payload, subtotal, tax) {
  const shippingCost = Math.max(0, Math.round(Number(payload?.shipping_cost || 0) || 0));
  const feeNote = String(payload?.fee_note || '').trim();
  const qrisFee = Math.max(0, Math.round(Number(payload?.qris_fee || 0) || 0));
  const cashReceivedRaw = Number(payload?.cash_received || 0) || 0;
  const cashReceived = cashReceivedRaw > 0 ? Math.round(cashReceivedRaw) : 0;
  const changeAmount = Math.max(0, Math.round(Number(payload?.change_amount || 0) || 0));
  const customerQrisAddition = payload?.qris_charged_to_customer ? qrisFee : 0;
  const defaultTotal = subtotal + tax + shippingCost + customerQrisAddition;
  const hasExplicitTotal = payload?.total !== undefined && payload?.total !== null && payload?.total !== '';
  const total = hasExplicitTotal ? Number(payload.total) : defaultTotal;

  return {
    shippingCost,
    feeNote,
    qrisFee,
    cashReceived,
    changeAmount,
    total,
    extraColumns: {
      shipping_cost: shippingCost,
      fee_note: feeNote,
      qris_fee: qrisFee,
      cash_received: cashReceived,
      change_amount: changeAmount
    }
  };
}

/**
 * Simpan / update transaksi ke Supabase dengan fallback otomatis jika kolom biaya tambahan belum dimigrasi
 */
async function persistTransactionWithFallback(mode, rowData, extraColumns, matchId) {
  const withExtras = Object.assign({}, rowData, extraColumns || {});
  const runQuery = async (payloadObj) => {
    if (mode === 'insert') {
      return await supabase.from('transactions').insert(payloadObj).select().single();
    }
    return await supabase.from('transactions').update(payloadObj).eq('id', matchId);
  };

  let res = await runQuery(withExtras);
  if (!res.error) {
    return { data: res.data || null, error: null, usedFallback: false };
  }

  const errMsg = String(res.error.message || res.error.details || res.error.hint || '').toLowerCase();
  const errCode = String(res.error.code || '');
  const extraKeys = Object.keys(extraColumns || {});
  const isMissingSchemaColumn =
    errCode === 'PGRST204' ||
    errCode === '42703' ||
    errMsg.includes('schema cache') ||
    errMsg.includes('column') && extraKeys.some(k => errMsg.includes(k));

  if (!isMissingSchemaColumn) {
    return { data: null, error: res.error, usedFallback: false };
  }

  console.warn('[POS] Kolom biaya tambahan belum tersedia di database, menyimpan dengan fallback schema dasar:', res.error.message);
  res = await runQuery(rowData);
  return { data: res.data || null, error: res.error || null, usedFallback: true };
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

  // 1. Ambil daftar stock_batches untuk productId yang qty_remaining > 0 & lolos QC
  const { data: batches, error } = await supabase
    .from('stock_batches')
    .select('*')
    .eq('product_id', productId)
    .gt('qty_remaining', 0)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('production_date', { ascending: true });

  if (error) throw error;
  let batchList = (batches ? [...batches] : []).filter(isBatchEligibleForSale);

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
      let itemUnit = 'pcs';
      try {
        if (typeof PRODUCTS_CACHE !== 'undefined' && Array.isArray(PRODUCTS_CACHE)) {
          const foundP = PRODUCTS_CACHE.find(p => p && p.id === productId);
          if (foundP && foundP.unit) itemUnit = foundP.unit;
        }
      } catch (e) {}

      const nowIso = new Date().toISOString();
      const bCode = batch.batch_code || batch.batch_no || batch.id;
      const refCode = refNo || refId || 'POS';
      const notesDesc = mutationType === 'KELUAR_KONSINYASI'
        ? `Kirim Konsinyasi #${refCode} (Batch: ${bCode})`
        : `Penjualan Kasir #${refCode} (Batch: ${bCode})`;

      const mutRecord = {
        id: crypto.randomUUID(),
        product_id: productId,
        batch_id: batch.id,
        reference_no: refCode,
        mutation_type: mutationType || 'KELUAR_PENJUALAN',
        qty: -deduct,
        qty_change: -deduct,
        qty_after: newQty,
        unit: itemUnit,
        notes: notesDesc,
        created_at: nowIso
      };

      // Simpan ke backup lokal terlebih dahulu agar aman dan langsung tampil
      if (typeof saveMutationToLocalBackup === 'function') {
        saveMutationToLocalBackup(mutRecord);
      }

      // Insert ke Supabase dengan field standar tabel
      const { error: insErr } = await supabase.from('stock_mutations').insert({
        id: mutRecord.id,
        product_id: mutRecord.product_id,
        batch_id: mutRecord.batch_id,
        reference_no: mutRecord.reference_no,
        mutation_type: mutRecord.mutation_type,
        qty: mutRecord.qty,
        unit: mutRecord.unit,
        notes: mutRecord.notes,
        created_at: mutRecord.created_at
      });

      if (insErr) {
        console.warn('[FIFO] Insert stock_mutations standar gagal, coba fallback mutRecord penuh:', insErr);
        await supabase.from('stock_mutations').insert(mutRecord);
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



async function handleCoreApi(fnName, args) {
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
        supabase.from('consignment_transfer_items').select('*, consignment_transfers(invoice_no, transfer_date, outlets(name, phone))').eq('batch_id', batchId).catch(function () { return { data: [] }; })
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
          const msg = encodeURIComponent(`Halo ${tx.customer_name || 'Bpk/Ibu'}, kami dari Bagian Toko ingin mengonfirmasi terkait benih ${prodName} (Batch: ${batchId}) yang Anda beli pada ${formatDateIndo(tx.created_at)}.`);
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
          const msg = encodeURIComponent(`Halo ${outlet.name || 'Mitra Outlet'}, kami dari Bagian Distribusi ingin mengonfirmasi terkait stok benih ${prodName} (Batch: ${batchId}) pada Surat Jalan ${tr.invoice_no || '-'}.`);
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
        if (isBatchEligibleForSale(b)) {
          if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
          batchMap[b.product_id].push(b);
          stockMap[b.product_id] = (stockMap[b.product_id] || 0) + Number(b.qty_remaining || 0);
        }
      });

      return (prodsRes.data || []).map(p => {
        let weightGrams = Number(p.weight_grams || 0);
        if (!weightGrams && p.variant) {
          const m = String(p.variant).match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram)/i);
          if (m) weightGrams = Number(m[1]);
        }
        return {
          id: p.id,
          sku: p.sku || '',
          name: p.name,
          category: p.category,
          product_type: p.product_type,
          variant: p.variant || '',
          weight_grams: weightGrams,
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
        };
      });
    }

    case 'saveProduct': {
      const [, payload] = args;
      const isSeed = String(payload.product_type || payload.category || '').toLowerCase().includes('benih');
      const weightGrams = Number(payload.weight_grams || 0);
      const productObj = {
        name: payload.name,
        ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
        category: payload.category || 'Benih',
        product_type: payload.product_type || 'raw_seed',
        variant: payload.variant || (weightGrams > 0 ? (weightGrams + 'g') : ''),
        unit: payload.unit || 'pcs',
        photo_url: payload.photo_url || '',
        packaging_type_id: payload.packaging_type_id || null,
        harvest_days: Number(payload.harvest_days) || 0,
        is_active: payload.active !== false,
        active: payload.active !== false,
        is_seed: isSeed
      };
      if (weightGrams > 0) {
        productObj.weight_grams = weightGrams;
      }

      let productId = payload.id;
      if (productId) {
        let { error } = await supabase.from('products').update(productObj).eq('id', productId);
        if (error && error.message && error.message.includes('weight_grams')) {
          delete productObj.weight_grams;
          const retry = await supabase.from('products').update(productObj).eq('id', productId);
          error = retry.error;
        }
        if (error) throw error;
      } else {
        const newId = crypto.randomUUID();
        const insertObj = {
          id: newId,
          ...productObj
        };
        let { data, error } = await supabase.from('products').insert(insertObj).select('id').single();
        if (error && error.message && error.message.includes('weight_grams')) {
          delete insertObj.weight_grams;
          const retry = await supabase.from('products').insert(insertObj).select('id').single();
          data = retry.data;
          error = retry.error;
        }
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
          const rawWeight = item.weight_grams ?? item.berat_kemasan_gram ?? item.Berat_Kemasan_Gram ?? item.netto ?? item.gramatur;
          const weightGrams = Number(rawWeight) || 0;
          const variant = item.variant || (weightGrams > 0 ? (weightGrams + 'g') : '');

          let productId;
          const existing = existingMap[sku.toLowerCase()];

          const updateObj = {
            name: name,
            category: category,
            product_type: productType,
            variant: variant,
            unit: unit,
            harvest_days: harvestDays,
            is_active: true,
            active: true,
            is_seed: isSeed,
            updated_at: new Date().toISOString()
          };
          if (weightGrams > 0) updateObj.weight_grams = weightGrams;

          if (existing) {
            productId = existing.id;
            let { error: updErr } = await supabase
              .from('products')
              .update(updateObj)
              .eq('id', productId);
            if (updErr && updErr.message && updErr.message.includes('weight_grams')) {
              delete updateObj.weight_grams;
              const retry = await supabase.from('products').update(updateObj).eq('id', productId);
              updErr = retry.error;
            }
            if (updErr) throw updErr;
          } else {
            productId = crypto.randomUUID();
            const insertObj = {
              id: productId,
              sku: sku,
              name: name,
              category: category,
              product_type: productType,
              variant: variant,
              unit: unit,
              harvest_days: harvestDays,
              is_active: true,
              active: true,
              is_seed: isSeed,
              stock: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            if (weightGrams > 0) insertObj.weight_grams = weightGrams;

            let { error: insErr } = await supabase
              .from('products')
              .insert(insertObj);
            if (insErr && insErr.message && insErr.message.includes('weight_grams')) {
              delete insertObj.weight_grams;
              const retry = await supabase.from('products').insert(insertObj);
              insErr = retry.error;
            }
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
    // D. PENGADAAN (PURCHASES, SUPPLIERS, FARMERS)
    // --------------------------------------------------------------------------
    case 'getPurchases': {
      const [purRes, batchesRes, itemsRes, prodsRes] = await Promise.all([
        supabase
          .from('purchases')
          .select('*, suppliers(name), farmers(name)')
          .order('created_at', { ascending: false }),
        supabase.from('stock_batches').select('*').not('purchase_id', 'is', null),
        supabase.from('purchase_items').select('*'),
        supabase.from('products').select('id, name, unit, category, inventory_type')
      ]);

      if (purRes.error) throw purRes.error;

      const prodMap = {};
      (prodsRes.data || []).forEach(pr => { prodMap[pr.id] = pr; });

      const batchesByPur = {};
      (batchesRes.data || []).forEach(b => {
        if (!b || !b.purchase_id) return;
        if (!batchesByPur[b.purchase_id]) batchesByPur[b.purchase_id] = [];
        batchesByPur[b.purchase_id].push(b);
      });

      const itemsByPur = {};
      if (!itemsRes.error && Array.isArray(itemsRes.data)) {
        itemsRes.data.forEach(it => {
          if (!it || !it.purchase_id) return;
          if (!itemsByPur[it.purchase_id]) itemsByPur[it.purchase_id] = [];
          itemsByPur[it.purchase_id].push(it);
        });
      }

      return (purRes.data || []).map(p => {
        const supplierName = p.suppliers ? p.suppliers.name : (p.supplier_name || '(tidak diketahui)');
        const farmerName = p.farmers ? p.farmers.name : (p.farmer_name || '-');
        const batches = batchesByPur[p.id] || [];
        const rawItems = itemsByPur[p.id] || [];

        const detailItems = batches.length > 0
          ? batches.map((b, idx) => {
            const prod = prodMap[b.product_id] || {};
            const matchedItem = rawItems.find(it =>
              String(it.product_id) === String(b.product_id) &&
              (!it.batch_no || !b.batch_code || String(it.batch_no) === String(b.batch_code))
            ) || rawItems[idx] || {};

            const qtyIn = Number(b.qty_in !== undefined && b.qty_in !== null ? b.qty_in : (matchedItem.qty || 0));
            const qtyRem = Number(b.qty_remaining !== undefined && b.qty_remaining !== null ? b.qty_remaining : qtyIn);
            const buyPrice = Number(b.buy_price !== undefined && b.buy_price !== null ? b.buy_price : (matchedItem.buy_price || 0));
            const costUnit = Number(b.cost_per_unit !== undefined && b.cost_per_unit !== null ? b.cost_per_unit : (matchedItem.cost_per_unit || buyPrice));
            const addCost = Number(matchedItem.additional_cost !== undefined && matchedItem.additional_cost !== null ? matchedItem.additional_cost : Math.max(0, costUnit - buyPrice));
            return {
              batch_id: b.id,
              batch_code: b.batch_code || matchedItem.batch_no || b.id,
              product_id: b.product_id,
              product_name: prod.name || ('Produk ' + b.product_id),
              unit: prod.unit || 'pcs',
              qty_in: qtyIn,
              qty_remaining: qtyRem,
              buy_price: buyPrice,
              additional_cost: addCost,
              cost_per_unit: costUnit,
              subtotal: matchedItem.subtotal ? Number(matchedItem.subtotal) : (qtyIn * costUnit),
              production_date: b.production_date || matchedItem.production_date || null,
              expiry_date: b.expiry_date || matchedItem.expiry_date || null,
              qc_status: b.qc_status || 'APPROVED',
              quality_status: b.quality_status || 'NORMAL'
            };
          })
          : rawItems.map(it => {
            const prod = prodMap[it.product_id] || {};
            const qtyIn = Number(it.qty || 0);
            const buyPrice = Number(it.buy_price || 0);
            const addCost = Number(it.additional_cost || 0);
            const costUnit = Number(it.cost_per_unit !== undefined ? it.cost_per_unit : (buyPrice + addCost));
            return {
              batch_id: null,
              batch_code: it.batch_no || '-',
              product_id: it.product_id,
              product_name: prod.name || ('Produk ' + it.product_id),
              unit: prod.unit || 'pcs',
              qty_in: qtyIn,
              qty_remaining: qtyIn,
              buy_price: buyPrice,
              additional_cost: addCost,
              cost_per_unit: costUnit,
              subtotal: it.subtotal ? Number(it.subtotal) : (qtyIn * costUnit),
              production_date: it.production_date || null,
              expiry_date: it.expiry_date || null,
              qc_status: 'APPROVED',
              quality_status: 'NORMAL'
            };
          });

        const usedBatch = batches.find(b => Number(b.qty_remaining || 0) !== Number(b.qty_in || 0));
        const invStr = String(p.invoice_no || '').toUpperCase();
        const isStokAwal = invStr.startsWith('INV-STO') ||
          invStr.startsWith('SA-') ||
          String(supplierName).toUpperCase().includes('STOK AWAL') ||
          String(farmerName).toUpperCase().includes('STOK AWAL') ||
          String(p.notes || '').toUpperCase().includes('STOK AWAL');

        return {
          ...p,
          supplier_name: supplierName,
          farmer_name: farmerName,
          is_stok_awal: isStokAwal,
          can_delete: !usedBatch,
          locked_reason: usedBatch
            ? ('Batch "' + (usedBatch.batch_code || usedBatch.id) + '" sudah terpakai/berubah stoknya (' + usedBatch.qty_remaining + '/' + usedBatch.qty_in + ')')
            : '',
          items: detailItems,
          item_count: detailItems.length
        };
      });
    }

    case 'createPurchase': {
      const [, purchase] = args;
      const purchaseId = crypto.randomUUID();
      const invoiceNo = purchase.invoice_no || await generateSequentialDocNo('PO', 'purchases', 'invoice_no');
      const now = new Date().toISOString();

      // 1. Simpan Header Pembelian
      const { error: purErr } = await supabase.from('purchases').insert({
        id: purchaseId,
        invoice_no: invoiceNo,
        supplier_id: purchase.supplier_id || null,
        farmer_id: purchase.farmer_id || null,
        farmer_name: purchase.farmer_name || null,
        total: Number(purchase.total || 0),
        notes: purchase.notes || ''
      });
      if (purErr) throw purErr;

      // 2. Simpan Item-Item menjadi Purchase Items, Stock Batches, dan Stock Movements
      for (const item of (purchase.items || [])) {
        const batchId = crypto.randomUUID();
        const d = item.production_date ? new Date(item.production_date) : new Date();
        const yymm = String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0');
        const batchCode = item.batch_no ? String(item.batch_no).trim() : `BATCH-BENIH-${yymm}-001`;
        const qtyIn = Number(item.qty || 0);
        const buyPrice = Number(item.buy_price || 0);

        // Identifikasi apakah produk curah (berdasarkan unit 'gr'/'gram', inventory_type 'curah', atau flag is_curah)
        const unitLower = String(item.unit || '').toLowerCase().trim();
        const invLower = String(item.inventory_type || '').toLowerCase().trim();
        const isCurah = Boolean(item.is_curah) || unitLower === 'gr' || unitLower === 'gram' || invLower === 'curah' || invLower === 'curah mentah';

        const additionalCost = isCurah ? 0 : Number(item.additional_cost || 0);
        const costPerUnit = isCurah ? buyPrice : Number(item.cost_per_unit !== undefined ? item.cost_per_unit : (buyPrice + additionalCost));

        // Hanya benih mentah curah yang masuk ke antrean PENDING_QC (butuh uji lab & oven DHT);
        // Status quality_status tetap NORMAL (QUARANTINE hanya jika gagal uji < 80% atau komplain >= 3),
        // sementara stok/Kemas Mandiri/POS tetap terkunci karena qc_status = 'PENDING_QC'.
        // Barang kemasan sachet siap jual, non-curah, dan produk non-benih langsung APPROVED & NORMAL.
        const isSeed = item.is_seed !== false && String(item.category || '').toLowerCase() !== 'non-benih' && String(item.product_type || '').toLowerCase() !== 'buku';
        const needsQC = isCurah && isSeed;
        const qcStatus = needsQC ? 'PENDING_QC' : 'APPROVED';
        const qualityStatus = 'NORMAL';

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
          farmer_name: item.farmer_name || purchase.farmer_name || null,
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

      // 1. Verifikasi keamanan: cek header faktur & batch terkait
      const [{ data: purHeader }, { data: purBatches, error: bCheckErr }] = await Promise.all([
        supabase.from('purchases').select('id, invoice_no').eq('id', purchaseId).maybeSingle(),
        supabase.from('stock_batches').select('id, batch_code, qty_in, qty_remaining').eq('purchase_id', purchaseId)
      ]);
      if (bCheckErr) throw bCheckErr;

      const batchList = purBatches || [];
      const changedBatch = batchList.find(b => Number(b.qty_remaining || 0) !== Number(b.qty_in || 0));
      if (changedBatch) {
        throw new Error(`Faktur tidak dapat dihapus karena batch "${changedBatch.batch_code || changedBatch.id}" sudah terpakai atau stoknya berubah (${changedBatch.qty_remaining}/${changedBatch.qty_in}).`);
      }

      const batchIds = batchList.map(b => b.id);
      if (batchIds.length > 0) {
        // Cegah hapus bila ada aktivitas produksi Kemas Mandiri atau mutasi di luar MASUK_PEMBELIAN
        const { data: prodUsed } = await supabase
          .from('productions')
          .select('id')
          .in('source_batch_id', batchIds)
          .limit(1);
        if (prodUsed && prodUsed.length > 0) {
          throw new Error('Faktur tidak dapat dihapus karena batch bahan bakunya sudah tercatat di modul Kemas Mandiri.');
        }

        const { data: otherMut } = await supabase
          .from('stock_mutations')
          .select('id, mutation_type')
          .in('batch_id', batchIds)
          .neq('mutation_type', 'MASUK_PEMBELIAN')
          .limit(1);
        if (otherMut && otherMut.length > 0) {
          throw new Error(`Faktur tidak dapat dihapus karena batch sudah memiliki riwayat mutasi (${otherMut[0].mutation_type}).`);
        }
      }

      // 2. Bersihkan seluruh jejak log terkait secara berurutan
      const invNo = purHeader ? purHeader.invoice_no : '';
      if (batchIds.length > 0) {
        try { await supabase.from('seed_qc_logs').delete().in('batch_id', batchIds); } catch (e) {}
        try { await supabase.from('stock_mutations').delete().in('batch_id', batchIds); } catch (e) {}
        try { await supabase.from('stock_movements').delete().in('batch_id', batchIds); } catch (e) {}
      }
      if (invNo) {
        try {
          await supabase.from('stock_mutations').delete().eq('reference_no', invNo).eq('mutation_type', 'MASUK_PEMBELIAN');
        } catch (e) {}
      }
      try {
        await supabase.from('purchase_items').delete().eq('purchase_id', purchaseId);
      } catch (e) {}

      const { error: delBatchErr } = await supabase.from('stock_batches').delete().eq('purchase_id', purchaseId);
      if (delBatchErr) throw delBatchErr;

      try {
        await supabase.from('stock_movements').delete().eq('ref_id', purchaseId);
      } catch (e) {}

      const { error } = await supabase.from('purchases').delete().eq('id', purchaseId);
      if (error) throw error;

      removePurchaseMutationsFromLocalBackup(batchIds, invNo);
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
      if (!isBatchEligibleForSale(srcBatch)) {
        throw new Error(`Batch "${srcBatch.batch_code || srcBatch.id}" belum lolos Quality Control (Status: ${srcBatch.qc_status || srcBatch.quality_status}). Selesaikan pengujian hingga Pasca-DHT terlebih dahulu.`);
      }
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
      const dProd = new Date();
      const yymmProd = String(dProd.getFullYear()).slice(-2) + String(dProd.getMonth() + 1).padStart(2, '0');
      const targetBatchCode = payload.lot_no || payload.source_batch_code || srcBatch.batch_code || `BATCH-PROD-${yymmProd}-001`;

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
        const packGram = Number(pack.weight_grams || 0);
        const packObj = {
          id: packId,
          name: pack.name,
          category: raw.category || 'Benih',
          product_type: 'packaged_seed',
          variant: pack.variant || (packGram > 0 ? (packGram + 'g') : ''),
          unit: pack.unit || 'pcs',
          packaging_type_id: pack.packaging_type_id || null,
          is_active: true,
          active: true,
          is_seed: true
        };
        if (packGram > 0) packObj.weight_grams = packGram;

        let { data: pProd, error: pErr } = await supabase.from('products').insert(packObj).select('id').single();
        if (pErr && pErr.message && pErr.message.includes('weight_grams')) {
          delete packObj.weight_grams;
          const retry = await supabase.from('products').insert(packObj).select('id').single();
          pProd = retry.data;
          pErr = retry.error;
        }
        if (pErr) throw pErr;

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
        supabase.from('purchases').select('id, farmer_name, farmer_id, created_at, farmers(name)')
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

      // Filter toples benih curah/baku (unit gr/gram/g/kg, inventory_type curah, atau product_type raw_seed)
      const seedBatches = batches.filter(b => {
        const p = prodMap[b.product_id];
        if (!p) return false;
        const isSeed = String(p.category || '').toLowerCase().includes('benih');
        const uLower = String(p.unit || '').toLowerCase().trim();
        const invLower = String(p.inventory_type || '').toLowerCase().trim();
        const isRaw = p.product_type === 'raw_seed' || uLower === 'gram' || uLower === 'gr' || uLower === 'g' || uLower === 'kg' || invLower.includes('curah');
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

        const dhtIdx = bLogs.findIndex(l => l.stage === 'DHT_24JAM');
        const pascaIdx = bLogs.findIndex(l => l.stage === 'UJI_3_PASCA_DHT' || l.stage === 'PASCA_DHT');
        const dhtLog = dhtIdx !== -1 ? bLogs[dhtIdx] : null;
        let dhtInfo = null;
        if (dhtLog) {
          const dhtStatusUpper = String(dhtLog.status || '').toUpperCase();
          const finishedByStatus = dhtStatusUpper === 'PASSED' || dhtStatusUpper === 'COMPLETED';
          const finishedByPasca = pascaIdx !== -1 && pascaIdx < dhtIdx;
          dhtInfo = {
            oven_no: dhtLog.dht_oven_no || 'Oven 1',
            target_temp: Number(dhtLog.dht_target_temp || 50),
            start_time: dhtLog.dht_start_time || dhtLog.tested_at || '',
            end_time: dhtLog.dht_end_time || '',
            is_finished: finishedByStatus || finishedByPasca
          };
        }

        let qcStatus = String(b.qc_status || '').toUpperCase().trim();
        const qualityStatus = String(b.quality_status || 'NORMAL').toUpperCase().trim();

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

        const hasActiveDHT = Boolean(dhtInfo && !dhtInfo.is_finished);
        const lastLogStatus = lastLog ? String(lastLog.status || '').toUpperCase().trim() : '';
        const isQuarantinedFailure = qcStatus === 'REJECTED' ||
          lastLogStatus === 'FAILED' ||
          (qualityStatus === 'QUARANTINE' && qcStatus !== 'PENDING_QC' && qcStatus !== 'IN_PROGRESS');

        let category = 'Menunggu Uji';
        if (hasActiveDHT) {
          category = 'Proses DHT';
        } else if (isQuarantinedFailure) {
          category = 'Karantina/Gagal';
          if (!qcStatus || qcStatus === 'PENDING_QC' || qcStatus === 'IN_PROGRESS') {
            qcStatus = 'REJECTED';
          }
        } else if (isNeedsRetest) {
          category = 'Butuh Uji Berkala';
        } else if (qcStatus === 'APPROVED' || qualityStatus === 'APPROVED') {
          category = 'Lolos Mutu';
          qcStatus = 'APPROVED';
        } else if (lastLog && (lastLog.stage === 'UJI_3_PASCA_DHT' || lastLog.stage === 'PASCA_DHT') && Number(lastLog.germination_rate || 0) >= 80) {
          category = 'Lolos Mutu';
          qcStatus = 'APPROVED';
        } else {
          category = 'Menunggu Uji';
        }

        if (!qcStatus) {
          qcStatus = category === 'Lolos Mutu' ? 'APPROVED' : (category === 'Karantina/Gagal' ? 'REJECTED' : 'PENDING_QC');
        }

        const farmerNameResolved = (purch.farmers && purch.farmers.name) || purch.farmer_name || b.farmer_name || (lastLog ? lastLog.farmer_name : '') || '-';

        return {
          batch_id: b.id,
          batch_code: b.batch_code || b.id,
          product_id: b.product_id,
          product_name: prod.name || ('Produk ' + b.product_id),
          product_category: prod.category || 'Benih',
          farmer_name: farmerNameResolved,
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
          last_photo_url: lastLog ? (lastLog.photo_drive_url || lastLog.photo_url || '') : '',
          last_tested_at: lastLog ? (lastLog.tested_at || lastLog.created_at || '') : '',
          last_tested_by: lastLog ? lastLog.tested_by : '',
          last_status: lastLog ? lastLog.status : 'PENDING',
          notes: lastLog ? (lastLog.notes || '') : '',
          history: bLogs.map(l => ({
            ...l,
            photo_drive_url: l.photo_drive_url || l.photo_url || '',
            tested_at: l.tested_at || l.created_at || ''
          }))
        };
      });

      return records;
    }

    case 'saveQCStageWithPhoto': {
      const [, payload] = args;
      const stageCode = String(payload.stage || 'RUTIN').toUpperCase().trim();
      const isFinalReleaseStage = stageCode === 'UJI_3_PASCA_DHT' || stageCode === 'PASCA_DHT' || stageCode === 'UJI_BERKALA';
      const qcCtx = await resolveQCLogContext(payload);
      const batchCodeDisplay = qcCtx.batch_code;
      const nowIso = new Date().toISOString();

      let photoUrl = payload.photo_url || '';
      if (payload.imageBase64 && payload.imageBase64.startsWith('data:image')) {
        try {
          const fileName = `qc_${payload.batch_id}_${stageCode}.jpg`;
          photoUrl = await uploadToSupabaseStorage('qc-photos', fileName, payload.imageBase64, payload.imageMimeType || 'image/jpeg');
        } catch (uploadErr) {
          console.warn('[QC Upload Storage Fallback] Menggunakan base64 sebagai fallback photo_drive_url:', uploadErr);
          photoUrl = payload.imageBase64;
        }
      }

      let germRate = null;
      if (payload.tray_a !== undefined && payload.tray_b !== undefined) {
        germRate = Number(payload.tray_a || 0) + Number(payload.tray_b || 0);
      }

      let qcStatus = 'IN_PROGRESS';
      let batchQuality = 'NORMAL';
      let batchQcStatus = 'IN_PROGRESS';

      if (germRate !== null) {
        if (germRate >= 80) {
          qcStatus = 'PASSED';
          batchQuality = 'NORMAL';
          // Hanya Tahap 4 (Pasca-DHT) dan Tahap 5 (Uji Berkala) yang membuka kunci APPROVED;
          // Tahap 1 & 2 (Pra-DHT) tetap berstatus IN_PROGRESS hingga selesai Oven DHT & Pasca-DHT.
          batchQcStatus = isFinalReleaseStage ? 'APPROVED' : 'IN_PROGRESS';
        } else {
          qcStatus = 'FAILED';
          batchQuality = 'QUARANTINE';
          batchQcStatus = 'REJECTED';
        }
      }

      const qcId = await generateSequentialDocNo('QC', 'seed_qc_logs', 'qc_id');
      const { data: qcRecord, error: qcErr } = await supabase.from('seed_qc_logs').insert({
        qc_id: qcId,
        batch_id: payload.batch_id,
        product_name: qcCtx.product_name,
        farmer_name: qcCtx.farmer_name,
        stage: stageCode,
        germination_rate: germRate,
        tray_a_count: Number(payload.tray_a || 0),
        tray_b_count: Number(payload.tray_b || 0),
        photo_drive_url: photoUrl,
        dht_oven_no: payload.dht_oven_no || null,
        dht_target_temp: payload.dht_target_temp ? Number(payload.dht_target_temp) : null,
        dht_start_time: payload.dht_start_time || null,
        dht_end_time: payload.dht_end_time || null,
        tested_at: nowIso,
        tested_by: qcCtx.tested_by,
        status: qcStatus,
        notes: payload.notes || ''
      }).select().single();

      if (qcErr) throw qcErr;

      // Pastikan log DHT yang masih IN_PROGRESS ikut ditandai COMPLETED bila sudah lanjut ke Pasca-DHT
      if (stageCode === 'UJI_3_PASCA_DHT' || stageCode === 'PASCA_DHT') {
        await supabase
          .from('seed_qc_logs')
          .update({ status: 'COMPLETED' })
          .eq('batch_id', payload.batch_id)
          .eq('stage', 'DHT_24JAM')
          .eq('status', 'IN_PROGRESS');
      }

      if (germRate !== null) {
        const { error: batchUpdErr } = await supabase.from('stock_batches').update({
          quality_status: batchQuality,
          qc_status: batchQcStatus,
          updated_at: nowIso
        }).eq('id', payload.batch_id);
        if (batchUpdErr) throw batchUpdErr;
      }

      if (batchQuality === 'QUARANTINE' || qcStatus === 'FAILED') {
        emitOperationalNotification({
          title: '🚨 Karantina QC Lot Benih!',
          body: 'Batch ' + batchCodeDisplay + ' gagal standar mutu' + (germRate !== null ? ' (Daya tumbuh ' + germRate + '%)' : '') + ' dan masuk status KARANTINA.',
          category: 'qc',
          route: '#qc',
          urgent: true
        });
      } else if (batchQcStatus === 'APPROVED') {
        emitOperationalNotification({
          title: '✅ Lot Benih Lolos Uji Mutu Final',
          body: 'Batch ' + batchCodeDisplay + ' lolos uji mutu (' + germRate + '%). Kunci stok Kemas Mandiri & Kasir telah dibuka.',
          category: 'qc',
          route: '#qc',
          urgent: false
        });
      } else if (qcStatus === 'PASSED') {
        emitOperationalNotification({
          title: '🧪 Uji Pra-DHT Lolos (' + germRate + '%)',
          body: 'Batch ' + batchCodeDisplay + ' lolos uji awal (' + germRate + '%). Silakan lanjut ke tahapan berikutnya hingga Uji Pasca-DHT.',
          category: 'qc',
          route: '#qc',
          urgent: false
        });
      }

      return {
        success: true,
        message: batchQcStatus === 'APPROVED'
          ? 'Lot benih lolos uji mutu final (' + germRate + '%) dan kunci stok telah dibuka!'
          : (qcStatus === 'FAILED'
            ? 'Hasil uji di bawah 80% (' + germRate + '%). Batch masuk status Karantina/Gagal.'
            : 'Catatan uji pra-DHT (' + germRate + '%) berhasil disimpan. Lanjutkan hingga Pasca-DHT untuk membuka kunci stok.'),
        photo_url: photoUrl,
        qc_record: qcRecord
      };
    }

    case 'startDHTSession': {
      const [, payload] = args;
      const startDate = payload.start_time ? new Date(payload.start_time) : new Date();
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      const nowIso = new Date().toISOString();
      const qcCtx = await resolveQCLogContext(payload);
      const batchCodeDisplay = qcCtx.batch_code;

      const qcId = await generateSequentialDocNo('DHT', 'seed_qc_logs', 'qc_id');
      const { data, error } = await supabase.from('seed_qc_logs').insert({
        qc_id: qcId,
        batch_id: payload.batch_id,
        product_name: qcCtx.product_name,
        farmer_name: qcCtx.farmer_name,
        stage: 'DHT_24JAM',
        dht_oven_no: payload.oven_no || 'Oven 1',
        dht_target_temp: Number(payload.target_temp || 50),
        dht_start_time: startDate.toISOString(),
        dht_end_time: endDate.toISOString(),
        tested_at: nowIso,
        tested_by: qcCtx.tested_by,
        status: 'IN_PROGRESS',
        notes: payload.notes || ''
      }).select().single();

      if (error) throw error;

      const { error: dhtBatchErr } = await supabase.from('stock_batches').update({
        qc_status: 'IN_PROGRESS',
        quality_status: 'NORMAL',
        updated_at: nowIso
      }).eq('id', payload.batch_id);
      if (dhtBatchErr) throw dhtBatchErr;

      emitOperationalNotification({
        title: '🔥 Oven DHT 24 Jam Dimulai',
        body: 'Batch ' + batchCodeDisplay + ' masuk ' + (payload.oven_no || 'Oven 1') + ' (' + Number(payload.target_temp || 50) + '°C).',
        category: 'qc',
        route: '#qc',
        urgent: false
      });
      return { success: true, message: 'Sesi oven DHT 24 jam berhasil dimulai.', dht_record: data };
    }

    case 'completeDHTSession': {
      const [, payload] = args;
      const qcCtx = await resolveQCLogContext(payload);
      const batchCodeDisplay = qcCtx.batch_code;

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
        body: 'Pengeringan DHT 24 jam untuk Batch ' + batchCodeDisplay + ' telah dituntaskan. Siap untuk Uji Semai Pasca-DHT.',
        category: 'qc',
        route: '#qc',
        urgent: false
      });
      return { success: true, message: 'Sesi oven DHT berhasil dituntaskan.' };
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
        const combined = Array.from(map.values()).map(item => {
          if (item && (item.qty === undefined || item.qty === null) && item.qty_change !== undefined) {
            item.qty = item.qty_change;
          }
          return item;
        });
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

    case 'updateStockBatchCode': {
      const [, batchId, newBatchCode] = args;
      if (!batchId || !newBatchCode) {
        throw new Error('ID batch dan nomor kode batch baru harus diisi.');
      }
      const trimmedCode = String(newBatchCode).trim().toUpperCase();
      const { error: updErr } = await supabase
        .from('stock_batches')
        .update({ batch_code: trimmedCode, updated_at: new Date().toISOString() })
        .eq('id', batchId);
      if (updErr) throw updErr;

      // Update referensi di purchase_items jika ada
      try {
        await supabase.from('purchase_items').update({ batch_no: trimmedCode }).eq('batch_id', batchId);
      } catch (e) {}

      // Update catatan di stock_mutations agar teks keterangan transaksi juga sinkron
      try {
        const { data: muts } = await supabase.from('stock_mutations').select('id, notes').eq('batch_id', batchId);
        if (Array.isArray(muts)) {
          for (const m of muts) {
            if (m.notes && m.notes.includes('(Batch:')) {
              const updatedNote = m.notes.replace(/\(Batch:[^)]+\)/gi, `(Batch: ${trimmedCode})`);
              await supabase.from('stock_mutations').update({ notes: updatedNote }).eq('id', m.id);
            }
          }
        }
      } catch (e) {}

      return { success: true, message: 'Kode batch berhasil diperbarui menjadi ' + trimmedCode };
    }

    case 'adjustStockBatch': {
      const [, payload] = args;
      let batchId = payload && payload.batch_id;
      const productId = payload && payload.product_id;
      const isNewBatch = (batchId === '__NEW_BATCH__' || (payload && payload.is_new_batch));
      const adjType = isNewBatch ? 'PLUS' : ((payload && payload.adjustment_type === 'PLUS') ? 'PLUS' : 'MINUS');
      const qtyNum = Math.abs(Number((payload && payload.qty) || 0));
      if (!productId || qtyNum <= 0 || (!batchId && !isNewBatch)) {
        throw new Error('Data varietas benih dan kuantitas koreksi tidak valid.');
      }

      // Jika inisiasi batch baru (Stok Awal)
      if (isNewBatch) {
        batchId = crypto.randomUUID();
        const dAdj = new Date();
        const yymmAdj = String(dAdj.getFullYear()).slice(-2) + String(dAdj.getMonth() + 1).padStart(2, '0');
        const batchCode = String(payload.batch_code || `BATCH-BENIH-${yymmAdj}-001`).trim();
        const hppCost = Number(payload.cost_per_unit || payload.buy_price || 0);
        const prodDate = payload.production_date || new Date().toISOString().split('T')[0];
        const expDate = payload.expiry_date || null;

        await supabase.from('stock_batches').insert({
          id: batchId,
          batch_code: batchCode,
          product_id: productId,
          qty_in: qtyNum,
          qty_remaining: qtyNum,
          buy_price: hppCost,
          cost_per_unit: hppCost,
          production_date: prodDate,
          expiry_date: expDate,
          quality_status: 'NORMAL',
          qc_status: 'APPROVED'
        });

        // Update total stok di tabel products
        try {
          const { data: allB } = await supabase.from('stock_batches').select('qty_remaining').eq('product_id', productId);
          if (allB && Array.isArray(allB)) {
            const totalRemaining = allB.reduce((sum, item) => sum + Number(item.qty_remaining || 0), 0);
            await supabase.from('products').update({
              stock: totalRemaining,
              updated_at: new Date().toISOString()
            }).eq('id', productId);
          }
        } catch (e) {}

        // Catat mutasi masuk
        const initMut = {
          id: crypto.randomUUID(),
          product_id: productId,
          batch_id: batchId,
          reference_no: 'INIT-' + Date.now().toString().slice(-6),
          mutation_type: 'MASUK_STOK_AWAL',
          qty: qtyNum,
          unit: payload.unit || 'pcs',
          notes: `[SALDO_AWAL] ${payload.notes || 'Inisiasi stok awal lot batch'} (Petugas: ${payload.user_name || 'Admin'})`,
          created_at: new Date().toISOString()
        };
        saveMutationToLocalBackup(initMut);
        try { await supabase.from('stock_mutations').insert(initMut); } catch (e) {}

        return {
          success: true,
          batch_id: batchId,
          batch_code: batchCode,
          new_stock: qtyNum,
          message: 'Stok awal lot batch baru berhasil diinisiasi.'
        };
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
      const refNo = await generateSequentialDocNo('ADJ', 'stock_mutations', 'reference_no');
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

    default:
      return window.__API_UNHANDLED;
  }
}
