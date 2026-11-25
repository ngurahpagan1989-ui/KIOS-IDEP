/**
 * ==============================================================================
 * KATALOG PUBLIK — ENTRY POINT & GLOBAL BOOTSTRAPPER
 * ==============================================================================
 * Modul terisolasi penuh dari admin:
 *   - katalog/config.js        : Konfigurasi Supabase publik & state katalog
 *   - katalog/utils.js         : Formatter rupiah, nomor WA, escapeHtml & toast
 *   - katalog/service.js       : Koneksi Supabase publik & fetchCatalogData
 *   - katalog/catalog-ui.js    : Header, promo slider, featured, filter & grid
 *   - katalog/cart-checkout.js : Keranjang belanja & checkout WhatsApp / POS
 * ==============================================================================
 */

// 3. INISIALISASI SAAT DOM SIAP
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  loadCartFromStorage();
  clearCustomerForm();
  setupEventListeners();
  fetchCatalogData();
});

window.addEventListener('pageshow', (event) => {
  if (event && event.persisted) {
    loadCartFromStorage();
    if (cart.length === 0) clearCustomerForm();
    if (allProducts.length > 0) renderProductsGrid();
    renderCartModalItems();
  }
});


// 9. EVENT LISTENERS
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
      applyFilterAndRender();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilterAndRender();
      }
    });
  }

  // Klik backdrop untuk menutup modal
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCartModal();
    });
  }
}


// Ekspor ke window untuk event inline onclick
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCartModal = openCartModal;
window.closeCartModal = closeCartModal;
window.sendOrderToWhatsApp = sendOrderToWhatsApp;
window.fetchCatalogData = fetchCatalogData;
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.goToSlide = goToSlide;
window.handleSlideCTA = handleSlideCTA;
window.quickSelectProduct = quickSelectProduct;
window.clearCartState = clearCartState;
window.clearCustomerForm = clearCustomerForm;
window.closeOrderSuccessModal = closeOrderSuccessModal;
window.toggleOnlyReadyFilter = toggleOnlyReadyFilter;
window.toggleOnlyReadyChip = toggleOnlyReadyChip;
window.askStockViaWhatsApp = askStockViaWhatsApp;



