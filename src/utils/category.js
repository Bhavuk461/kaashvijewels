export const CATEGORY_MAP = {
  'anti-tarnish': 'Anti-Tarnish Earrings',
  'korean': 'Korean Earrings',
  'bracelet': 'Anti Tarnish Bracelet',
  'tulip-bracelet': 'Tulip Bracelets'
};

export const getCategoryLabel = (category) => {
  return CATEGORY_MAP[category] || category || '';
};

export const getEffectiveCategory = (product) => {
  if (!product) return '';
  const category = product.category || '';
  const name = product.name || '';
  if (category === 'tulip-bracelet' || name.toLowerCase().includes('tulip')) {
    return 'tulip-bracelet';
  }
  return category;
};
