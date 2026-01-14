import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PricePoint, Retailer } from '../types';

interface HistoryChartProps {
  data: PricePoint[];
  retailers: Retailer[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, retailers }) => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Price History (Last 14 Days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{fontSize: 12}} 
            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
          />
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

export default HistoryChart;