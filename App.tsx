import React, { useState, useEffect } from 'react';
import { RETAILERS, RACKET_DETAILS, MOCK_HISTORY } from './constants';
import { PricePoint } from './types';
import HistoryChart from './components/HistoryChart';
import PriceTable from './components/PriceTable';
import { fetchCurrentPricesWithGemini } from './services/geminiService';
import { RefreshCw, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [history, setHistory] = useState<PricePoint[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString());
  const [error, setError] = useState<string | null>(null);

  // Initialize data from local storage if available to simulate persistence
  useEffect(() => {
    const storedHistory = localStorage.getItem('padelPriceHistory');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        // Basic validation: ensure it's an array
        if (Array.isArray(parsed) && parsed.length > 0) {
           setHistory(parsed);
        }
      } catch (e) {
        console.error("Failed to parse stored history", e);
      }
    }
  }, []);

  const handleCheckPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch prices using Gemini
      const newPrices = await fetchCurrentPricesWithGemini();
      
      const today = new Date().toISOString().split('T')[0];
      
      // Create new history entry
      const newEntry: PricePoint = {
        date: today,
      };

      // Fill in found prices, fallback to previous day's price if not found (or 0)
      RETAILERS.forEach(retailer => {
        const found = newPrices.find(p => p.retailerId === retailer.id);
        if (found) {
          newEntry[retailer.id] = found.price;
        } else {
          // Fallback logic: use last known price
          const lastEntry = history[history.length - 1];
          newEntry[retailer.id] = lastEntry ? lastEntry[retailer.id] : 0;
        }
      });

      // Update State
      setHistory(prev => {
        // Remove today's entry if it exists (to update it)
        const filtered = prev.filter(p => p.date !== today);
        const updated = [...filtered, newEntry];
        // Sort by date just in case
        updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Save to local storage
        localStorage.setItem('padelPriceHistory', JSON.stringify(updated));
        return updated;
      });
      
      setLastUpdated(new Date().toLocaleString());

    } catch (err) {
      console.error(err);
      setError("Failed to fetch live prices. Gemini API key might be missing or quota exceeded.");
    } finally {
      setLoading(false);
    }
  };

  const currentPrices = history[history.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-padel-dark text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-padel-yellow text-padel-dark p-2 rounded-lg font-black text-xl tracking-tighter">
                PADEL TRACKER
             </div>
             <span className="text-gray-400 text-sm">Monitor. Analyze. Smash.</span>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-gray-400">
             Last Updated: <span className="text-white">{lastUpdated}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        
        {/* Racket Overview Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image */}
            <div className="w-full md:w-1/3 flex items-center justify-center bg-gray-50 rounded-xl p-4">
              <img 
                src={RACKET_DETAILS.imageUrl} 
                alt={RACKET_DETAILS.name} 
                className="max-h-64 object-contain mix-blend-multiply"
              />
            </div>
            
            {/* Details */}
            <div className="flex-1">
              <div className="mb-2">
                 <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                    Pro Line
                 </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {RACKET_DETAILS.name}
              </h1>
              <p className="text-gray-600 leading-relaxed mb-6">
                {RACKET_DETAILS.description}
              </p>
              
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={handleCheckPrices}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2
                    ${loading 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-padel-dark text-white hover:bg-gray-800 hover:shadow-lg active:transform active:scale-95'
                    }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      Updating Prices...
                    </>
                  ) : (
                    <>
                       <RefreshCw size={20} />
                       Check Live Prices
                    </>
                  )}
                </button>
                {error && (
                  <div className="flex items-center text-red-500 text-sm gap-1">
                    <AlertCircle size={16}/> 
                    {error}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">
                *Uses Google Search Grounding to find real-time pricing from specified retailers.
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Col: Chart (Span 2) */}
          <div className="lg:col-span-2">
            <HistoryChart data={history} retailers={RETAILERS} />
          </div>

          {/* Right Col: Price Table */}
          <div className="lg:col-span-1">
            <PriceTable retailers={RETAILERS} latestData={currentPrices} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;