const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const glassyCSS = `
/* ==============================================================================
   GLASSY LOGIN FORM V3 (ULTRA-MODERN GLASSMORPHISM & NEON CYAN THEME)
   Desain presisi sesuai referensi Glassy Login Form v3 video
   ============================================================================== */

/* 1. Backdrop & Animated Ambient Fluid Glow */
.login-screen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 99999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 100vh !important;
  width: 100vw !important;
  padding: 24px 16px !important;
  background: #060911 !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  box-sizing: border-box !important;
}

.login-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 65% at 50% -10%, rgba(6, 182, 212, 0.22), transparent 70%),
    radial-gradient(ellipse 70% 55% at 85% 60%, rgba(59, 130, 246, 0.18), transparent 70%),
    radial-gradient(ellipse 75% 60% at 15% 85%, rgba(14, 165, 233, 0.14), transparent 70%),
    linear-gradient(180deg, #070B14 0%, #0B0F19 55%, #04070E 100%) !important;
  pointer-events: none;
  z-index: 1;
}

.glassy-ambient-wave {
  position: absolute;
  width: 160%;
  height: 160%;
  top: -30%;
  left: -30%;
  background:
    radial-gradient(circle at 35% 35%, rgba(6, 182, 212, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 65% 55%, rgba(59, 130, 246, 0.12) 0%, transparent 45%);
  animation: ambientWaveFloat 20s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 1;
  filter: blur(65px);
}

@keyframes ambientWaveFloat {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(3deg) scale(1.08); }
  100% { transform: rotate(-3deg) scale(1.02); }
}

/* 2. Container Card Wrapper */
.glassy-card-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Top Utility Bar */
.glassy-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
}

.glassy-security-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 5px 12px;
  border-radius: 999px;
  backdrop-filter: blur(12px);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #94A3B8;
  text-transform: uppercase;
}

.glassy-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #06B6D4;
  box-shadow: 0 0 10px #06B6D4;
}

.pulse-cyan {
  animation: pulseCyan 2s infinite ease-in-out;
}

@keyframes pulseCyan {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px #06B6D4; }
  50% { opacity: 0.6; transform: scale(0.85); box-shadow: 0 0 4px #06B6D4; }
}

.glassy-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.glassy-util-btn {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94A3B8;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  backdrop-filter: blur(12px);
}

.glassy-util-btn:hover {
  color: #FFFFFF;
  border-color: rgba(6, 182, 212, 0.4);
  background: rgba(30, 41, 59, 0.8);
}

.glassy-lang-pills {
  display: flex;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 2px;
  backdrop-filter: blur(12px);
}

.glassy-lang-btn {
  background: transparent;
  border: none;
  color: #64748B;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.glassy-lang-btn.active {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3));
  color: #22D3EE;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.25);
}

/* 3. The 3D Glass Card Container & Flip Logic */
.glassy-card-flipper {
  position: relative;
  width: 100%;
}

.login-card.glassy-card {
  position: relative;
  width: 100%;
  max-width: 440px !important;
  background: rgba(15, 23, 42, 0.72) !important;
  backdrop-filter: blur(28px) saturate(190%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 26px !important;
  padding: 34px 28px 28px !important;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.8),
    0 0 35px rgba(6, 182, 212, 0.16),
    inset 0 1px 1px rgba(255, 255, 255, 0.18),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5) !important;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  overflow: visible !important;
  box-sizing: border-box !important;
}

/* Signature Folded Cyan Corner Accents */
.glassy-corner-badge {
  position: absolute;
  width: 38px;
  height: 38px;
  pointer-events: none;
  z-index: 5;
  filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.85));
}

.glassy-corner-tl {
  top: -3px;
  left: -3px;
}

.glassy-corner-br {
  bottom: -3px;
  right: -3px;
  transform: rotate(180deg);
}

/* Typography Header */
.glassy-card-header {
  margin-bottom: 24px;
  text-align: left;
}

.glassy-title {
  font-size: 26px !important;
  font-weight: 800 !important;
  color: #F8FAFC !important;
  margin: 0 0 6px 0 !important;
  letter-spacing: -0.3px !important;
  font-family: 'Figtree', sans-serif !important;
}

.glassy-subtitle {
  font-size: 13px !important;
  color: #94A3B8 !important;
  margin: 0 !important;
  line-height: 1.45 !important;
}

/* Form Fields */
.glassy-field-group {
  margin-bottom: 18px;
}

.glassy-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.glassy-field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #E2E8F0;
  margin-bottom: 6px;
}

.glassy-label-row .glassy-field-label {
  margin-bottom: 0;
}

.glassy-text-link {
  font-size: 12px;
  color: #22D3EE;
  text-decoration: none;
  transition: all 0.2s ease;
}

.glassy-text-link:hover {
  color: #38BDF8;
  text-decoration: underline;
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.glassy-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.glassy-input-icon {
  position: absolute;
  left: 14px;
  color: #64748B;
  font-size: 14px;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.glassy-input-wrap input {
  width: 100% !important;
  padding: 12px 14px 12px 42px !important;
  background: rgba(15, 23, 42, 0.65) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 12px !important;
  font-size: 13.5px !important;
  color: #F8FAFC !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.2s ease !important;
  box-sizing: border-box !important;
}

.glassy-input-wrap input:focus {
  background: rgba(15, 23, 42, 0.88) !important;
  border-color: #06B6D4 !important;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.22), inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  outline: none !important;
}

.glassy-input-wrap input:focus + .glassy-input-icon,
.glassy-input-wrap:focus-within .glassy-input-icon {
  color: #22D3EE !important;
}

.glassy-input-wrap input::placeholder {
  color: #475569 !important;
}

.glassy-pwd-toggle {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 6px 8px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.2s ease;
}

.glassy-pwd-toggle:hover {
  color: #22D3EE;
}

/* Remember me & Status row */
.glassy-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.glassy-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.glassy-checkbox-label input {
  display: none !important;
}

.glassy-custom-check {
  width: 17px;
  height: 17px;
  border-radius: 5px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.6);
  position: relative;
  transition: all 0.2s ease;
}

.glassy-checkbox-label input:checked + .glassy-custom-check {
  background: linear-gradient(135deg, #06B6D4, #3B82F6);
  border-color: #06B6D4;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.glassy-checkbox-label input:checked + .glassy-custom-check::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.glassy-check-text {
  font-size: 12.5px;
  color: #94A3B8;
}

.glassy-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748B;
  font-family: 'JetBrains Mono', monospace;
}

.glassy-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
}

/* Alert Banner */
.glassy-alert-banner {
  background: rgba(239, 68, 68, 0.15) !important;
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
  color: #FCA5A5 !important;
  border-radius: 12px !important;
  padding: 10px 14px !important;
  font-size: 12.5px !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin-bottom: 18px !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15) !important;
}

/* Primary Button */
.glassy-btn-primary {
  width: 100% !important;
  padding: 13px 20px !important;
  background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%) !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 12px !important;
  font-size: 14.5px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.35) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  user-select: none !important;
}

.glassy-btn-primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 30px rgba(6, 182, 212, 0.5) !important;
  filter: brightness(1.1) !important;
}

.glassy-btn-primary:active {
  transform: translateY(0) !important;
}

/* Divider */
.glassy-divider {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.glassy-divider::before,
.glassy-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.glassy-divider span {
  padding: 0 12px;
}

/* Alternative Actions (Google / Apple Style from Video) */
.glassy-alt-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.glassy-alt-btn {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 10px 14px;
  color: #E2E8F0;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.glassy-alt-btn:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(6, 182, 212, 0.4);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transform: translateY(-1px);
}

/* Footer Link */
.glassy-card-footer {
  text-align: center;
  font-size: 12.5px;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.glassy-link-cyan {
  color: #22D3EE;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
}

.glassy-link-cyan:hover {
  color: #38BDF8;
  text-decoration: underline;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
}

.glassy-footer-copy {
  text-align: center;
  color: #475569;
  font-size: 11.5px;
}

/* 4. PIN Keypad Grid & Masked Indicator (Secondary View) */
.glassy-pin-display-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.glassy-pin-dots {
  display: flex;
  gap: 12px;
}

.glassy-pin-dots .pin-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  transition: all 0.2s ease;
}

.glassy-pin-dots .pin-dot.filled {
  background: #22D3EE;
  border-color: #22D3EE;
  box-shadow: 0 0 12px #06B6D4;
  transform: scale(1.15);
}

.glassy-keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.glassy-key {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #F8FAFC;
  font-size: 18px;
  font-weight: 700;
  padding: 13px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.glassy-key:hover {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(6, 182, 212, 0.4);
  color: #22D3EE;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
  transform: translateY(-2px);
}

.glassy-key:active {
  transform: translateY(0);
}

.glassy-key-clear {
  color: #F87171 !important;
  font-size: 13px !important;
  letter-spacing: 0.5px !important;
}

.glassy-key-clear:hover {
  border-color: rgba(239, 68, 68, 0.5) !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.3) !important;
}

.glassy-key-enter {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.35), rgba(59, 130, 246, 0.35)) !important;
  color: #22D3EE !important;
  border-color: rgba(6, 182, 212, 0.6) !important;
}

.glassy-key-enter:hover {
  background: linear-gradient(135deg, #06B6D4, #3B82F6) !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.45) !important;
}
`;

css += '\n' + glassyCSS;
fs.writeFileSync('style.css', css, 'utf8');
console.log('SUCCESS: style.css updated with Glassy Login Form v3 styles!');

