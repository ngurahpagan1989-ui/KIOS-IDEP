const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Theme color
html = html.replace('<meta name="theme-color" content="#2563EB">', '<meta name="theme-color" content="#0B0F19">');

// Style.css version and critical head style
const oldStyleLink = '<link rel="stylesheet" href="style.css?v=8.3">';
const newStyleBlock = `<link rel="stylesheet" href="style.css?v=9.0">
  <style>
    /* Critical Inline Dark Cyber Overrides (Prevents Flash & Browser UA Light Inputs) */
    html, body {
      background-color: #0B0F19 !important;
      color-scheme: dark !important;
    }
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active,
    .vault-input-box input:-webkit-autofill,
    .vault-input-box input:-webkit-autofill:hover,
    .vault-input-box input:-webkit-autofill:focus,
    .vault-input-box input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px #080D18 inset !important;
      box-shadow: 0 0 0 1000px #080D18 inset !important;
      -webkit-text-fill-color: #F8FAFC !important;
      caret-color: #22D3EE !important;
      transition: background-color 9999999s ease-in-out 0s !important;
      color-scheme: dark !important;
    }
    input[type="date"],
    input[type="month"],
    input[type="time"],
    input[type="datetime-local"] {
      color-scheme: dark !important;
    }
  </style>`;

html = html.replace(oldStyleLink, newStyleBlock);

// Script tags
html = html.replace('supabaseClient.js?v=6.4', 'supabaseClient.js?v=6.5');
html = html.replace('i18n.js?v=2.9', 'i18n.js?v=3.0');
html = html.replace('app.js?v=10.4', 'app.js?v=11.0');

fs.writeFileSync('index.html', html, 'utf8');
console.log('SUCCESS: index.html updated!');

