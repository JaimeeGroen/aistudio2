import React from 'react';
import { Retailer, PricePoint } from '../types';
import { ExternalLink } from 'lucide-react'; // Assuming we can use basic icons, if not, I'll use text

interface PriceTableProps {
  retailers: Retailer[];
  latestData: PricePoint | null;
}

const PriceTable: React.FC<PriceTableProps> = ({ retailers, latestData }) => {
  // Sort retailers by price (cheapest first) if data is available
  const sortedRetailers = [...retailers].sort((a, b) => {
    const priceA = latestData ? (latestData[a.id] as number) : 0;
    const priceB = latestData ? (latestData[b.id] as number) : 0;
    if (!priceA) return 1;
    if (!priceB) return -1;
    return priceA - priceB;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Current Prices</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedRetailers.map((retailer, index) => {
          const price = latestData ? (latestData[retailer.id] as number) : null;
          const isBestPrice = index === 0 && price !== null;

          return (
            <div key={retailer.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: retailer.color }}
                />
                <span className="font-medium text-gray-700">{retailer.name}</span>
                {isBestPrice && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    Best Deal
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className={`font-bold text-lg ${isBestPrice ? 'text-green-600' : 'text-gray-900'}`}>
                  {price ? `€${price.toFixed(2)}` : '--'}
                </span>
                <a 
                  href={retailer.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title={`Visit ${retailer.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceTable;
