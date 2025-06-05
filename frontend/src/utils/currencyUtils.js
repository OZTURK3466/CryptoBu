// frontend/src/utils/currencyUtils.js

export const CURRENCIES = {
  usd: {
    symbol: '$',
    name: 'Dollar US',
    code: 'USD',
    position: 'before' // $ avant le montant
  },
  eur: {
    symbol: '€',
    name: 'Euro',
    code: 'EUR',
    position: 'after' // € après le montant
  }
};

export const formatPrice = (price, currency = 'usd') => {
  if (!price || isNaN(price)) return formatCurrency(0, currency);
  
  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) return formatCurrency(price, 'usd');
  
  let formattedPrice;
  
  if (price < 0.01) {
    formattedPrice = price.toFixed(6);
  } else if (price < 1) {
    formattedPrice = price.toFixed(4);
  } else if (price < 1000) {
    formattedPrice = price.toFixed(2);
  } else {
    formattedPrice = price.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return formatCurrency(formattedPrice, currency);
};

export const formatCurrency = (amount, currency = 'usd') => {
  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) return `$${amount}`;
  
  if (currencyInfo.position === 'before') {
    return `${currencyInfo.symbol}${amount}`;
  } else {
    return `${amount}${currencyInfo.symbol}`;
  }
};

export const formatChange = (change, showSign = true) => {
  if (!change || isNaN(change)) return '+0.00%';
  
  const formatted = Math.abs(change).toFixed(2);
  const sign = change >= 0 ? '+' : '-';
  
  if (showSign) {
    return `${sign}${formatted}%`;
  } else {
    return `${formatted}%`;
  }
};

export const getPriceValue = (priceData, currency = 'usd') => {
  if (!priceData) return 0;
  
  switch (currency) {
    case 'eur':
      return priceData.eur || 0;
    case 'usd':
    default:
      return priceData.usd || 0;
  }
};

export const getSymbolForCurrency = (currency = 'usd') => {
  return CURRENCIES[currency]?.symbol || '$';
};

export const getCurrencyName = (currency = 'usd') => {
  return CURRENCIES[currency]?.name || 'Dollar US';
};

// Fonction pour convertir USD vers EUR (approximative si pas de données EUR)
export const convertCurrency = (amount, fromCurrency, toCurrency, exchangeRate = 0.92) => {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'usd' && toCurrency === 'eur') {
    return amount * exchangeRate;
  } else if (fromCurrency === 'eur' && toCurrency === 'usd') {
    return amount / exchangeRate;
  }
  
  return amount;
};

// Fonction pour sauvegarder la préférence de devise
export const saveCurrencyPreference = (currency) => {
  try {
    localStorage.setItem('preferredCurrency', currency);
  } catch (error) {
    console.warn('Impossible de sauvegarder la préférence de devise:', error);
  }
};

// Fonction pour récupérer la préférence de devise
export const getCurrencyPreference = () => {
  try {
    return localStorage.getItem('preferredCurrency') || 'usd';
  } catch (error) {
    console.warn('Impossible de récupérer la préférence de devise:', error);
    return 'usd';
  }
};

// Fonction pour formater les grandes valeurs (Market Cap, Volume)
export const formatLargeNumber = (number, currency = 'usd') => {
  if (!number || isNaN(number)) return formatCurrency('0', currency);
  
  const absNumber = Math.abs(number);
  let formattedNumber;
  
  if (absNumber >= 1e12) {
    formattedNumber = (number / 1e12).toFixed(1) + 'T';
  } else if (absNumber >= 1e9) {
    formattedNumber = (number / 1e9).toFixed(1) + 'B';
  } else if (absNumber >= 1e6) {
    formattedNumber = (number / 1e6).toFixed(1) + 'M';
  } else if (absNumber >= 1e3) {
    formattedNumber = (number / 1e3).toFixed(1) + 'K';
  } else {
    formattedNumber = number.toFixed(2);
  }
  
  return formatCurrency(formattedNumber, currency);
};