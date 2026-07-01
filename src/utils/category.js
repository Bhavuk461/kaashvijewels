export const CATEGORY_MAP = {
  'anti-tarnish': 'Anti-Tarnish Earrings',
  'korean': 'Korean Earrings',
  'bracelet': 'Anti Tarnish Bracelet',
  'tulip-bracelet': 'Tulip Bracelets'
};

export const getCategoryLabel = (category) => {
  return CATEGORY_MAP[category] || category || '';
};
