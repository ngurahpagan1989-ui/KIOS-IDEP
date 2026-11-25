// Modul Layanan API (Sales & Mitra): POS, Faktur, Konsinyasi, CRM, Piutang, Biaya & Purna Jual

async function handleSalesApi(fnName, args) {
  switch (fnName) {
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
        if (isBatchEligibleForSale(b)) {
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
      const invoiceNo = payload.invoice_no || await generateSequentialDocNo('INV', 'transactions', 'invoice_no');

      // Hitung subtotal, tax, ongkir/biaya tambahan, dan total akhir
      let calcSubtotal = 0;
      for (const item of (payload.items || [])) {
        calcSubtotal += Number(item.qty || 0) * Number(item.price || 0);
      }
      const subtotal = payload.subtotal !== undefined ? Number(payload.subtotal) : calcSubtotal;
      const taxRate = Number(payload.taxRate || 0);
      const tax = payload.tax !== undefined ? Number(payload.tax) : Math.round(subtotal * taxRate);
      const feeRec = buildTransactionFeeRecord(payload, subtotal, tax);
      const total = feeRec.total;

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
        const parsedIso = parseLocalTransactionCreatedAt(payload.transaction_date);
        if (parsedIso) {
          txInsertData.created_at = parsedIso;
        }
      }

      const { data: txRecord, error: txErr } = await persistTransactionWithFallback('insert', txInsertData, feeRec.extraColumns);
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
        shipping_cost: feeRec.shippingCost,
        fee_note: feeRec.feeNote,
        qris_fee: feeRec.qrisFee,
        cash_received: feeRec.cashReceived,
        change_amount: feeRec.changeAmount,
        total: total,
        date: txRecord?.created_at || txInsertData.created_at || new Date().toISOString(),
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
    // G. KONSINYASI CABANG (OUTLETS, AUDITS, TRANSFERS)
    // --------------------------------------------------------------------------
    case 'getOutlets': {
      const [outletsRes, stocksRes, auditsRes, transfersRes] = await Promise.all([
        supabase.from('outlets').select('*').order('name', { ascending: true }),
        supabase.from('outlet_stocks').select('outlet_id, product_id, qty_current, updated_at').order('updated_at', { ascending: false }),
        supabase.from('consignment_audits').select('outlet_id, audit_date, created_at').order('audit_date', { ascending: false }),
        supabase.from('consignment_transfers').select('outlet_id, total_pcs')
      ]);
      if (outletsRes.error) throw outletsRes.error;
      if (stocksRes.error) console.warn('[getOutlets] Peringatan query outlet_stocks:', stocksRes.error);

      const stockSumMap = {};
      const hasStockRowOutlet = new Set();
      const seenOutletProd = new Set();
      (stocksRes.data || []).forEach(s => {
        if (!s || !s.outlet_id) return;
        hasStockRowOutlet.add(s.outlet_id);
        const key = `${s.outlet_id}__${s.product_id || ''}`;
        if (s.product_id && seenOutletProd.has(key)) return;
        if (s.product_id) seenOutletProd.add(key);
        const qty = Number(s.qty_current || 0);
        if (qty > 0) {
          stockSumMap[s.outlet_id] = (stockSumMap[s.outlet_id] || 0) + qty;
        }
      });

      const transferSumMap = {};
      (transfersRes.data || []).forEach(tr => {
        if (!tr || !tr.outlet_id) return;
        transferSumMap[tr.outlet_id] = (transferSumMap[tr.outlet_id] || 0) + Number(tr.total_pcs || 0);
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
        const fallbackPcs = (!hasStockRowOutlet.has(o.id) && !lastAuditMap[o.id]) ? (transferSumMap[o.id] || 0) : 0;
        return {
          ...o,
          status: isInactive ? 'inactive' : 'active',
          total_stock_pcs: stockSumMap[o.id] || fallbackPcs,
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
      const [, statusFilter] = args;
      let query = supabase
        .from('consignment_transfers')
        .select('*, outlets(name, pic_name, phone)')
        .order('sent_at', { ascending: false });

      if (statusFilter === 'IN_TRANSIT') {
        query = query.neq('delivery_status', 'DELIVERED');
      } else if (statusFilter === 'DELIVERED') {
        query = query.eq('delivery_status', 'DELIVERED');
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        outlet_name: (t.outlets && t.outlets.name) || t.outlet_name || 'Outlet Mitra',
        pic_name: (t.outlets && t.outlets.pic_name) || t.actual_recipient_name || '-'
      }));
    }

    case 'transferStockToOutlet': {
      const [, payload] = args;
      const transferId = crypto.randomUUID();
      const invoiceNo = await generateSequentialDocNo('SJ', 'consignment_transfers', 'invoice_no');
      const items = payload.items || [];
      const prodIds = [...new Set(items.map(it => it.product_id).filter(Boolean))];

      // Ambil info outlet & tingkat harga (price_tiers) agar harga satuan surat jalan tercatat akurat
      const [outletRes, tiersRes] = await Promise.all([
        supabase.from('outlets').select('id, name, price_tier').eq('id', payload.outlet_id).maybeSingle(),
        prodIds.length > 0
          ? supabase.from('price_tiers').select('product_id, tier_name, price').in('product_id', prodIds)
          : Promise.resolve({ data: [] })
      ]);

      const outletRow = outletRes.data || {};
      const outletTierName = String(outletRow.price_tier || 'Outlet').trim().toLowerCase();
      const tiersByProd = {};
      (tiersRes.data || []).forEach(t => {
        if (!t || !t.product_id) return;
        if (!tiersByProd[t.product_id]) tiersByProd[t.product_id] = [];
        tiersByProd[t.product_id].push(t);
      });

      // 1. Simpan Header Transfer
      const { error: trfErr } = await supabase.from('consignment_transfers').insert({
        id: transferId,
        outlet_id: payload.outlet_id,
        outlet_name: outletRow.name || '',
        invoice_no: invoiceNo,
        total_pcs: items.reduce((sum, it) => sum + Number(it.qty || 0), 0),
        notes: payload.notes || '',
        delivery_status: 'PENDING'
      });
      if (trfErr) throw trfErr;

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

        let unitPrice = Number(it.unit_price || 0);
        if (unitPrice <= 0) {
          const pTiers = tiersByProd[it.product_id] || [];
          const exactTier = pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === outletTierName)
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'outlet')
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'reguler')
            || pTiers[0];
          unitPrice = exactTier ? Number(exactTier.price || 0) : 0;
        }

        const { error: itemErr } = await supabase.from('consignment_transfer_items').insert({
          transfer_id: transferId,
          product_id: it.product_id,
          qty: Number(it.qty),
          unit_price: unitPrice
        });
        if (itemErr) throw itemErr;

        // Update saldo rak cabang (hindari duplikasi baris karena outlet_stocks memakai PK id)
        const { data: existRows } = await supabase
          .from('outlet_stocks')
          .select('id, qty_current')
          .eq('outlet_id', payload.outlet_id)
          .eq('product_id', it.product_id)
          .order('updated_at', { ascending: false });

        if (existRows && existRows.length > 0) {
          const currentQty = Number(existRows[0].qty_current || 0);
          await supabase
            .from('outlet_stocks')
            .update({
              qty_current: currentQty + Number(it.qty),
              updated_at: new Date().toISOString()
            })
            .eq('id', existRows[0].id);

          if (existRows.length > 1) {
            const dupIds = existRows.slice(1).map(r => r.id).filter(Boolean);
            if (dupIds.length > 0) {
              await supabase.from('outlet_stocks').delete().in('id', dupIds);
            }
          }
        } else {
          await supabase.from('outlet_stocks').insert({
            outlet_id: payload.outlet_id,
            product_id: it.product_id,
            qty_current: Number(it.qty),
            updated_at: new Date().toISOString()
          });
        }
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

      let sigInternalUrl = '';
      const rawSigInternal = payload.sig_internal_base64 || payload.sig_idep_base64;
      if (rawSigInternal && rawSigInternal.startsWith('data:image')) {
        sigInternalUrl = await uploadToSupabaseStorage('signatures', `sig_auditor_${auditId}.png`, rawSigInternal, 'image/png');
      }

      let sigOutletUrl = '';
      if (payload.sig_outlet_base64 && payload.sig_outlet_base64.startsWith('data:image')) {
        sigOutletUrl = await uploadToSupabaseStorage('signatures', `sig_outlet_${auditId}.png`, payload.sig_outlet_base64, 'image/png');
      }

      const itemsList = payload.items || [];
      const totalSold = itemsList.reduce((sum, it) => sum + Number(it.qty_sold || 0), 0);
      const totalReturned = itemsList.reduce((sum, it) => sum + Number(it.qty_returned || 0), 0);
      const totalMissing = itemsList.reduce((sum, it) => sum + Number(it.qty_missing || 0), 0);
      const totalChargeable = itemsList.reduce((sum, it) => sum + ((it.missing_chargeable === true || String(it.missing_chargeable) === 'true') ? Number(it.qty_missing || 0) : 0), 0);
      const totalWriteoff = Math.max(0, totalMissing - totalChargeable);
      const totalRestock = itemsList.reduce((sum, it) => sum + Number(it.qty_restock || 0), 0);

      const auditDateStr = payload.audit_date || new Date().toISOString().split('T')[0];
      const auditInsertData = {
        id: auditId,
        outlet_id: outletId,
        store_name: payload.store_name || '',
        audit_date: auditDateStr,
        auditor_name: payload.auditor_name || 'Petugas Pemeriksa',
        outlet_pic: payload.outlet_pic || '',
        outlet_phone: payload.outlet_phone || '',
        total_sold: totalSold,
        total_returned: totalReturned,
        total_missing: totalMissing,
        total_chargeable_missing: totalChargeable,
        total_writeoff_missing: totalWriteoff,
        total_restock: totalRestock,
        display_photo_url: displayPhotoUrl,
        sig_outlet_url: sigOutletUrl,
        notes: payload.notes || ''
      };
      if (sigInternalUrl) {
        auditInsertData.sig_idep_url = sigInternalUrl;
      }

      const { error: auditErr } = await supabase.from('consignment_audits').insert(auditInsertData);
      if (auditErr) throw auditErr;

      for (const it of itemsList) {
        const { error: aItemErr } = await supabase.from('consignment_audit_items').insert({
          audit_id: auditId,
          product_id: it.product_id,
          qty_system: Number(it.qty_system || 0),
          qty_actual: Number(it.qty_actual || 0),
          qty_sold: Number(it.qty_sold || 0),
          qty_returned: Number(it.qty_returned || 0),
          qty_missing: Number(it.qty_missing || 0),
          missing_chargeable: (it.missing_chargeable === true || String(it.missing_chargeable) === 'true'),
          qty_restock: Number(it.qty_restock || 0)
        });
        if (aItemErr) throw aItemErr;

        // Jika ada restock baru di tempat saat opname, potong stok gudang pusat secara FIFO
        const restockQty = Number(it.qty_restock || 0);
        if (restockQty > 0) {
          const movRef = await generateSequentialDocNo('MOV', 'stock_mutations', 'reference_no');
          await consumeStockFIFOClient(
            it.product_id,
            restockQty,
            auditId,
            movRef,
            'KELUAR_KONSINYASI',
            it.batch_id || null
          );
        }

        // Update saldo rak cabang berdasarkan ID baris agar tidak membuat duplikat
        const newStock = Number(it.qty_actual || 0) + restockQty;
        const { data: existRows } = await supabase
          .from('outlet_stocks')
          .select('id')
          .eq('outlet_id', outletId)
          .eq('product_id', it.product_id)
          .order('updated_at', { ascending: false });

        if (existRows && existRows.length > 0) {
          await supabase
            .from('outlet_stocks')
            .update({
              qty_current: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', existRows[0].id);

          if (existRows.length > 1) {
            const dupIds = existRows.slice(1).map(r => r.id).filter(Boolean);
            if (dupIds.length > 0) {
              await supabase.from('outlet_stocks').delete().in('id', dupIds);
            }
          }
        } else {
          await supabase.from('outlet_stocks').insert({
            outlet_id: outletId,
            product_id: it.product_id,
            qty_current: newStock,
            updated_at: new Date().toISOString()
          });
        }
      }

      emitOperationalNotification({
        title: '🏪 Opname Konsinyasi Selesai',
        body: 'Audit rak mitra selesai dicatat (' + totalSold + ' pcs terjual' + (payload.outlet_pic ? ', PIC: ' + payload.outlet_pic : '') + ').',
        category: 'finance',
        route: '#konsinyasi',
        urgent: false
      });

      return {
        success: true,
        id: auditId,
        audit_id: auditId,
        audit_date: auditDateStr,
        outlet_name: payload.store_name || '',
        outlet_pic: payload.outlet_pic || '',
        outlet_phone: payload.outlet_phone || '',
        total_sold: totalSold,
        total_returned: totalReturned,
        total_missing: totalMissing,
        total_chargeable_missing: totalChargeable,
        total_writeoff_missing: totalWriteoff,
        total_restock: totalRestock,
        message: 'Berita acara opname konsinyasi berhasil disimpan.'
      };
    }

    case 'createConsignmentInvoice': {
      const [, payload] = args;
      const auditId = payload.audit_id;
      const outletId = payload.outlet_id;

      if (!auditId) throw new Error('ID Audit Opname wajib disertakan.');

      // 1. Ambil data audit & outlet
      const [auditRes, auditItemsRes, outletRes] = await Promise.all([
        supabase.from('consignment_audits').select('*').eq('id', auditId).maybeSingle(),
        supabase.from('consignment_audit_items').select('*').eq('audit_id', auditId),
        outletId ? supabase.from('outlets').select('*').eq('id', outletId).maybeSingle() : Promise.resolve({ data: null })
      ]);

      const auditData = auditRes.data || {};
      const targetOutletId = outletId || auditData.outlet_id;
      let outlet = outletRes.data;
      if (!outlet && targetOutletId) {
        const { data: oData } = await supabase.from('outlets').select('*').eq('id', targetOutletId).maybeSingle();
        outlet = oData;
      }
      outlet = outlet || {};

      const auditItems = auditItemsRes.data || [];
      // Filter item tertagih: qty_sold > 0 atau (qty_missing > 0 dan missing_chargeable)
      const billableItems = auditItems.filter(it => {
        const sold = Number(it.qty_sold || 0);
        const missing = Number(it.qty_missing || 0);
        const isChargeable = (it.missing_chargeable === true || String(it.missing_chargeable) === 'true');
        return sold > 0 || (missing > 0 && isChargeable);
      });

      if (billableItems.length === 0) {
        throw new Error('Tidak ada kuantiti terjual atau barang hilang tertagih pada Berita Acara ini.');
      }

      // 2. Ambil referensi produk, price_tiers & HPP batch untuk outlet ini
      const prodIds = [...new Set(billableItems.map(it => it.product_id).filter(Boolean))];
      const outletTierName = String(outlet.price_tier || 'Outlet').trim().toLowerCase();

      const [prodsRes, tiersRes, batchesRes] = await Promise.all([
        supabase.from('products').select('id, name, unit, sku').in('id', prodIds),
        supabase.from('price_tiers').select('product_id, tier_name, price').in('product_id', prodIds),
        supabase.from('stock_batches').select('product_id, buy_price, cost_per_unit').in('product_id', prodIds).order('created_at', { ascending: false })
      ]);

      const prodsMap = {};
      (prodsRes.data || []).forEach(p => { if (p && p.id) prodsMap[p.id] = p; });

      const tiersByProd = {};
      (tiersRes.data || []).forEach(t => {
        if (!t || !t.product_id) return;
        if (!tiersByProd[t.product_id]) tiersByProd[t.product_id] = [];
        tiersByProd[t.product_id].push(t);
      });

      const costByProd = {};
      (batchesRes.data || []).forEach(b => {
        if (!b || !b.product_id || costByProd[b.product_id] !== undefined) return;
        const c = Number(b.cost_per_unit || b.buy_price || 0);
        if (c > 0) costByProd[b.product_id] = c;
      });

      // 3. Susun item transaksi faktur
      const txId = crypto.randomUUID();
      const invoiceNo = await generateSequentialDocNo('FKT-KSN', 'transactions', 'invoice_no');
      let totalAmount = 0;
      const txItems = [];

      for (const it of billableItems) {
        const pTiers = tiersByProd[it.product_id] || [];
        const exactTier = pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === outletTierName)
          || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'outlet')
          || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'reguler')
          || pTiers[0];

        const unitPrice = exactTier ? Number(exactTier.price || 0) : 0;
        const unitCost = Number(costByProd[it.product_id] || 0);
        const soldQty = Number(it.qty_sold || 0);
        const missingQty = (it.missing_chargeable === true || String(it.missing_chargeable) === 'true') ? Number(it.qty_missing || 0) : 0;
        const totalQty = soldQty + missingQty;
        const lineTotal = totalQty * unitPrice;
        totalAmount += lineTotal;

        txItems.push({
          transaction_id: txId,
          product_id: it.product_id,
          batch_id: it.batch_id || null,
          qty: totalQty,
          price: unitPrice,
          cost: unitCost,
          subtotal: lineTotal
        });
      }

      // 4. Catat ke tabel transactions (hanya kolom yang ada di skema tabel transactions)
      const txStatus = payload.payment_type === 'installment' ? 'tempo' : 'paid';
      const txInsertData = {
        id: txId,
        invoice_no: invoiceNo,
        customer_name: outlet.name || auditData.store_name || 'Outlet Konsinyasi',
        source: 'KONSINYASI',
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        payment_method: payload.payment_type === 'installment' ? 'TEMPO' : 'TRANSFER',
        payment_type: payload.payment_type || 'full',
        status: txStatus
      };

      const { error: txErr } = await supabase.from('transactions').insert(txInsertData);
      if (txErr) throw txErr;

      // 5. Catat transaction_items
      if (txItems.length > 0) {
        const { error: itemsErr } = await supabase.from('transaction_items').insert(txItems);
        if (itemsErr) console.warn('[Konsinyasi] Warning insert transaction_items:', itemsErr);
      }

      // 6. Jika tempo / kredit, catat ke tabel receivables (piutang)
      if (payload.payment_type === 'installment') {
        const { error: recErr } = await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          transaction_id: txId,
          customer_id: null,
          customer_name: outlet.name || auditData.store_name || 'Outlet Konsinyasi',
          total: totalAmount,
          paid: 0,
          remaining: totalAmount,
          due_date: payload.due_date || null,
          status: 'active',
          notes: `Faktur Konsinyasi #${invoiceNo} (Opname #${auditId})`
        });
        if (recErr) console.warn('[Konsinyasi] Warning insert receivables:', recErr);
      }

      // 7. Update nomor invoice di consignment_audits
      await supabase.from('consignment_audits').update({
        invoice_id: invoiceNo
      }).eq('id', auditId);

      emitOperationalNotification({
        title: '🧾 Faktur Konsinyasi Baru ' + invoiceNo,
        body: (outlet.name || 'Toko Mitra') + ' • Rp ' + Number(totalAmount).toLocaleString('id-ID') + ' (' + (payload.payment_type === 'installment' ? 'Tempo' : 'Lunas') + ')',
        category: 'finance',
        route: '#faktur',
        urgent: false
      });

      return {
        success: true,
        invoice_no: invoiceNo,
        transaction_id: txId,
        total: totalAmount,
        message: 'Faktur konsinyasi #' + invoiceNo + ' (Rp ' + Number(totalAmount).toLocaleString('id-ID') + ') berhasil diterbitkan!'
      };
    }

    case 'confirmDeliveryReceipt': {
      const [, payload] = args;
      let signatureUrl = '';
      if (payload.signatureBase64 && payload.signatureBase64.startsWith('data:image')) {
        const sigFileName = `sig_transfer_${payload.deliveryId}.png`;
        try {
          signatureUrl = await uploadToSupabaseStorage('signatures', sigFileName, payload.signatureBase64, 'image/png', true);
        } catch (e) {
          console.warn('Fallback tanda tangan serah terima ke base64:', e);
          signatureUrl = payload.signatureBase64;
        }
      }

      const { data, error } = await supabase
        .from('consignment_transfers')
        .update({
          delivery_status: 'DELIVERED',
          actual_recipient_name: payload.actualRecipientName,
          recipient_role: payload.recipientRole || 'Staf Outlet',
          recipient_signature: signatureUrl,
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
      let data = [];
      const res = await supabase
        .from('receivables')
        .select('*, customers(name, phone), transactions(invoice_no, created_at)')
        .order('created_at', { ascending: false });
      if (res.error) {
        console.warn('getReceivables join failed, retrying simple select:', res.error);
        const res2 = await supabase
          .from('receivables')
          .select('*')
          .order('created_at', { ascending: false });
        if (res2.error) throw res2.error;
        data = res2.data || [];
      } else {
        data = res.data || [];
      }
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

      let sig = tx.finance_signature || null;
      let signer = tx.finance_signer_name || null;
      let signedAt = tx.finance_signed_at || null;
      if (!sig && settingsObj[`inv_sig_${tx.id}`]) {
        try {
          const parsed = JSON.parse(settingsObj[`inv_sig_${tx.id}`]);
          sig = parsed.signature || null;
          signer = parsed.signer_name || null;
          signedAt = parsed.signed_at || null;
        } catch (e) {}
      }
      if (!sig && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('inv_sig_' + (tx.id || tx.invoice_no));
          if (raw) {
            const parsed = JSON.parse(raw);
            sig = parsed.signature || null;
            signer = parsed.signer_name || null;
            signedAt = parsed.signed_at || null;
          }
        } catch (e) {}
      }

      const enrichedTx = {
        ...tx,
        status: normStatus,
        total_cost: totalCost,
        gross_profit: totalGrossProfit,
        finance_signature: sig,
        finance_signer_name: signer,
        finance_signed_at: signedAt
      };

      return {
        transaction: enrichedTx,
        items: mappedItems,
        customer: custData,
        receivable: recRes ? recRes.data : null,
        settings: settingsObj
      };
    }

    case 'signInvoice': {
      const [, transactionId, signPayload] = args;
      if (!transactionId) throw new Error('Transaction ID wajib diisi untuk pengesahan faktur.');
      const sig = signPayload && signPayload.signature;
      const signerName = (signPayload && signPayload.signer_name) || 'Bagian Keuangan';
      const signedAt = (signPayload && signPayload.signed_at) || new Date().toISOString();

      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            finance_signature: sig,
            finance_signer_name: signerName,
            finance_signed_at: signedAt
          })
          .or(`id.eq.${transactionId},invoice_no.eq.${transactionId}`);
        if (error) {
          console.warn('[signInvoice] Update transactions warning (kolom database mungkin perlu migrasi):', error);
          try {
            await supabase.from('settings').upsert({
              key: `inv_sig_${transactionId}`,
              value: JSON.stringify({ signature: sig, signer_name: signerName, signed_at: signedAt }),
              updated_at: new Date().toISOString()
            });
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[signInvoice] Catatan update transaksi:', err);
      }

      return {
        success: true,
        transaction_id: transactionId,
        finance_signature: sig,
        finance_signer_name: signerName,
        finance_signed_at: signedAt,
        message: 'Faktur berhasil ditandatangani dan disahkan oleh Bagian Keuangan.'
      };
    }

    case 'getRecentTransactionsForInvoice': {
      const [, startDate, endDate] = args;
      const baseFields = 'id, invoice_no, customer_name, total, subtotal, tax, payment_method, payment_type, status, created_at, transaction_items(*, products(name, unit))';
      const extendedFields = 'id, invoice_no, customer_name, total, subtotal, tax, payment_method, payment_type, status, created_at, finance_signature, finance_signer_name, finance_signed_at, transaction_items(*, products(name, unit))';

      let data = null;
      try {
        let query = supabase
          .from('transactions')
          .select(extendedFields)
          .order('created_at', { ascending: false })
          .limit(50);

        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`);

        const res = await query;
        if (res.error) {
          const errMsg = String(res.error.message || '').toLowerCase();
          if (res.error.code === '42703' || errMsg.includes('finance_signature') || errMsg.includes('does not exist')) {
            console.warn('[getRecentTransactionsForInvoice] Kolom finance_signature belum ada di Supabase, beralih ke fallback kolom standar.');
            let fallbackQuery = supabase
              .from('transactions')
              .select(baseFields)
              .order('created_at', { ascending: false })
              .limit(50);
            if (startDate) fallbackQuery = fallbackQuery.gte('created_at', `${startDate}T00:00:00Z`);
            if (endDate) fallbackQuery = fallbackQuery.lte('created_at', `${endDate}T23:59:59Z`);
            const fallbackRes = await fallbackQuery;
            if (fallbackRes.error) throw fallbackRes.error;
            data = fallbackRes.data;
          } else {
            throw res.error;
          }
        } else {
          data = res.data;
        }
      } catch (err) {
        const errMsg = String(err.message || '').toLowerCase();
        if (err.code === '42703' || errMsg.includes('finance_signature') || errMsg.includes('does not exist')) {
          console.warn('[getRecentTransactionsForInvoice] Catch fallback kolom standar.');
          let fallbackQuery = supabase
            .from('transactions')
            .select(baseFields)
            .order('created_at', { ascending: false })
            .limit(50);
          if (startDate) fallbackQuery = fallbackQuery.gte('created_at', `${startDate}T00:00:00Z`);
          if (endDate) fallbackQuery = fallbackQuery.lte('created_at', `${endDate}T23:59:59Z`);
          const fallbackRes = await fallbackQuery;
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
        } else {
          throw err;
        }
      }

      return (data || []).map(t => {
        let normStatus = String(t.status || '').toLowerCase();
        if (normStatus === 'completed') normStatus = 'paid';

        let sig = t.finance_signature || null;
        let signer = t.finance_signer_name || null;
        let signedAt = t.finance_signed_at || null;
        if (!sig && typeof localStorage !== 'undefined') {
          try {
            const raw = localStorage.getItem('inv_sig_' + (t.id || t.invoice_no));
            if (raw) {
              const parsed = JSON.parse(raw);
              sig = parsed.signature || null;
              signer = parsed.signer_name || null;
              signedAt = parsed.signed_at || null;
            }
          } catch (e) {}
        }

        return {
          ...t,
          status: normStatus,
          finance_signature: sig,
          finance_signer_name: signer,
          finance_signed_at: signedAt,
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
      let data = null;
      let error = null;
      if (payload.id) {
        const resUpd = await supabase.from('outlets').update(outletObj).eq('id', payload.id).select().single();
        data = resUpd.data;
        error = resUpd.error;
      } else {
        outletObj.id = crypto.randomUUID();
        const resIns = await supabase.from('outlets').insert(outletObj).select().single();
        data = resIns.data;
        error = resIns.error;
      }
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
      const [outletRes, stocksRes, transfersRes, auditsRes, tiersRes, prodsRes] = await Promise.all([
        supabase.from('outlets').select('*').eq('id', outletId).single(),
        supabase.from('outlet_stocks').select('*').eq('outlet_id', outletId).order('updated_at', { ascending: false }),
        supabase.from('consignment_transfers').select('*').eq('outlet_id', outletId).order('sent_at', { ascending: false }).limit(50),
        supabase.from('consignment_audits').select('*').eq('outlet_id', outletId).order('audit_date', { ascending: false }).limit(50),
        supabase.from('price_tiers').select('product_id, tier_name, price'),
        supabase.from('products').select('id, name, unit, sku')
      ]);
      if (outletRes.error) throw outletRes.error;
      if (stocksRes.error) console.warn('[getOutletDetail] Peringatan query outlet_stocks:', stocksRes.error);

      const prodMap = {};
      (prodsRes.data || []).forEach(p => {
        if (p && p.id) prodMap[p.id] = p;
      });

      const outletRow = outletRes.data || {};
      const outletTierName = String(outletRow.price_tier || 'Outlet').trim().toLowerCase();
      const tiersByProd = {};
      (tiersRes.data || []).forEach(t => {
        if (!t || !t.product_id) return;
        if (!tiersByProd[t.product_id]) tiersByProd[t.product_id] = [];
        tiersByProd[t.product_id].push(t);
      });

      const auditsList = auditsRes.data || [];
      const auditIds = auditsList.map(a => a.id).filter(Boolean);
      const auditItemsByAuditId = {};
      if (auditIds.length > 0) {
        try {
          const { data: aItems } = await supabase
            .from('consignment_audit_items')
            .select('*')
            .in('audit_id', auditIds);
          (aItems || []).forEach(it => {
            if (!it || !it.audit_id) return;
            if (!auditItemsByAuditId[it.audit_id]) auditItemsByAuditId[it.audit_id] = [];
            auditItemsByAuditId[it.audit_id].push(it);
          });
        } catch (e) {
          console.warn('[getOutletDetail] Gagal memuat consignment_audit_items:', e);
        }
      }

      const transfersList = transfersRes.data || [];
      const transferIds = transfersList.map(tr => tr.id).filter(Boolean);
      let transferItemsAll = [];
      const lastTransferPriceByProd = {};
      if (transferIds.length > 0) {
        try {
          const { data: tItems } = await supabase
            .from('consignment_transfer_items')
            .select('*')
            .in('transfer_id', transferIds);
          transferItemsAll = tItems || [];
          transferItemsAll.forEach(ti => {
            if (ti && ti.product_id && Number(ti.unit_price || 0) > 0 && !lastTransferPriceByProd[ti.product_id]) {
              lastTransferPriceByProd[ti.product_id] = Number(ti.unit_price);
            }
          });
        } catch (e) {
          console.warn('[getOutletDetail] Gagal memuat consignment_transfer_items:', e);
        }
      }

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

      // Agregasikan akumulasi totals untuk tiap rekaman audit agar rincian opname & tombol faktur selalu akurat
      const enrichedAudits = auditsList.map(a => {
        const items = auditItemsByAuditId[a.id] || a.consignment_audit_items || [];
        const calcSold = items.reduce((s, it) => s + Number(it.qty_sold || 0), 0);
        const calcReturned = items.reduce((s, it) => s + Number(it.qty_returned || 0), 0);
        const calcMissing = items.reduce((s, it) => s + Number(it.qty_missing || 0), 0);
        const calcChargeable = items.reduce((s, it) => s + ((it.missing_chargeable === true || String(it.missing_chargeable) === 'true') ? Number(it.qty_missing || 0) : 0), 0);
        const calcWriteoff = Math.max(0, calcMissing - calcChargeable);
        const calcRestock = items.reduce((s, it) => s + Number(it.qty_restock || 0), 0);
        return {
          ...a,
          consignment_audit_items: items,
          total_sold: items.length > 0 ? calcSold : Number(a.total_sold || 0),
          total_returned: items.length > 0 ? calcReturned : Number(a.total_returned || 0),
          total_missing: items.length > 0 ? calcMissing : Number(a.total_missing || 0),
          total_chargeable_missing: items.length > 0 ? calcChargeable : Number(a.total_chargeable_missing || 0),
          total_writeoff_missing: items.length > 0 ? calcWriteoff : Number(a.total_writeoff_missing || 0),
          total_restock: items.length > 0 ? calcRestock : Number(a.total_restock || 0)
        };
      });

      // Deduplikasi outlet_stocks per product_id
      const uniqueStocks = [];
      const seenProdIds = new Set();
      (stocksRes.data || []).forEach(s => {
        if (!s || !s.product_id) return;
        if (seenProdIds.has(s.product_id)) return;
        seenProdIds.add(s.product_id);
        if (Number(s.qty_current || 0) > 0) {
          uniqueStocks.push(s);
        }
      });

      // Self-healing fallback: jika outlet_stocks kosong padahal ada riwayat transfer
      if (uniqueStocks.length === 0 && seenProdIds.size === 0 && transferItemsAll.length > 0) {
        const netByProd = {};
        transferItemsAll.forEach(ti => {
          if (!ti || !ti.product_id) return;
          netByProd[ti.product_id] = (netByProd[ti.product_id] || 0) + Number(ti.qty || 0);
        });
        enrichedAudits.forEach(a => {
          (a.consignment_audit_items || []).forEach(ai => {
            if (!ai || !ai.product_id) return;
            const delta = Number(ai.qty_restock || 0) - (Number(ai.qty_sold || 0) + Number(ai.qty_returned || 0) + Number(ai.qty_missing || 0));
            netByProd[ai.product_id] = (netByProd[ai.product_id] || 0) + delta;
          });
        });
        Object.keys(netByProd).forEach(pid => {
          if (netByProd[pid] > 0) {
            uniqueStocks.push({
              id: `reconstructed-${outletId}-${pid}`,
              outlet_id: outletId,
              product_id: pid,
              qty_current: netByProd[pid]
            });
          }
        });
      }

      // Lookup kode batch asal dari stock_mutations berdasarkan riwayat transfer outlet ini
      const batchByProdId = {};
      if (uniqueStocks.length > 0 && transfersList.length > 0) {
        try {
          const refNos = [];
          transfersList.forEach(tr => {
            if (tr.id) refNos.push(tr.id);
            if (tr.invoice_no) refNos.push(tr.invoice_no);
          });
          if (refNos.length > 0) {
            const { data: muts } = await supabase
              .from('stock_mutations')
              .select('product_id, batch_id')
              .in('reference_no', refNos);
            if (muts && muts.length > 0) {
              const bIds = [...new Set(muts.map(m => m.batch_id).filter(Boolean))];
              const { data: bRows } = bIds.length > 0
                ? await supabase.from('stock_batches').select('id, batch_code').in('id', bIds)
                : { data: [] };
              const bCodeMap = {};
              (bRows || []).forEach(b => { if (b && b.id) bCodeMap[b.id] = b.batch_code || b.id; });
              muts.forEach(m => {
                const code = bCodeMap[m.batch_id] || m.batch_id;
                if (code && !batchByProdId[m.product_id]) {
                  batchByProdId[m.product_id] = code;
                }
              });
            }
          }
        } catch (e) {
          console.warn('[getOutletDetail] Gagal lookup batch asal:', e);
        }
      }

      return {
        outlet: normalizedOutlet,
        stocks: uniqueStocks.map(s => {
          const prod = prodMap[s.product_id] || s.products || {};
          const pTiers = tiersByProd[s.product_id] || [];
          const exactTier = pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === outletTierName)
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'outlet')
            || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'reguler')
            || pTiers[0];
          const unitPrice = (exactTier && Number(exactTier.price || 0) > 0)
            ? Number(exactTier.price)
            : (lastTransferPriceByProd[s.product_id] || 0);
          const qtyCur = Number(s.qty_current || 0);
          return {
            ...s,
            product_name: prod.name || 'Produk',
            unit: prod.unit || 'pcs',
            sku: prod.sku || '',
            batch_id: s.batch_id || batchByProdId[s.product_id] || '',
            tier_price: unitPrice,
            subtotal: qtyCur * unitPrice
          };
        }),
        transfers: transfersList,
        audits: enrichedAudits
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

      if (transfer) {
        transfer.recipient_signature = transfer.recipient_signature_url || transfer.recipient_signature || '';
      }

      // 2. Ambil data item transfer secara mandiri (hindari error 'relationship in schema cache')
      const { data: rawItems, error: iErr } = await supabase
        .from('consignment_transfer_items')
        .select('*')
        .eq('transfer_id', targetId);
      if (iErr) throw iErr;

      const items = rawItems || [];

      // 3. Ambil data produk & price_tiers terkait secara independen
      const productIds = [...new Set(items.map(it => it.product_id).filter(Boolean))];
      let productsMap = {};
      const tiersByProd = {};
      const outletObj = (transfer && transfer.outlets) ? transfer.outlets : {};
      const outletTierName = String(outletObj.price_tier || 'Outlet').trim().toLowerCase();

      if (productIds.length > 0) {
        try {
          const [prodsRes, tiersRes] = await Promise.all([
            supabase.from('products').select('id, name, unit, sku').in('id', productIds),
            supabase.from('price_tiers').select('product_id, tier_name, price').in('product_id', productIds)
          ]);
          (prodsRes.data || []).forEach(p => {
            if (p && p.id) productsMap[p.id] = p;
          });
          (tiersRes.data || []).forEach(t => {
            if (!t || !t.product_id) return;
            if (!tiersByProd[t.product_id]) tiersByProd[t.product_id] = [];
            tiersByProd[t.product_id].push(t);
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
        outlet: outletObj,
        items: items.map(it => {
          const prod = productsMap[it.product_id] || {};
          const prodName = prod.name || it.name || it.product_name || 'Produk';
          const prodUnit = prod.unit || it.unit || 'pcs';
          const prodSku = prod.sku || it.sku || '';
          const batchDisplay = it.batch_id || (batchMap[it.product_id] ? batchMap[it.product_id].join(', ') : '-');
          let unitPrice = Number(it.unit_price || 0);
          if (unitPrice <= 0) {
            const pTiers = tiersByProd[it.product_id] || [];
            const exactTier = pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === outletTierName)
              || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'outlet')
              || pTiers.find(t => String(t.tier_name || '').trim().toLowerCase() === 'reguler')
              || pTiers[0];
            unitPrice = exactTier ? Number(exactTier.price || 0) : 0;
          }
          return {
            ...it,
            name: prodName,
            product_name: prodName,
            unit: prodUnit,
            sku: prodSku,
            unit_price: unitPrice,
            batch_id: batchDisplay
          };
        })
      };
    }

    case 'getConsignmentSuratJalanPdf': {
      const [, transferId] = args;
      const targetId = transferId || args[0];
      if (targetId) {
        try {
          const { data: tr } = await supabase
            .from('consignment_transfers')
            .select('pdf_url')
            .eq('id', targetId)
            .maybeSingle();
          const url = (tr && tr.pdf_url) || '';
          return { success: true, pdf_url: url, url: url };
        } catch (e) {
          console.warn('[getConsignmentSuratJalanPdf] Warn:', e);
        }
      }
      return { success: true, pdf_url: '', url: '' };
    }

    case 'getConsignmentAuditReceiptData': {
      const [, auditId] = args;
      const targetId = auditId || args[0];
      const { data: audit, error: aErr } = await supabase
        .from('consignment_audits')
        .select('*')
        .eq('id', targetId)
        .single();
      if (aErr) throw aErr;

      const [outletRes, itemsRes] = await Promise.all([
        audit.outlet_id ? supabase.from('outlets').select('*').eq('id', audit.outlet_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('consignment_audit_items').select('*').eq('audit_id', targetId)
      ]);
      const outlet = outletRes.data || {};
      const rawItems = itemsRes.data || [];
      const prodIds = [...new Set(rawItems.map(it => it.product_id).filter(Boolean))];
      const productsMap = {};
      if (prodIds.length > 0) {
        const { data: prods } = await supabase.from('products').select('id, name, unit, sku').in('id', prodIds);
        (prods || []).forEach(p => { if (p && p.id) productsMap[p.id] = p; });
      }
      return {
        audit,
        outlet,
        items: rawItems.map(it => {
          const p = productsMap[it.product_id] || {};
          return {
            ...it,
            product_name: p.name || 'Produk',
            unit: p.unit || 'pcs',
            sku: p.sku || ''
          };
        })
      };
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

      const { data: existingTxRow } = await supabase
        .from('transactions')
        .select('invoice_no')
        .eq('id', transactionId)
        .maybeSingle();
      const preservedInvoiceNo = payload?.invoice_no || existingTxRow?.invoice_no || '';

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
              const nowIso = new Date().toISOString();
              const rollbackMut = {
                id: crypto.randomUUID(),
                product_id: item.product_id,
                batch_id: item.batch_id || null,
                reference_no: payload?.invoice_no || transactionId,
                mutation_type: 'MASUK_KOREKSI_NOTA',
                qty: qtyToReturn,
                qty_change: qtyToReturn,
                qty_after: 0,
                unit: item.unit || 'pcs',
                notes: `Rollback Koreksi Nota #${transactionId}`,
                created_at: nowIso
              };
              if (typeof saveMutationToLocalBackup === 'function') {
                saveMutationToLocalBackup(rollbackMut);
              }
              const { error: rbErr } = await supabase.from('stock_mutations').insert({
                id: rollbackMut.id,
                product_id: rollbackMut.product_id,
                batch_id: rollbackMut.batch_id,
                reference_no: rollbackMut.reference_no,
                mutation_type: rollbackMut.mutation_type,
                qty: rollbackMut.qty,
                unit: rollbackMut.unit,
                notes: rollbackMut.notes,
                created_at: rollbackMut.created_at
              });
              if (rbErr) {
                await supabase.from('stock_mutations').insert(rollbackMut);
              }
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

      // 3. Hitung subtotal, tax, ongkir/biaya tambahan, dan total akhir baru
      let calcSubtotal = 0;
      for (const it of (payload?.items || [])) {
        calcSubtotal += Number(it.qty || 0) * Number(it.price || 0);
      }
      const subtotal = payload?.subtotal !== undefined ? Number(payload.subtotal) : calcSubtotal;
      const taxRate = Number(payload?.taxRate || 0);
      const tax = payload?.tax !== undefined ? Number(payload.tax) : Math.round(subtotal * taxRate);
      const feeRec = buildTransactionFeeRecord(payload, subtotal, tax);
      const total = feeRec.total;

      // 4. Potong ulang stok menggunakan consumeStockFIFOClient
      const invoiceNo = preservedInvoiceNo || `INV-${Date.now().toString().slice(-6)}`;
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
      if (payload?.customer_id !== undefined) {
        txUpdateData.customer_id = (payload.customer_id && String(payload.customer_id).trim() !== '') ? payload.customer_id : null;
      }
      if (payload?.customer_name) txUpdateData.customer_name = payload.customer_name;
      if (payload?.source) txUpdateData.source = payload.source;
      if (payload?.transaction_date) {
        const parsedIso = parseLocalTransactionCreatedAt(payload.transaction_date);
        if (parsedIso) txUpdateData.created_at = parsedIso;
      }

      const { error: txErr } = await persistTransactionWithFallback('update', txUpdateData, feeRec.extraColumns, transactionId);
      if (txErr) throw txErr;

      // Jika installment, buat receivables baru
      if (payload?.payment_type === 'installment') {
        const paidAmount = Number(payload.downPayment !== undefined ? payload.downPayment : (payload.paid_amount || 0));
        const totalAmount = total;
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        await supabase.from('receivables').insert({
          id: crypto.randomUUID(),
          transaction_id: transactionId,
          customer_id: txUpdateData.customer_id || null,
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
        subtotal: subtotal,
        tax: tax,
        shipping_cost: feeRec.shippingCost,
        fee_note: feeRec.feeNote,
        qris_fee: feeRec.qrisFee,
        cash_received: feeRec.cashReceived,
        change_amount: feeRec.changeAmount,
        total: total,
        date: txUpdateData.created_at || new Date().toISOString()
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
        const qcUpper = String(b.qc_status || '').toUpperCase();
        const isPendingPreQC = qcUpper === 'PENDING_QC' || qcUpper === 'IN_PROGRESS';
        const qualityStatus = (cCount >= 3 || (String(b.quality_status || '').toUpperCase() === 'QUARANTINE' && !isPendingPreQC)) ? 'QUARANTINE' : (b.quality_status || 'NORMAL');
        return {
          id: b.batch_code || b.batch_no || b.id,
          batch_id: b.batch_code || b.batch_no || b.id,
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
        handled_by: l.handled_by || 'Staf Toko'
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
          handled_by: payload.handled_by || 'Staf Toko',
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

      let data = [];
      const res = await q;
      if (res.error) {
        console.warn('searchBatchTraceability join purchases failed, retrying without purchases join:', res.error);
        let qFallback = supabase
          .from('stock_batches')
          .select('*, products(name, category, variant, unit)')
          .order('expiry_date', { ascending: true });
        if (prodId) qFallback = qFallback.eq('product_id', prodId);
        const res2 = await qFallback;
        if (res2.error) throw res2.error;
        data = res2.data || [];
      } else {
        data = res.data || [];
      }

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

    case 'getFollowUpQueue':
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

    default:
      return window.__API_UNHANDLED;
  }
}
