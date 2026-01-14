import { Retailer, PricePoint, RacketDetails } from './types';

export const RACKET_DETAILS: RacketDetails = {
  name: "Siux Electra ST4 Pro",
  imageUrl: "https://www.padelnuestro.com/images/products/112639/112639_1_siux_electra_st4_pro_1703668875.jpg", // Using a representative image URL
  description: "The weapon of choice for Franco Stupaczuk. Designed for advanced players seeking a balance of power and control with a hybrid shape."
};

export const RETAILERS: Retailer[] = [
  {
    id: 'justpadel',
    name: 'JustPadel',
    url: 'https://justpadel.com/products/siux-electra-st4-pro',
    color: '#ef4444', // Red
  },
  {
    id: 'passasports',
    name: 'PassaSports',
    url: 'https://www.passasports.nl/siux-electra-stupa-pro-st4-112639',
    color: '#3b82f6', // Blue
  },
  {
    id: 'hollandpadel',
    name: 'Holland Padel',
    url: 'https://hollandpadel.com/collections/siux/products/siux-electra-stupa-pro-st4-2025',
    color: '#f97316', // Orange
  },
  {
    id: 'tennisvoordeel',
    name: 'Tennis Voordeel',
    url: 'https://www.tennis-voordeel.nl/siux-electra-pro-st4/',
    color: '#22c55e', // Green
  },
  {
    id: 'decathlon',
    name: 'Decathlon',
    url: 'https://www.decathlon.nl/sporten/padel/padel-racket-volwassenen?pdt-highlight=dff12a42-2531-4069-b253-281e869ee61b',
    color: '#06b6d4', // Cyan
  },
  {
    id: 'padelnuestro',
    name: 'Padel Nuestro',
    url: 'https://www.padelnuestro.com/int/siux-electra-stupa-pro-st4-2025',
    color: '#a855f7', // Purple
  }
];

// Generate last 14 days of mock data to simulate database history
const generateMockHistory = (): PricePoint[] => {
  const data: PricePoint[] = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Base price around 250-300 EUR with random fluctuations
    const entry: PricePoint = { date: dateStr };
    RETAILERS.forEach(retailer => {
      // Create a slight trend per retailer
      const basePrice = 280;
      const retailerOffset = retailer.name.length * 2; 
      const randomFluctuation = Math.floor(Math.random() * 20) - 10;
      entry[retailer.id] = basePrice + retailerOffset + randomFluctuation;
    });
    data.push(entry);
  }
  return data;
};

export const MOCK_HISTORY = generateMockHistory();
