import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Activity, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../services/api';
import type { DailyStats } from '../../types';
import { CompactDateRangePicker } from '../CompactDateRangePicker';

interface DailyVisitsChartProps {
  data: DailyStats[];
  loading?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export const DailyVisitsChart: React.FC<DailyVisitsChartProps> = ({ data, loading = false, dateRange }) => {
  const { t } = useTranslation();

  // Comparison period state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<DailyStats[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);

  // Auto-calculate previous period when dateRange changes
  useEffect(() => {
    if (dateRange && showComparison) {
      const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(dateRange.startDate.getTime() - daysDiff * 24 * 60 * 60 * 1000);
      const previousEnd = new Date(dateRange.startDate.getTime() - 24 * 60 * 60 * 1000);
      setComparisonPeriod({ startDate: previousStart, endDate: previousEnd });
    }
  }, [dateRange, showComparison]);

  // Load comparison data
  useEffect(() => {
    if (comparisonPeriod && showComparison) {
      loadComparisonData();
    }
  }, [comparisonPeriod, showComparison]);

  const loadComparisonData = async () => {
    if (!comparisonPeriod) return;

    try {
      setComparisonLoading(true);
      const startDate = comparisonPeriod.startDate.toISOString().split('T')[0];
      const endDate = comparisonPeriod.endDate.toISOString().split('T')[0];
      const daily = await apiService.getDailyStats(startDate, endDate);
      setComparisonData(daily);
    } catch (err) {
      console.error('Failed to load comparison data:', err);
      setComparisonData([]);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Format data for chart
  const chartData = data.map(stat => ({
    date: new Date(stat.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    conversations: stat.conversations || 0,
    messages: stat.messages || 0,
    satisfaction: (stat.avg_satisfaction || 0) * 100, // Convert to percentage
  }));

  // Calculate period-over-period trends (like Shopify/GA4)
  const calculatePeriodTrend = (currentData: number[], comparisonDataValues: number[]) => {
    // If comparison is enabled and we have comparison data, use it
    if (showComparison && comparisonDataValues.length > 0) {
      const currentTotal = currentData.reduce((a, b) => a + b, 0);
      const comparisonTotal = comparisonDataValues.reduce((a, b) => a + b, 0);

      const periodLabel = comparisonPeriod
        ? `vs ${comparisonPeriod.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${comparisonPeriod.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'vs comparison period';

      if (comparisonTotal === 0 && currentTotal === 0) {
        return { trend: 0, label: periodLabel, isAbsolute: false };
      }

      if (comparisonTotal === 0) {
        return { trend: currentTotal, label: periodLabel, isAbsolute: true };
      }

      const percentChange = ((currentTotal - comparisonTotal) / comparisonTotal) * 100;
      return { trend: percentChange, label: periodLabel, isAbsolute: false };
    }

    // Otherwise, use half-period comparison (default behavior)
    if (currentData.length < 2) return { trend: 0, label: 'No data', isAbsolute: false };

    const halfPoint = Math.floor(currentData.length / 2);
    const currentPeriod = currentData.slice(halfPoint);
    const currentTotal = currentPeriod.reduce((a, b) => a + b, 0);
    const previousPeriod = currentData.slice(0, halfPoint);
    const previousTotal = previousPeriod.reduce((a, b) => a + b, 0);

    if (previousTotal === 0 && currentTotal === 0) {
      return { trend: 0, label: 'No activity', isAbsolute: false };
    }

    if (previousTotal === 0) {
      return { trend: currentTotal, label: `vs previous ${halfPoint} days`, isAbsolute: true };
    }

    const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    return { trend: percentChange, label: `vs previous ${halfPoint} days`, isAbsolute: false };
  };

  const comparisonChartData = comparisonData.map(stat => ({
    conversations: stat.conversations || 0,
    messages: stat.messages || 0,
  }));

  const conversationsResult = calculatePeriodTrend(
    chartData.map(d => d.conversations),
    comparisonChartData.map(d => d.conversations)
  );
  const messagesResult = calculatePeriodTrend(
    chartData.map(d => d.messages),
    comparisonChartData.map(d => d.messages)
  );

  if (loading) {
    return (
      <div className="card-hover rounded-2xl p-8">
        <div className="flex items-center justify-center h-80">
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
      <div className="card-hover rounded-2xl p-8">
        <div className="flex flex-col items-center justify-center h-80 text-slate-400">
          <Activity size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-2">Daily analytics will appear here once you have visitor data</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="card-hover rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-50">{t('dashboard.dailyVisits')}</h3>
            <p className="text-sm text-slate-400">Activity trends over time</p>
          </div>
        </div>

        {/* Comparison Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showComparison
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Calendar size={16} />
            <span className="text-sm font-medium">
              {showComparison ? 'Hide Comparison' : 'Compare Period'}
            </span>
          </button>
        </div>
      </div>

      {/* Comparison Period Selector */}
      {showComparison && comparisonPeriod && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Compare to:</p>

            <CompactDateRangePicker
              value={comparisonPeriod}
              onChange={(range) => setComparisonPeriod(range)}
              maxDate={dateRange?.startDate ? new Date(dateRange.startDate.getTime() - 24 * 60 * 60 * 1000) : new Date()}
            />

            {comparisonLoading && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend indicators */}
      <div className="flex items-center justify-between mb-6">
        <div></div>  {/* Spacer */}

        {/* Trend indicators */}
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Conversations</p>
            {conversationsResult.isAbsolute ? (
              <p className="text-sm font-semibold text-blue-400">+{conversationsResult.trend}</p>
            ) : (
              <p className={`text-sm font-semibold ${conversationsResult.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {conversationsResult.trend >= 0 ? '+' : ''}{conversationsResult.trend.toFixed(1)}%
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">{conversationsResult.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Messages</p>
            {messagesResult.isAbsolute ? (
              <p className="text-sm font-semibold text-blue-400">+{messagesResult.trend}</p>
            ) : (
              <p className={`text-sm font-semibold ${messagesResult.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {messagesResult.trend >= 0 ? '+' : ''}{messagesResult.trend.toFixed(1)}%
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">{messagesResult.label}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={{ stroke: '#475569' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            scale="point"
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickLine={{ stroke: '#475569' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
            }}
            labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}
            itemStyle={{ color: '#cbd5e1', fontSize: '13px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="conversations"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorConversations)"
            name="Conversations"
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke="#eab308"
            strokeWidth={2}
            fill="url(#colorMessages)"
            name="Messages"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
