const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const additionalStyles = `

/* ==============================================================================
   GLASSY FORM 3D FOLD-CLOSE & SPRING-OPEN ("GERAKAN MENUTUP" REFERENSI VIDEO)
   Mengimplementasikan animasi melipat menutup (edge-on) lalu membuka kembali
   saat beralih antara Login, Register, dan Mode PIN
   ============================================================================== */
.glassy-card-container {
  perspective: 1200px !important;
  perspective-origin: center center !important;
}

.login-card.glassy-card {
  position: relative !important;
  transform-style: preserve-3d !important;
  backface-visibility: hidden !important;
  transform-origin: center center !important;
  will-change: transform, height, opacity, filter, box-shadow !important;
  transition: height 0.42s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease !important;
}

/* Phase 1: Gerakan Menutup (3D Fold Edge-On Shut) */
.login-card.glassy-card.is-closing {
  animation: glassyFoldClose 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
  pointer-events: none !important;
}

/* Phase 2: Gerakan Membuka (3D Spring Unfold dari Posisi Menutup) */
.login-card.glassy-card.is-opening {
  animation: glassyFoldOpen 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
}

@keyframes glassyFoldClose {
  0% {
    transform: perspective(1200px) rotateY(0deg) scale(1);
    opacity: 1;
    filter: brightness(1) blur(0);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(6, 182, 212, 0.15);
  }
  45% {
    filter: brightness(1.35) blur(1px);
    box-shadow: 0 10px 40px rgba(6, 182, 212, 0.5);
  }
  100% {
    transform: perspective(1200px) rotateY(-90deg) scale(0.88);
    opacity: 0.05;
    filter: brightness(1.6) blur(3px);
    box-shadow: 0 0 50px rgba(6, 182, 212, 0.7);
  }
}

@keyframes glassyFoldOpen {
  0% {
    transform: perspective(1200px) rotateY(90deg) scale(0.88);
    opacity: 0.05;
    filter: brightness(1.5) blur(3px);
    box-shadow: 0 0 50px rgba(6, 182, 212, 0.7);
  }
  65% {
    transform: perspective(1200px) rotateY(-3.5deg) scale(1.02);
    opacity: 1;
    filter: brightness(1.06) blur(0);
  }
  100% {
    transform: perspective(1200px) rotateY(0deg) scale(1);
    opacity: 1;
    filter: brightness(1) blur(0);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(6, 182, 212, 0.15);
  }
}

/* Aksen Sudut Cyan Ikut Merapat Saat Menutup */
.login-card.glassy-card.is-closing .glassy-corner-badge {
  transform: scale(0.65) !important;
  opacity: 0.4 !important;
  transition: transform 0.2s ease, opacity 0.2s ease !important;
}

.login-card.glassy-card.is-opening .glassy-corner-badge {
  animation: glassyBadgeSpring 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
}

@keyframes glassyBadgeSpring {
  0% {
    transform: scale(0.65);
    opacity: 0.4;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ==============================================================================
   OVERRIDE AUTOFILL CHROME / EDGE / WEBKIT (HILANGKAN WARNA COKLAT / KUNING)
   Menjamin autofill kredensial tidak pernah mengubah latar input menjadi coklat
   ============================================================================== */
.glassy-input-box input:-webkit-autofill,
.glassy-input-box input:-webkit-autofill:hover,
.glassy-input-box input:-webkit-autofill:focus,
.glassy-input-box input:-webkit-autofill:active,
.glassy-form-group input:-webkit-autofill,
.glassy-form-group input:-webkit-autofill:hover,
.glassy-form-group input:-webkit-autofill:focus,
.glassy-form-group input:-webkit-autofill:active,
#login-username:-webkit-autofill,
#login-username:-webkit-autofill:hover,
#login-username:-webkit-autofill:focus,
#login-username:-webkit-autofill:active,
#login-password:-webkit-autofill,
#login-password:-webkit-autofill:hover,
#login-password:-webkit-autofill:focus,
#login-password:-webkit-autofill:active,
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
textarea:-webkit-autofill,
select:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px #080D1A inset !important;
  box-shadow: 0 0 0 1000px #080D1A inset !important;
  -webkit-text-fill-color: #F8FAFC !important;
  caret-color: #22D3EE !important;
  transition: background-color 9999999s ease-in-out 0s !important;
  color-scheme: dark !important;
}

/* ==============================================================================
   DARK THEME GUARANTEE UNTUK SUB-NAV PENGATURAN, TANGGAL & FAKTUR
   ============================================================================== */
.settings-tabs-wrapper .settings-tab-btn,
.settings-tab-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(22, 30, 46, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #94A3B8 !important;
  border-radius: var(--radius-sm) !important;
  padding: 8px 14px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
}

.settings-tabs-wrapper .settings-tab-btn:hover,
.settings-tab-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
  border-color: rgba(6, 182, 212, 0.45) !important;
}

.settings-tabs-wrapper .settings-tab-btn.active,
.settings-tab-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border: 1px solid rgba(6, 182, 212, 0.6) !important;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.35) !important;
  font-weight: 700 !important;
}

/* Date Pickers Uniform Obsidian Theme */
input[type="date"],
input[type="month"],
input[type="time"],
input[type="datetime-local"],
#report-start-date,
#report-end-date,
#faktur-start-date,
#faktur-end-date {
  background: rgba(15, 23, 42, 0.95) !important;
  color: #F8FAFC !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: var(--radius-xs) !important;
  color-scheme: dark !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

/* Invoice Format Tabs & Buttons */
.invoice-format-tab-btn {
  background: rgba(22, 30, 46, 0.85) !important;
  color: #94A3B8 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.invoice-format-tab-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
  border-color: rgba(6, 182, 212, 0.4) !important;
}

.invoice-format-tab-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border: 1px solid rgba(6, 182, 212, 0.55) !important;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.3) !important;
  font-weight: 700 !important;
}
`;

css += additionalStyles;
fs.writeFileSync('style.css', css, 'utf8');
console.log('Successfully appended styles to style.css');
