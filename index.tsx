import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExternalLink, RefreshCw, AlertCircle, Check } from 'lucide-react';

// --- TYPES ---
interface Retailer {
  id: string;
  name: string;
  url: string;
  color: string;
}

interface PricePoint {
  date: string; // ISO Date string YYYY-MM-DD
  [retailerId: string]: number | string;
}

interface RacketDetails {
  name: string;
  imageUrl: string;
  description: string;
}

interface ScrapedPrice {
  retailerId: string;
  price: number;
}

// --- CONSTANTS ---
const RACKET_DETAILS: RacketDetails = {
  name: "Siux Electra ST4 Pro",
  imageUrl: "https://www.padelnuestro.com/images/products/112639/112639_1_siux_electra_st4_pro_1703668875.jpg", 
  description: "The weapon of choice for Franco Stupaczuk. Designed for advanced players seeking a balance of power and control with a hybrid shape."
};

const RETAILERS: Retailer[] = [
  { id: 'justpadel', name: 'JustPadel', url: 'https://justpadel.com/products/siux-electra-st4-pro', color: '#ef4444' },
  { id: 'passasports', name: 'PassaSports', url: 'https://www.passasports.nl/siux-electra-stupa-pro-st4-112639', color: '#3b82f6' },
  { id: 'hollandpadel', name: 'Holland Padel', url: 'https://hollandpadel.com/collections/siux/products/siux-electra-stupa-pro-st4-2025', color: '#f97316' },
  { id: 'tennisvoordeel', name: 'Tennis Voordeel', url: 'https://www.tennis-voordeel.nl/siux-electra-pro-st4/', color: '#22c55e' },
  { id: 'decathlon', name: 'Decathlon', url: 'https://www.decathlon.nl/sporten/padel/padel-racket-volwassenen?pdt-highlight=dff12a42-2531-4069-b253-281e869ee61b', color: '#06b6d4' },
  { id: 'padelnuestro', name: 'Padel Nuestro', url: 'https://www.padelnuestro.com/int/siux-electra-stupa-pro-st4-2025', color: '#a855f7' }
];

const generateMockHistory = (): PricePoint[] => {
  const data: PricePoint[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry: PricePoint = { date: dateStr };
    RETAILERS.forEach(retailer => {
      const basePrice = 280;
      const retailerOffset = retailer.name.length * 2; 
      const randomFluctuation = Math.floor(Math.random() * 20) - 10;
      entry[retailer.id] = basePrice + retailerOffset + randomFluctuation;
    });
    data.push(entry);
  }
  return data;
};

const MOCK_HISTORY = generateMockHistory();

