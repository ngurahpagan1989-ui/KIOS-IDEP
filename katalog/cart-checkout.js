// Komponen UI Katalog: Keranjang Belanja, Modal Checkout, Antrean POS & WhatsApp

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    showToast(`Maaf, stok "${product.name}" sedang habis.`);
    return;
  }

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Maksimal pesanan "${product.name}" sesuai stok ready adalah ${product.stock} ${product.unit}.`);
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      variant: product.variant,
      unit: product.unit,
      price: product.price,
      qty: 1
    });
  }

  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);
  showToast(`"${product.name}" ditambahkan ke keranjang.`);
}

function updateCartQty(productId, delta) {
  const itemIndex = cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) return;

  cart[itemIndex].qty += delta;

  if (cart[itemIndex].qty <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);

  // Jika modal keranjang terbuka, render ulang daftar item di modal
  renderCartModalItems();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);
  renderCartModalItems();
  showToast('Item dihapus dari keranjang.');
}

function clearCartState(shouldCloseModal) {
  const affectedIds = cart.map(i => i.id);
  cart = [];
  saveCartToStorage();
  clearCustomerForm();
  updateCartBadge();
  updateFloatingCartBar();
  renderCartModalItems();
  affectedIds.forEach(id => updateSingleCardAction(id));
  if (shouldCloseModal) closeCartModal();
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm('Kosongkan semua pesanan di keranjang?')) {
    clearCartState(true);
    showToast('Keranjang telah dikosongkan.');
  }
}

function updateSingleCardAction(productId) {
  const wrap = document.getElementById(`action-wrap-${productId}`);
  if (!wrap) return;

  const product = allProducts.find(p => p.id === productId);
  if (product && product.stock <= 0) {
    wrap.innerHTML = `
      <button type="button" class="btn-add-cart btn-out-of-stock" disabled title="Stok saat ini kosong">
        <i class="fas fa-ban"></i> Stok Habis
      </button>
    `;
    return;
  }

  const item = cart.find(ci => ci.id === productId);
  if (item && item.qty > 0) {
    wrap.innerHTML = `
      <div class="card-qty-control">
        <button type="button" class="qty-btn" onclick="updateCartQty('${productId}', -1)" title="Kurangi">&minus;</button>
        <span class="qty-val">${item.qty}</span>
        <button type="button" class="qty-btn" onclick="updateCartQty('${productId}', 1)" title="Tambah">&plus;</button>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <button type="button" class="btn-add-cart" onclick="addToCart('${productId}')">
        <i class="fas fa-cart-plus"></i> + Keranjang
      </button>
    `;
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = totalItems;
  if (totalItems > 0) {
    badge.classList.add('has-items');
  } else {
    badge.classList.remove('has-items');
  }
}

function updateFloatingCartBar() {
  const bar = document.getElementById('floating-cart-bar');
  if (!bar) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (totalItems > 0) {
    const qtyEl = document.getElementById('float-qty-text');
    const totalEl = document.getElementById('float-total-text');
    if (qtyEl) qtyEl.textContent = `${totalItems} Barang Dipilih`;
    if (totalEl) totalEl.textContent = formatRupiah(totalPrice);
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }
}

function saveCartToStorage() {
  try {
    if (!Array.isArray(cart) || cart.length === 0) {
      localStorage.removeItem('public_catalog_cart');
    } else {
      localStorage.setItem('public_catalog_cart', JSON.stringify(cart));
    }
  } catch (e) { }
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('public_catalog_cart');
    if (raw) cart = JSON.parse(raw);
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
  updateFloatingCartBar();
}

// 7. MODAL KERANJANG & CHECKOUT
function openCartModal() {
  if (cart.length === 0) {
    showToast('Keranjang belanja Anda masih kosong.');
    return;
  }
  renderCartModalItems();
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartModal() {
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartModalItems() {
  const container = document.getElementById('cart-items-list');
  const totalModalEl = document.getElementById('modal-total-price');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--text-muted);">
        <i class="fas fa-shopping-basket" style="font-size:32px;color:#CBD5E1;margin-bottom:8px;"></i>
        <p>Keranjang belanja kosong.</p>
      </div>
    `;
    if (totalModalEl) totalModalEl.textContent = 'Rp 0';
    return;
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  if (totalModalEl) totalModalEl.textContent = formatRupiah(totalPrice);

  container.innerHTML = cart.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-details">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-sub">
          ${item.variant ? `<span>${escapeHtml(item.variant)} &bull; </span>` : ''}
          <strong>${formatRupiah(item.price)}</strong> / ${escapeHtml(item.unit)}
        </div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-mini-qty">
          <button type="button" class="btn-mini-qty" onclick="updateCartQty('${item.id}', -1)">&minus;</button>
          <span class="mini-qty-val">${item.qty}</span>
          <button type="button" class="btn-mini-qty" onclick="updateCartQty('${item.id}', 1)">&plus;</button>
        </div>
        <button type="button" class="btn-del-item" onclick="removeFromCart('${item.id}')" title="Hapus">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// 8. PROSES CHECKOUT WHATSAPP
