// Modul Layanan API (Reports & System): Dashboard, Laporan, Tutup Buku, Pengaturan, Roles, Telegram & Web Push

async function handleReportsApi(fnName, args) {
  switch (fnName) {
    // --------------------------------------------------------------------------
    // J. DASHBOARD & STATISTIK REALTIME
    // --------------------------------------------------------------------------
    case 'getDashboardSummary': {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const iso7Days = sevenDaysAgo.toISOString();

      const [txTodayRes, prodsRes, batchesRes, receivablesRes, tx7DaysRes, settingsRes] = await Promise.all([
        supabase.from('transactions')
          .select('id, total, created_at')
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
          .neq('status', 'CANCELLED'),
        supabase.from('transactions')
          .select('total, created_at')
          .neq('status', 'VOID')
          .gte('created_at', iso7Days),
        supabase.from('settings')
          .select('key, value')
          .in('key', ['daily_target', 'target_omzet_harian'])
      ]);

      const todayTxList = txTodayRes.data || [];
      const todaySales = todayTxList.reduce((sum, t) => sum + Number(t.total || 0), 0);
      const todayTransactionCount = todayTxList.length;
      const allBatches = batchesRes.data || [];
      const allProds = prodsRes.data || [];

      // 1. Ambil Produk Terlaris Hari Ini secara REAL dari transaction_items
      let topProductsToday = [];
      const todayTxIds = todayTxList.map(t => t.id).filter(Boolean);
      if (todayTxIds.length > 0) {
        try {
          const { data: todayItems } = await supabase.from('transaction_items')
            .select('product_id, qty, subtotal, products(name)')
            .in('transaction_id', todayTxIds.slice(0, 100));

          if (Array.isArray(todayItems) && todayItems.length > 0) {
            const prodQtyMap = {};
            todayItems.forEach(item => {
              const pName = (item.products && item.products.name) || item.product_id || 'Produk';
              if (!prodQtyMap[pName]) {
                prodQtyMap[pName] = { name: pName, qty: 0 };
              }
              prodQtyMap[pName].qty += Number(item.qty || 0);
            });

            const sortedProds = Object.values(prodQtyMap).sort((a, b) => b.qty - a.qty);
            const maxQty = sortedProds[0] ? sortedProds[0].qty : 0;
            topProductsToday = sortedProds.slice(0, 5).map(p => ({
              name: p.name,
              qty: p.qty,
              percent: maxQty > 0 ? Math.round((p.qty / maxQty) * 100) : 0
            }));
          }
        } catch (errProd) {
          console.warn('Gagal memuat rincian produk terlaris hari ini:', errProd);
        }
      }

      // 2. Hitung Omzet Harian 7 Hari Terakhir untuk grafik Realtime Spline (Data Asli)
      const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const splineDays = [];
      const splineValues = [];
      const tx7Days = tx7DaysRes.data || [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const ymd = d.toISOString().split('T')[0];
        splineDays.push(dayLabels[d.getDay()]);

        const sumForDay = tx7Days
          .filter(t => t.created_at && t.created_at.startsWith(ymd))
          .reduce((acc, t) => acc + Number(t.total || 0), 0);
        splineValues.push(sumForDay);
      }

      // 3. Target Omzet Harian dari Settings
      let dailyTarget = 5000000;
      if (settingsRes && Array.isArray(settingsRes.data)) {
        const row = settingsRes.data.find(s => s.key === 'daily_target' || s.key === 'target_omzet_harian');
        if (row && row.value) {
          dailyTarget = Number(row.value) || 5000000;
        }
      }

      // 4. Hitung stok per produk untuk daftar stok menipis (<= 5)
      const stockPerProd = {};
      allBatches.forEach(b => {
        if (isBatchEligibleForSale(b)) {
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

      // 5. Daftar batch mendekati kedaluwarsa (<= 30 hari ke depan)
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
        dailyTarget: dailyTarget,
        topProducts: topProductsToday,
        splineValues: splineValues,
        splineDays: splineDays,
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

      const today = new Date();
      const items = (batchesRes.data || []).map(b => {
        const prod = prodMap[b.product_id] || {};
        const qty = Number(b.qty_remaining || 0);
        const buyPrice = Number(b.cost_per_unit || b.buy_price || 0);
        const assetVal = qty * buyPrice;
        const isBulk = prod.unit === 'gram' || prod.product_type === 'raw_seed';

        totalAssetValue += assetVal;
        uniqueVarieties.add(prod.name || b.product_id);

        if (isBulk) {
          totalBulkGrams += qty;
        } else {
          totalPackedPcs += qty;
        }

        let ageDays = 0;
        if (b.production_date || b.created_at) {
          const prodD = new Date(b.production_date || b.created_at);
          if (!isNaN(prodD.getTime())) {
            ageDays = Math.max(0, Math.floor((today - prodD) / (1000 * 60 * 60 * 24)));
          }
        }

        let status = 'AMAN';
        if (b.expiry_date) {
          const expD = new Date(b.expiry_date);
          if (!isNaN(expD.getTime())) {
            const daysLeft = Math.ceil((expD - today) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 0) {
              status = 'KEDALUWARSA';
            } else if (daysLeft <= 60) {
              status = 'UJI_ULANG';
            } else if (qty <= 5) {
              status = 'MENIPIS';
            }
          }
        } else if (qty <= 5) {
          status = 'MENIPIS';
        }

        const batchDisplay = b.batch_code || b.id || 'BATCH-UNKNOWN';

        return {
          id: b.id,
          batch_id: batchDisplay,
          batch_code: batchDisplay,
          product_id: b.product_id,
          product_name: prod.name || 'Produk',
          category: prod.category || 'Benih',
          type: isBulk ? 'bulk' : 'packed',
          product_type: prod.product_type || (isBulk ? 'raw_seed' : 'seed_packet'),
          unit: prod.unit || 'pcs',
          qty_remaining: qty,
          current_stock: qty,
          buy_price: buyPrice,
          hpp_unit: buyPrice,
          asset_value: assetVal,
          total_value: assetVal,
          production_date: b.production_date,
          expiry_date: b.expiry_date,
          age_days: ageDays,
          status: status,
          quality_status: b.quality_status || 'NORMAL',
          qc_status: b.qc_status || 'APPROVED'
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
    // K.2. CUT-OFF & TUTUP BUKU PERIODE AKUNTANSI
    // --------------------------------------------------------------------------
    case 'getAccountingPeriods': {
      try {
        const { data, error } = await supabase
          .from('accounting_periods')
          .select('*')
          .order('cut_off_date', { ascending: false });
        if (error) throw error;
        try { localStorage.setItem('kios_idep_accounting_periods_cache', JSON.stringify(data || [])); } catch (e) {}
        return data || [];
      } catch (err) {
        console.warn('getAccountingPeriods fallback to localStorage cache:', err);
        try {
          return JSON.parse(localStorage.getItem('kios_idep_accounting_periods_cache') || '[]');
        } catch (e) {
          return [];
        }
      }
    }

    case 'closeAccountingPeriod': {
      const [, payload] = args;
      const periodId = payload.id || crypto.randomUUID();
      const periodRecord = {
        id: periodId,
        period_name: String(payload.period_name || 'Tutup Buku Periode').trim(),
        start_date: payload.start_date || new Date().toISOString().slice(0, 10),
        cut_off_date: payload.cut_off_date || new Date().toISOString(),
        closed_at: new Date().toISOString(),
        closed_by: payload.closed_by || 'Admin Toko',
        status: 'CLOSED',
        total_revenue: Number(payload.total_revenue || 0),
        total_cogs: Number(payload.total_cogs || 0),
        gross_profit: Number(payload.gross_profit || 0),
        gross_margin_pct: Number(payload.gross_margin_pct || 0),
        total_inventory_valuation: Number(payload.total_inventory_valuation || 0),
        total_items_count: Number(payload.total_items_count || 0),
        summary: payload.summary || {},
        inventory_snapshot: Array.isArray(payload.inventory_snapshot) ? payload.inventory_snapshot : [],
        notes: String(payload.notes || '').trim(),
        created_at: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase
          .from('accounting_periods')
          .insert(periodRecord)
          .select()
          .single();
        if (error) throw error;

        let local = [];
        try { local = JSON.parse(localStorage.getItem('kios_idep_accounting_periods_cache') || '[]'); } catch (e) {}
        local = [data || periodRecord, ...local.filter(p => p.id !== periodId)];
        try { localStorage.setItem('kios_idep_accounting_periods_cache', JSON.stringify(local)); } catch (e) {}

        return { success: true, period: data || periodRecord };
      } catch (err) {
        console.warn('closeAccountingPeriod insert to Supabase failed, storing locally:', err);
        let local = [];
        try { local = JSON.parse(localStorage.getItem('kios_idep_accounting_periods_cache') || '[]'); } catch (e) {}
        local = [periodRecord, ...local.filter(p => p.id !== periodId)];
        try { localStorage.setItem('kios_idep_accounting_periods_cache', JSON.stringify(local)); } catch (e) {}

        return {
          success: true,
          period: periodRecord,
          isLocal: true,
          message: 'Tutup buku berhasil disimpan ke penyimpanan lokal. Silakan jalankan file supabase_accounting_periods_setup.sql di Supabase SQL Editor agar tersimpan di cloud.'
        };
      }
    }

    case 'reopenAccountingPeriod': {
      const [, periodId] = args;
      if (!periodId) throw new Error('ID Periode diperlukan.');
      try {
        await supabase.from('accounting_periods').delete().eq('id', periodId);
      } catch (err) {
        console.warn('Supabase delete accounting_periods failed:', err);
      }
      let local = [];
      try { local = JSON.parse(localStorage.getItem('kios_idep_accounting_periods_cache') || '[]'); } catch (e) {}
      local = local.filter(p => p.id !== periodId);
      try { localStorage.setItem('kios_idep_accounting_periods_cache', JSON.stringify(local)); } catch (e) {}
      return { success: true };
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


    case 'testTelegramConnection': {
      const { data } = await supabase.from('settings').select('key, value');
      const settingsMap = {};
      (data || []).forEach(s => { settingsMap[s.key] = s.value; });
      const token = (settingsMap['telegram_bot_token'] || '').trim();
      const chatId = (settingsMap['telegram_chat_id'] || '').trim();

      if (!token || !chatId) {
        throw new Error('Token bot atau Chat ID Telegram belum dikonfigurasi pada menu Pengaturan.');
      }

      const text = encodeURIComponent('🔔 *POS & Stok - Tes Notifikasi*\nKoneksi bot Telegram berhasil terhubung dan siap mengirimkan notifikasi operasional!');
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
        title: '🔔 Tes Notifikasi POS',
        body: 'Selamat! Handphone Anda sudah terhubung dan siap menerima notifikasi operasional toko secara langsung.',
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

    default:
      return window.__API_UNHANDLED;
  }
}
