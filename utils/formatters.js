// Modul: Formatter Tampilan, Konversi Data, Generator Nomor Dokumen & Cadangan Mutasi Lokal

function formatRupiah(num) {
  num = Number(num || 0);
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function formatDateIndo(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
  try {
    const isEn = window.i18n && window.i18n.getLanguage() === 'en';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(isEn ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) {
      const clean = dateStr.trim().split(/[T\s]/)[0];
      const parts = clean.split('-');
      const months = isEn
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      if (parts.length >= 3) {
        return parts[2] + ' ' + (months[parseInt(parts[1], 10) - 1] || parts[1]) + ' ' + parts[0];
      }
    }
  } catch (e) { }
  return '-';
}
window.formatDateIndo = formatDateIndo;

function formatDate(d) {
  return formatDateIndo(d);
}

function formatDateTimeIndo(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
  try {
    const raw = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return formatDateIndo(raw);
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const isEn = window.i18n && window.i18n.getLanguage() === 'en';
      const datePart = d.toLocaleDateString(isEn ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = d.toLocaleTimeString(isEn ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':');
      return datePart + ', ' + timePart;
    }
  } catch (e) { }
  return formatDateIndo(dateStr);
}
window.formatDateTimeIndo = formatDateTimeIndo;


function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}


function isRawProduct(unit) {
  const u = (unit || '').toLowerCase().trim();
  return u === 'gr' || u === 'gram' || u === 'g' || u === 'kg';
}

/**
 * Pembersih dan penyingkat kode varietas benih untuk format batch universal
 * Contoh: "Bayam Hijau" -> "BYM", "Kangkung Lombok" -> "KNG" (atau SKU: "KGL")
 */
function cleanProductCodeForBatch(nameOrCode) {
  if (!nameOrCode) return 'BENIH';
  let str = String(nameOrCode).trim();
  str = str.split('(')[0].trim();
  str = str.replace(/^[^a-zA-Z0-9]+/, '').trim();
  if (!str) return 'BENIH';

  // Jika kode pendek/SKU sudah berupa huruf kapital 2-4 karakter (misal BYM, KGL, CBR, TMT)
  const cleanCode = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanCode.length >= 2 && cleanCode.length <= 4 && /^[A-Z]+$/.test(cleanCode)) {
    return cleanCode;
  }

  const words = str.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const firstWord = words[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
    const firstChar = firstWord[0];
    const isVowel = 'AEIOU'.includes(firstChar);
    if (isVowel) {
      const restConsonants = firstWord.slice(1).replace(/[AEIOU]/g, '');
      if (restConsonants.length >= 2) {
        return firstChar + restConsonants.slice(0, 2);
      }
      return firstWord.slice(0, 3).padEnd(3, 'X');
    } else {
      const consonants = firstWord.replace(/[AEIOU]/g, '');
      if (consonants.length >= 3) {
        return consonants.slice(0, 3);
      } else if (consonants.length === 2 && words[1]) {
        const secondConsonants = words[1].replace(/[^a-zA-Z]/g, '').toUpperCase().replace(/[AEIOU]/g, '');
        return consonants + (secondConsonants[0] || words[1][0] || 'X').toUpperCase();
      } else if (firstWord.length >= 3) {
        return firstWord.slice(0, 3);
      }
    }
  }

  const singleClean = str.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const firstChar = singleClean[0];
  const isVowel = 'AEIOU'.includes(firstChar);
  if (isVowel) {
    const restConsonants = singleClean.slice(1).replace(/[AEIOU]/g, '');
    if (restConsonants.length >= 2) {
      return firstChar + restConsonants.slice(0, 2);
    }
    return singleClean.slice(0, 3).padEnd(3, 'X');
  }

  const cons = singleClean.replace(/[AEIOU]/g, '');
  if (cons.length >= 3) {
    return cons.slice(0, 3);
  }
  if (singleClean.length >= 3) {
    return singleClean.slice(0, 3);
  }
  return singleClean.padEnd(3, 'X').slice(0, 3);
}
window.cleanProductCodeForBatch = cleanProductCodeForBatch;

/**
 * Ekstraksi Tahun-Bulan (YYMM) dari tanggal produksi/kadaluarsa
 */
function extractYYMMClient(dateVal) {
  if (dateVal) {
    const parts = String(dateVal).trim().split(/[-/]/);
    if (parts.length >= 2) {
      if (parts[0].length === 4) {
        return parts[0].slice(2, 4) + String(parts[1]).padStart(2, '0');
      } else if (parts.length >= 3 && parts[2].length === 4) {
        return parts[2].slice(2, 4) + String(parts[1]).padStart(2, '0');
      }
    }
  }
  // Default jika kosong: gunakan BULAN & TAHUN HARI INI (bukan tahun depan)
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2, 4);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return yy + mm;
}
window.extractYYMMClient = extractYYMMClient;


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

function removePurchaseMutationsFromLocalBackup(batchIds, invoiceNo) {
  try {
    const idSet = new Set((batchIds || []).map(x => String(x)));
    const inv = invoiceNo ? String(invoiceNo).trim() : '';
    const backup = JSON.parse(localStorage.getItem('idep_stock_mutations_backup') || '[]');
    const filtered = backup.filter(m => {
      if (!m) return false;
      const matchBatch = m.batch_id && idSet.has(String(m.batch_id)) && (!m.mutation_type || m.mutation_type === 'MASUK_PEMBELIAN');
      const matchInv = inv && m.reference_no && String(m.reference_no).trim() === inv && m.mutation_type === 'MASUK_PEMBELIAN';
      return !matchBatch && !matchInv;
    });
    localStorage.setItem('idep_stock_mutations_backup', JSON.stringify(filtered));
  } catch (e) {
    console.warn('[LocalBackup] Gagal membersihkan mutasi pembelian:', e);
  }
}

/**
 * Generator Penomoran Dokumen Otomatis Terpusat (Sequential Counter Bulanan)
 * Format Baku Standar: [PREFIX]-[YYMM]-[URUT_4_DIGIT]
 * Contoh: INV-2611-0001, SJ-2611-0001, PO-2611-0001, QC-2611-0001, MOV-2611-0001, dsb.
 * Otomatis tereset kembali ke 0001 setiap awal bulan baru secara kronologis.
 */
async function generateSequentialDocNo(prefix, tableName, column = 'invoice_no') {
  const d = new Date();
  const yymm = String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0');
  const leader = prefix + '-' + yymm + '-';

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(column)
      .like(column, leader + '%')
      .order(column, { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      const latestCode = data[0][column];
      if (latestCode && typeof latestCode === 'string' && latestCode.startsWith(leader)) {
        const rawNum = latestCode.slice(leader.length).trim();
        const num = parseInt(rawNum, 10);
        if (!isNaN(num) && num > 0) {
          return leader + String(num + 1).padStart(4, '0');
        }
      }
    }
    return leader + '0001';
  } catch (err) {
    console.warn(`[DocNo] Gagal query nomor dokumen ${prefix} pada tabel ${tableName}, gunakan fallback unik:`, err);
    const rand4 = Math.floor(1000 + Math.random() * 9000);
    return leader + rand4;
  }
}
window.generateSequentialDocNo = generateSequentialDocNo;


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

