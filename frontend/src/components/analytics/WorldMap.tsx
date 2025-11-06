/**
 * Lightweight WorldMap replacement using Recharts
 * Replaces heavy react-globe.gl (1.1MB) with a simple bar chart
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe as GlobeIcon, Loader, TrendingUp, Users } from 'lucide-react';
import type { CountryStats } from '../../types';

interface WorldMapProps {
  data: CountryStats[];
  loading?: boolean;
}

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
  'ES': '🇪🇸', 'IT': '🇮🇹', 'JP': '🇯🇵', 'CN': '🇨🇳', 'IN': '🇮🇳',
  'BR': '🇧🇷', 'AU': '🇦🇺', 'RU': '🇷🇺', 'MX': '🇲🇽', 'KR': '🇰🇷',
  'SA': '🇸🇦', 'AE': '🇦🇪', 'SG': '🇸🇬', 'NL': '🇳🇱', 'SE': '🇸🇪',
  'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'TR': '🇹🇷',
  'EG': '🇪🇬', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'AR': '🇦🇷', 'CL': '🇨🇱',
  'CO': '🇨🇴',
};

// Color gradient based on visitor percentage
const getBarColor = (percentage: number): string => {
  if (percentage >= 20) return '#3b82f6'; // blue-500 (high traffic)
  if (percentage >= 10) return '#06b6d4'; // cyan-500 (medium-high)
  if (percentage >= 5) return '#0ea5e9';  // sky-500 (medium)
  if (percentage >= 2) return '#38bdf8';  // sky-400 (low-medium)
  return '#7dd3fc'; // sky-300 (low traffic)
};

export const WorldMap: React.FC<WorldMapProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
            <GlobeIcon className="text-primary-600" size={24} />
            Geographic Distribution
          </h2>
          <p className="text-sm text-slate-300 mt-1">Visitor breakdown by country</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-400 min-h-[400px]">
          <Loader className="animate-spin" size={48} />
        </div>
      </div>
    );
  }

  // Sort by visitors (highest first) and take top 15
  const topCountries = [...data]
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 15);

  const totalVisitors = data.reduce((sum, country) => sum + country.visitors, 0);

  // Transform data for Recharts
  const chartData = topCountries.map(country => ({
    name: country.country_code,
    fullName: country.country_name,
    visitors: country.visitors,
    percentage: country.percentage,
    flag: countryFlags[country.country_code] || '🌐',
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{data.flag}</span>
            <p className="font-semibold text-slate-50">{data.fullName}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">
              <span className="text-blue-400 font-medium">{data.visitors.toLocaleString()}</span> visitors
            </p>
            <p className="text-slate-300">
              <span className="text-cyan-400 font-medium">{data.percentage.toFixed(1)}%</span> of total
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom X-axis tick (country code with flag)
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const country = chartData.find(c => c.name === payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize={20}
        >
          {country?.flag || '🌐'}
        </text>
        <text
          x={0}
          y={0}
          dy={36}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={11}
          fontWeight={500}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
              <GlobeIcon className="text-primary-600" size={22} />
              Geographic Distribution
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Top {topCountries.length} countries out of {data.length} total
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg">
              <Users size={16} className="text-blue-400" />
              <span className="text-sm font-semibold text-slate-200">
                {totalVisitors.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">total visitors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Countries Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {topCountries.slice(0, 3).map((country, index) => (
          <motion.div
            key={country.country_code}
            className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{countryFlags[country.country_code] || '🌐'}</span>
              <span className="text-xs font-semibold text-slate-400">
                #{index + 1}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-200 truncate">
              {country.country_name}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-blue-400">
                {country.visitors.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">
                ({country.percentage.toFixed(1)}%)
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="name"
              tick={<CustomXAxisTick />}
              interval={0}
              height={70}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
            <Bar dataKey="visitors" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#3b82f6]"></div>
          <span>High (≥20%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#06b6d4]"></div>
          <span>Medium-High (10-20%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#0ea5e9]"></div>
          <span>Medium (5-10%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#38bdf8]"></div>
          <span>Low-Medium (2-5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#7dd3fc]"></div>
          <span>Low (&lt;2%)</span>
        </div>
      </div>

      {/* Hover Hint */}
      <div className="mt-3 text-center">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <TrendingUp size={14} />
          Hover over bars for detailed country statistics
        </p>
      </div>
    </motion.div>
  );
};