// --- SERVICE ---
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fetchCurrentPricesWithGemini = async (): Promise<ScrapedPrice[]> => {
  try {
    const modelId = "gemini-3-flash-preview"; 
    const retailerList = RETAILERS.map(r => `${r.name}: ${r.url}`).join('\n');
    
    const prompt = `
      I need to find the current *lowest selling price* (in Euros) of the "Siux Electra ST4 Pro" padel racket from the following specific URLs.
      
      ${retailerList}
      
      Please use Google Search to find the price listed on these specific pages.
      
      IMPORTANT PRICING RULES:
      1. **FIND THE DEAL/SALE PRICE**: Many of these items are discounted. You MUST return the discounted price (the price the user would pay at checkout), NOT the MSRP or "Adviesprijs".
      2. If you see two prices (e.g., "€300" crossed out and "€250" active), return 250.
      3. Ignore "Club" or "Member" specific prices unless it is the only price available, but always prefer the public sale price.
      
      OUTPUT INSTRUCTIONS:
      - Return the data strictly as a JSON array.
      - Each item in the array should be an object with "retailerName" (string) and "price" (number).
      - If a price cannot be found, use 0.
      - Do not include any markdown formatting (like \`\`\`json). Just return the raw JSON string.
      
      Example format:
      [
        { "retailerName": "JustPadel", "price": 275.50 },
        { "retailerName": "Decathlon", "price": 0 }
      ]
    `;

    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let jsonText = response.text;
    if (!jsonText) return [];

    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIndex = jsonText.indexOf('[');
    const endIndex = jsonText.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    let parsedData: Array<{ retailerName: string, price: number }> = [];
    try {
        parsedData = JSON.parse(jsonText);
    } catch (e) {
        console.warn("Failed to parse JSON:", jsonText);
        return [];
    }

    const result: ScrapedPrice[] = [];
    parsedData.forEach(item => {
      const retailer = RETAILERS.find(r => 
        item.retailerName.toLowerCase().includes(r.name.toLowerCase()) || 
        r.name.toLowerCase().includes(item.retailerName.toLowerCase())
      );
      if (retailer) {
        result.push({ retailerId: retailer.id, price: item.price });
      }
    });
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- COMPONENTS ---

const HistoryChart: React.FC<{ data: PricePoint[]; retailers: Retailer[] }> = ({ data, retailers }) => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Price History (Last 14 Days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
          <YAxis domain={['auto', 'auto']} unit="€" tick={{fontSize: 12}} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number) => [`€${value}`, 'Price']}
            labelFormatter={(label) => new Date(label).toDateString()}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {retailers.map((retailer) => (
            <Line
              key={retailer.id}
              type="monotone"
              dataKey={retailer.id}
              name={retailer.name}
              stroke={retailer.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const PriceTable: React.FC<{ retailers: Retailer[]; latestData: PricePoint | null }> = ({ retailers, latestData }) => {
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
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: retailer.color }} />
                <span className="font-medium text-gray-700">{retailer.name}</span>
                {isBestPrice && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">Best Deal</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className={`font-bold text-lg ${isBestPrice ? 'text-green-600' : 'text-gray-900'}`}>
                  {price ? `€${price.toFixed(2)}` : '--'}
                </span>
                <a href={retailer.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [history, setHistory] = useState<PricePoint[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem('padelPriceHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) setHistory(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleCheckPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const newPrices = await fetchCurrentPricesWithGemini();
      const today = new Date().toISOString().split('T')[0];
      const newEntry: PricePoint = { date: today };

      RETAILERS.forEach(retailer => {
        const found = newPrices.find(p => p.retailerId === retailer.id);
        if (found) {
          newEntry[retailer.id] = found.price;
        } else {
          const lastEntry = history[history.length - 1];
          newEntry[retailer.id] = lastEntry ? lastEntry[retailer.id] : 0;
        }
      });

      setHistory(prev => {
        const filtered = prev.filter(p => p.date !== today);
        const updated = [...filtered, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('padelPriceHistory', JSON.stringify(updated));
        return updated;
      });
      setLastUpdated(new Date().toLocaleString());

    } catch (err) {
      setError("Failed to fetch live prices. Gemini API key might be missing or quota exceeded.");
    } finally {
      setLoading(false);
    }
  };

  const currentPrices = history[history.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 pb-20">
      <header className="bg-padel-dark text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-padel-yellow text-padel-dark p-2 rounded-lg font-black text-xl tracking-tighter">PADEL TRACKER</div>
             <span className="text-gray-400 text-sm">Monitor. Analyze. Smash.</span>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-gray-400">Last Updated: <span className="text-white">{lastUpdated}</span></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 flex items-center justify-center bg-gray-50 rounded-xl p-4">
              <img src={RACKET_DETAILS.imageUrl} alt={RACKET_DETAILS.name} className="max-h-64 object-contain mix-blend-multiply" />
            </div>
            <div className="flex-1">
              <div className="mb-2"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Pro Line</span></div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{RACKET_DETAILS.name}</h1>
              <p className="text-gray-600 leading-relaxed mb-6">{RACKET_DETAILS.description}</p>
              
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={handleCheckPrices}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2
                    ${loading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-padel-dark text-white hover:bg-gray-800 hover:shadow-lg active:transform active:scale-95'}`}
                >
                  {loading ? <><RefreshCw className="animate-spin" size={20} /> Updating Prices...</> : <><RefreshCw size={20} /> Check Live Prices</>}
                </button>
                {error && <div className="flex items-center text-red-500 text-sm gap-1"><AlertCircle size={16}/> {error}</div>}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">*Uses Google Search Grounding to find real-time pricing.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2"><HistoryChart data={history} retailers={RETAILERS} /></div>
          <div className="lg:col-span-1"><PriceTable retailers={RETAILERS} latestData={currentPrices} /></div>
        </div>
      </main>
    </div>
  );
};

// --- MOUNT ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
