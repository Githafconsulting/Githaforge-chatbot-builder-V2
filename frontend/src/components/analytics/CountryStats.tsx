import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CountryStats as CountryStatsType } from '../../types';

interface CountryStatsProps {
  data: CountryStatsType[];
  loading?: boolean;
}

// Helper to get flag emoji from country code
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};

export const CountryStats: React.FC<CountryStatsProps> = ({ data, loading = false }) => {
  const { t } = useTranslation();

  // Sort by count descending and take top 10
  const topCountries = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  if (loading) {
    return (
      <div className="card-hover rounded-2xl p-6">
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"
          />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card-hover rounded-2xl p-6">
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <Globe size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No visitor data</p>
          <p className="text-sm mt-2">Country statistics will appear here once you have visitors</p>
        </div>
      </div>
    );
  }

  const maxCount = topCountries[0]?.count || 1;

  return (
    <motion.div
      className="card-hover rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <Globe size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-50">{t('dashboard.countryStats')}</h3>
          <p className="text-sm text-slate-400">Top visitor locations</p>
        </div>
      </div>

      {/* Country List */}
      <div className="space-y-3">
        <AnimatePresence>
          {topCountries.map((country, index) => {
            const percentage = (country.count / maxCount) * 100;

            return (
              <motion.div
                key={country.country_code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFlagEmoji(country.country_code)}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{country.country_name}</p>
                      <p className="text-xs text-slate-400">{country.country_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-50">{country.count}</p>
                    <p className="text-xs text-slate-400">{country.percentage.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total visitors footer */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-400" />
            <span className="text-sm text-slate-300">Total Visitors</span>
          </div>
          <span className="text-lg font-bold text-slate-50">
            {data.reduce((sum, country) => sum + country.count, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