async function sendOrderToWhatsApp() {
  if (cart.length === 0) {
    alert('Keranjang belanja kosong!');
    return;
  }

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const methodSelect = document.getElementById('cust-method');
  const notesInput = document.getElementById('cust-notes');
  const submitBtn = document.querySelector('.btn-send-wa');
  if (submitBtn && submitBtn.disabled) return;
  const origSubmitHtml = submitBtn ? submitBtn.innerHTML : '<i class="fab fa-whatsapp" style="font-size:18px;"></i> Kirim Pesanan via WhatsApp';

  const customerName = nameInput ? nameInput.value.trim() : '';
  const customerPhone = phoneInput ? phoneInput.value.trim() : '';
  const deliveryMethod = methodSelect ? methodSelect.value : 'Ambil di Toko';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!customerName) {
    alert('Mohon masukkan Nama Pemesan.');
    if (nameInput) nameInput.focus();
    return;
  }

  if (!customerPhone) {
    alert('Mohon masukkan Nomor WhatsApp Pemesan.');
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan Pesanan ke Antrean POS...';
  }

  // Generate Nomor Pesanan Resmi (#ORD-YYMMDD-XXX)
  const now = new Date();
  const dateStr = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  const rndDigits = Math.floor(100 + Math.random() * 900);
  const orderNo = `ORD-${dateStr}-${rndDigits}`;
  const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('ord-' + Date.now());

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const orderPayload = {
    id: orderId,
    order_no: orderNo,
    customer_name: customerName,
    customer_phone: customerPhone,
    delivery_method: deliveryMethod,
    customer_address: notes,
    notes: notes,
    items: cart.map(item => ({
      id: item.id,
      product_id: item.id,
      name: item.name,
      variant: item.variant || '',
      unit: item.unit || 'pcs',
      price: Number(item.price || 0),
      qty: Number(item.qty || 1),
      subtotal: Number(item.price || 0) * Number(item.qty || 1)
    })),
    subtotal: totalPrice,
    total: totalPrice,
    status: 'pending',
    source: 'KATALOG_ONLINE',
    created_at: now.toISOString()
  };

  // Simpan ke antrean Supabase (Prioritas: online_orders -> Fallback: settings)
  let savedToCloud = false;
  if (supabaseClient) {
    try {
      const { error: ordErr } = await supabaseClient.from('online_orders').insert(orderPayload);
      if (!ordErr) savedToCloud = true;
    } catch (err) { }

    if (!savedToCloud) {
      try {
        const { error: setErr } = await supabaseClient.from('settings').insert({
          key: `online_order_${orderId}`,
          value: JSON.stringify(orderPayload)
        });
        if (!setErr) savedToCloud = true;
      } catch (err) {
        console.warn('Fallback save to settings:', err);
      }
    }
  }

  // Format Teks Pesan WhatsApp Resmi
  let msg = `*PESANAN RESMI KATALOG ONLINE*\n`;
  msg += `*${String(storeConfig.name || 'Toko').toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *No. Pesanan:* *#${orderNo}*\n`;
  msg += `📅 *Tanggal:* ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  msg += `👤 *Pemesan:* *${customerName}* (${customerPhone})\n`;
  msg += `🚚 *Metode:* ${deliveryMethod}\n`;
  if (notes) {
    msg += `📝 *Catatan / Alamat:* ${notes}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 *RINCIAN BARANG:*\n`;

  cart.forEach((item, idx) => {
    const subtotal = item.price * item.qty;
    const variantStr = item.variant ? ` (${item.variant})` : '';
    msg += `${idx + 1}. *${item.name}*${variantStr}\n`;
    msg += `   └ ${item.qty} ${item.unit} x ${formatRupiah(item.price)} = ${formatRupiah(subtotal)}\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *TOTAL PESANAN: ${formatRupiah(totalPrice)}*\n\n`;
  msg += `Halo Admin, pesanan saya di atas sudah terdaftar di sistem dengan nomor *#${orderNo}*. Mohon konfirmasi ketersediaan barang dan nomor rekening pembayaran toko. Terima kasih! 🙏`;

  const waTarget = formatWaNumber(storeConfig.phone);
  const waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`;

  // Bersihkan keranjang belanja
  clearCartState(true);
  renderProductsGrid();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origSubmitHtml;
  }

  // Tampilkan Modal Konfirmasi Sukses ke Pelanggan
  showOrderSuccessModal(orderNo, customerName, totalPrice, waUrl);

  // Buka WhatsApp di tab baru
  window.open(waUrl, '_blank');
}

function showOrderSuccessModal(orderNo, customerName, total, waUrl) {
  let modal = document.getElementById('order-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'order-success-modal';
    modal.className = 'cart-modal-backdrop';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOrderSuccessModal();
    });
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="cart-modal" style="max-width:440px;text-align:center;padding:26px 22px;background:#111827;border:1px solid rgba(255,255,255,0.12);box-shadow:0 20px 45px rgba(0,0,0,0.8), 0 0 24px rgba(6,182,212,0.25);">
      <div style="width:68px;height:68px;background:rgba(16,185,129,0.18);color:#34D399;border:1px solid rgba(16,185,129,0.35);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 14px auto;box-shadow:0 0 16px rgba(16,185,129,0.25);">
        <i class="fas fa-check"></i>
      </div>
      <h3 style="font-size:18px;font-weight:800;color:#F8FAFC;margin-bottom:6px;">Pesanan Berhasil Dikirim!</h3>
      <p style="font-size:13px;color:#94A3B8;line-height:1.5;margin-bottom:16px;">
        Terima kasih, <strong style="color:#F8FAFC;">${escapeHtml(customerName)}</strong>. Pesanan Anda telah tersambung langsung ke antrean kasir POS toko dengan nomor:
      </p>
      <div style="background:rgba(15,23,42,0.85);border:1.5px dashed #06B6D4;border-radius:10px;padding:12px;margin-bottom:18px;box-shadow:inset 0 0 12px rgba(6,182,212,0.1);">
        <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;">Nomor Pesanan Resmi</div>
        <div style="font-size:22px;font-weight:900;color:#22D3EE;letter-spacing:1px;font-family:monospace;margin-top:2px;">#${orderNo}</div>
        <div style="font-size:12.5px;font-weight:700;color:#F8FAFC;margin-top:4px;">Total Tagihan: ${formatRupiah(total)}</div>
      </div>
      <p style="font-size:12px;color:#94A3B8;margin-bottom:18px;">
        Jika WhatsApp belum terbuka otomatis, klik tombol di bawah untuk melanjutkan chat konfirmasi ke kasir:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="${waUrl}" target="_blank" class="btn-checkout" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fab fa-whatsapp" style="font-size:18px;"></i> Buka Chat WhatsApp Kasir
        </a>
        <button type="button" class="btn-clear-cart" onclick="closeOrderSuccessModal()" style="background:rgba(255,255,255,0.06);color:#94A3B8;border:1px solid rgba(255,255,255,0.12);width:100%;height:38px;">
          Selesai &amp; Lanjut Lihat Produk
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (modal) modal.classList.remove('open');
}


/**
 * Mengosongkan form data pemesan serta menghapus sisa auto-fill di localStorage.
 */
function clearCustomerForm() {
  try {
    localStorage.removeItem('catalog_last_cust_name');
    localStorage.removeItem('catalog_last_cust_phone');
    localStorage.removeItem('catalog_last_cust_notes');
  } catch (e) { }

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const methodSelect = document.getElementById('cust-method');
  const notesInput = document.getElementById('cust-notes');

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (methodSelect) methodSelect.selectedIndex = 0;
  if (notesInput) notesInput.value = '';
}

