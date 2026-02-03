// Bank brand colors mapping
export const BANK_COLORS = {
  // Principais bancos
  'nubank': { gradient: 'from-purple-700 to-purple-900', solid: '#820AD1' },
  'inter': { gradient: 'from-orange-500 to-orange-700', solid: '#FF7A00' },
  'itau': { gradient: 'from-blue-600 to-blue-800', solid: '#EC7000' },
  'bradesco': { gradient: 'from-red-600 to-red-800', solid: '#CC092F' },
  'santander': { gradient: 'from-red-700 to-red-900', solid: '#EC0000' },
  'caixa': { gradient: 'from-blue-600 to-cyan-600', solid: '#0081C7' },
  'bb': { gradient: 'from-yellow-500 to-yellow-700', solid: '#FBB91E' },
  'banco do brasil': { gradient: 'from-yellow-500 to-yellow-700', solid: '#FBB91E' },
  'c6': { gradient: 'from-gray-800 to-gray-900', solid: '#000000' },
  'c6 bank': { gradient: 'from-gray-800 to-gray-900', solid: '#000000' },
  'picpay': { gradient: 'from-green-500 to-green-700', solid: '#21C25E' },
  'mercado pago': { gradient: 'from-blue-400 to-blue-600', solid: '#009EE3' },
  'pagbank': { gradient: 'from-green-600 to-green-800', solid: '#00A868' },
  'next': { gradient: 'from-green-500 to-green-700', solid: '#00AB63' },
  'neon': { gradient: 'from-blue-500 to-blue-700', solid: '#00D9E1' },
  'original': { gradient: 'from-green-600 to-green-800', solid: '#6FCF97' },
  'safra': { gradient: 'from-blue-800 to-blue-900', solid: '#003A70' },
  'sicoob': { gradient: 'from-green-600 to-green-800', solid: '#036937' },
  'sicredi': { gradient: 'from-green-700 to-green-900', solid: '#00602C' },
  
  // Default
  'default': { gradient: 'from-slate-600 to-slate-800', solid: '#64748b' }
};

export function getBankColor(cardName = '') {
  const name = cardName.toLowerCase();
  
  for (const [bank, colors] of Object.entries(BANK_COLORS)) {
    if (name.includes(bank)) {
      return colors;
    }
  }
  
  return BANK_COLORS.default;
}
