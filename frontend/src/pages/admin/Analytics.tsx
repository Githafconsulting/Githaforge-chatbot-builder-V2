import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, ThumbsUp, TrendingUp, Database, Sparkles, AlertCircle, GripVertical, Layout as LayoutIcon, Save, RotateCcw, ChevronDown, CheckCircle, BarChart3, Clock, Timer, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import GridLayout from 'react-grid-layout';
import toast, { Toaster } from 'react-hot-toast';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { apiService } from '../../services/api';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { CardSkeleton } from '../../components/ui';
import { DateRangePicker } from '../../components/DateRangePicker';
import { DailyVisitsChart } from '../../components/analytics/DailyVisitsChart';
import { CountryStats } from '../../components/analytics/CountryStats';
import { WorldMap } from '../../components/analytics/WorldMap';
import { FeedbackInsights } from '../../components/analytics/FeedbackInsights';
import type { Analytics, DailyStats, CountryStats as CountryStatsType } from '../../types';

const COLORS = ['#1e40af', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Helper function to generate unique colors
const generateUniqueColors = (count: number): string[] => {
  const colors = [...COLORS];

  // If we need more colors than predefined, generate additional ones
  if (count > COLORS.length) {
    const additionalColors = [
      '#ec4899', // Pink
      '#06b6d4', // Cyan-500
      '#84cc16', // Lime
      '#f97316', // Orange
      '#a855f7', // Purple-500
      '#14b8a6', // Teal
      '#f43f5e', // Rose
      '#6366f1', // Indigo
      '#eab308', // Yellow
      '#22c55e', // Green-500
      '#0891b2', // Cyan-600
      '#fb923c', // Orange-400
    ];

    // Add additional colors until we have enough
    for (let i = 0; i < count - COLORS.length && i < additionalColors.length; i++) {
      colors.push(additionalColors[i]);
    }

    // If still not enough, generate random distinct colors
    while (colors.length < count) {
      const hue = (colors.length * 137.5) % 360; // Golden angle for good distribution
      const saturation = 65 + (colors.length % 3) * 10; // Vary saturation
      const lightness = 50 + (colors.length % 4) * 5; // Vary lightness
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
  }

  return colors.slice(0, count);
};

// Helper function to format duration in seconds to human-readable format
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

// Default grid layout configuration
// rowHeight is 80px, so h:6 = 480px, h:8 = 640px, h:9 = 720px
const defaultLayout = [
  { i: 'daily-visits', x: 0, y: 0, w: 12, h: 9, minW: 6, minH: 7 },  // 720px for chart + comparison picker
  { i: 'world-map', x: 0, y: 9, w: 6, h: 9, minW: 4, minH: 8 },      // 720px min for bar chart + controls
  { i: 'country-stats', x: 6, y: 9, w: 6, h: 9, minW: 4, minH: 7 },  // 640px min for country list
  { i: 'trending-queries', x: 0, y: 18, w: 12, h: 7, minW: 6, minH: 6 }, // 560px min for chart
  { i: 'feedback-insights', x: 0, y: 25, w: 12, h: 8, minW: 6, minH: 7 }, // 640px min for feedback list
];

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // New state for date range and new analytics
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStatsType[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [feedbackPatternsCount, setFeedbackPatternsCount] = useState<number>(0);

  // Grid layout state
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('analytics-layout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });

  // Layout management state
  const [savedLayout, setSavedLayout] = useState(() => {
    const saved = localStorage.getItem('analytics-layout-saved');
    return saved ? JSON.parse(saved) : defaultLayout;
  });
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Prepare chart data (intent-based) with unique colors - MUST be before useEffect
  const trendingQueriesData = React.useMemo(() => {
    const queries = analytics?.trending_queries || [];
    const uniqueColors = generateUniqueColors(queries.length);

    return queries.slice(0, 10).map((item, index) => ({
      name: item.query.length > 20 ? item.query.substring(0, 20) + '...' : item.query,
      value: item.count,
      fullName: item.query,
      intent: item.intent,
      samples: item.sample_queries || [],
      fill: uniqueColors[index]  // Each bar gets a unique color
    }));
  }, [analytics?.trending_queries]);

  // Update container width dynamically with ResizeObserver
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        console.log('Container width calculated:', width);
        setContainerWidth(width);
      }
    };

    updateWidth();

    // Use ResizeObserver for more reliable width detection
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        console.log('ResizeObserver detected width:', width);
        setContainerWidth(width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateWidth);

    // Fallback delays to ensure width is updated
    setTimeout(updateWidth, 100);
    setTimeout(updateWidth, 500);
    setTimeout(updateWidth, 1000);

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Save layout to localStorage when it changes
  const onLayoutChange = (newLayout: any) => {
    setLayout(newLayout);
    localStorage.setItem('analytics-layout', JSON.stringify(newLayout));
  };

  // Save current layout as new default
  const handleSaveLayout = () => {
    setShowSaveConfirmModal(true);
  };

  const performSaveLayout = () => {
    setSavedLayout([...layout]);
    localStorage.setItem('analytics-layout-saved', JSON.stringify(layout));
    setShowSaveConfirmModal(false);
    setIsLayoutDropdownOpen(false);
    toast.success('Layout saved successfully!', {
      duration: 3000,
      position: 'top-center',
      style: {
        background: '#1e293b',
        color: '#f1f5f9',
        border: '1px solid #334155',
      },
    });
  };

  // Reset layout to last saved state
  const handleResetLayout = () => {
    setShowResetConfirmModal(true);
  };

  const performResetLayout = () => {
    setLayout([...savedLayout]); // Create new array to force re-render
    localStorage.setItem('analytics-layout', JSON.stringify(savedLayout));
    setShowResetConfirmModal(false);
    setIsLayoutDropdownOpen(false);

    // Force re-render of GridLayout
    setTimeout(() => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    }, 100);

    toast.success('Layout reset successfully!', {
      duration: 3000,
      position: 'top-center',
      style: {
        background: '#1e293b',
        color: '#f1f5f9',
        border: '1px solid #334155',
      },
    });
  };

  useEffect(() => {
    loadAnalytics();
    loadNewAnalytics();
  }, []);

  useEffect(() => {
    loadNewAnalytics();
  }, [dateRange]);

  // Recalculate width when analytics data loads
  useEffect(() => {
    if (analytics && containerRef.current) {
      const updateWidth = () => {
        const width = containerRef.current?.offsetWidth || 1200;
        console.log('Width recalculated after data load:', width);
        setContainerWidth(width);
      };
      // Give time for the layout to fully render
      setTimeout(updateWidth, 100);
      setTimeout(updateWidth, 300);
      setTimeout(updateWidth, 600);
    }
  }, [analytics]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Analytics error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadNewAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];

      // Load daily stats, country stats, and feedback insights
      const [daily, countries, feedbackInsights] = await Promise.all([
        apiService.getDailyStats(startDate, endDate).catch(() => []),
        apiService.getCountryStats(startDate, endDate).catch(() => []),
        apiService.getFeedbackInsights(startDate, endDate).catch(() => ({ patterns_identified: 0 })),
      ]);

      setDailyStats(daily);
      setCountryStats(countries);
      setFeedbackPatternsCount(feedbackInsights.patterns_identified || 0);
    } catch (err) {
      console.error('Failed to load new analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-8 py-6 rounded-2xl flex items-center gap-3 max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} />
          <div>
            <h3 className="font-semibold text-lg mb-1">Failed to Load Analytics</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          className="bg-slate-800 border border-slate-700 text-slate-100 px-8 py-6 rounded-2xl flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertCircle size={24} className="text-slate-300" />
          <div>
            <h3 className="font-semibold text-lg mb-1">No Analytics Data</h3>
            <p className="text-sm text-slate-300">Unable to load analytics at this time.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Conversations',
      value: analytics?.conversation_metrics?.total_conversations || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Total Messages',
      value: analytics?.conversation_metrics?.total_messages || 0,
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Active Chat Time',
      value: formatDuration(analytics?.conversation_metrics?.avg_active_chat_time_seconds || 0),
      icon: Timer,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      label: 'Feedback Insights',
      value: feedbackPatternsCount,
      icon: Lightbulb,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
    },
    {
      label: 'Feedback Rate',
      value: `${((analytics?.satisfaction_metrics?.feedback_rate || 0) * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Satisfaction Score',
      value: `${((analytics?.satisfaction_metrics?.avg_satisfaction || 0) * 100).toFixed(1)}%`,
      icon: ThumbsUp,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
  ];

  const kbData = [
    { name: 'Documents', value: analytics.knowledge_base_metrics?.total_documents || 0 },
    { name: 'Chunks', value: analytics.knowledge_base_metrics?.total_chunks || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Analytics Overview</h1>
            <p className="text-slate-400 text-sm mt-0.5">Drag and resize boards to customize your dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Layout Management Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <LayoutIcon size={16} />
              Layout
              <ChevronDown size={14} className={`transition-transform ${isLayoutDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isLayoutDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsLayoutDropdownOpen(false)}
                  />

                  {/* Dropdown Content */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-strong overflow-hidden z-40"
                  >
                    <button
                      onClick={handleSaveLayout}
                      className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <Save size={16} className="text-green-400" />
                      Save Layout
                    </button>
                    <button
                      onClick={handleResetLayout}
                      className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <RotateCcw size={16} className="text-orange-400" />
                      Reset Layout
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Stats Grid - Fixed (not draggable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -5, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)' }}
              className="card-hover p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-300 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-50 mt-2">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl shadow-md`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Draggable Grid Layout */}
      <div ref={containerRef} className="w-full">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={80}
          width={containerWidth}
          onLayoutChange={onLayoutChange}
          draggableHandle=".drag-handle"
          compactType="vertical"
          preventCollision={false}
          isResizable={true}
          isDraggable={true}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {/* Daily Visits Chart */}
          <div key="daily-visits" className="card p-4 flex flex-col h-full overflow-visible">
            <div className="drag-handle cursor-move p-2 hover:bg-slate-700/20 rounded-lg transition-colors self-start mb-2">
              <GripVertical className="text-slate-400" size={20} />
            </div>
            <div className="flex-1 overflow-auto">
              <DailyVisitsChart data={dailyStats} loading={analyticsLoading} dateRange={dateRange} />
            </div>
          </div>

          {/* World Map - Using V2's bar chart version (NO GLOBE) */}
          <div key="world-map" className="card p-4 flex flex-col h-full overflow-visible">
            <div className="drag-handle cursor-move p-2 hover:bg-slate-700/20 rounded-lg transition-colors self-start mb-2">
              <GripVertical className="text-slate-400" size={20} />
            </div>
            <div className="flex-1 overflow-auto">
              <WorldMap data={countryStats} loading={analyticsLoading} />
            </div>
          </div>

          {/* Country Stats */}
          <div key="country-stats" className="card p-4 flex flex-col h-full overflow-visible">
            <div className="drag-handle cursor-move p-2 hover:bg-slate-700/20 rounded-lg transition-colors self-start mb-2">
              <GripVertical className="text-slate-400" size={20} />
            </div>
            <div className="flex-1 overflow-auto">
              <CountryStats data={countryStats} loading={analyticsLoading} />
            </div>
          </div>

          {/* Trending Queries */}
          <div key="trending-queries" className="card p-4 flex flex-col h-full overflow-visible">
            <div className="drag-handle cursor-move p-2 hover:bg-slate-700/20 rounded-lg transition-colors self-start mb-2">
              <GripVertical className="text-slate-400" size={20} />
            </div>
            <div className="flex-1 overflow-auto">
              <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2 mb-2">
                <TrendingUp className="text-primary-600" size={24} />
                Trending Queries
              </h2>
              <p className="text-sm text-slate-300 mb-4">Most frequently asked questions</p>

              {trendingQueriesData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendingQueriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#f1f5f9'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg max-w-xs">
                                <p className="text-slate-50 font-semibold mb-2">{data.fullName}</p>
                                <p className="text-slate-300 text-sm mb-2">Count: {data.value}</p>
                                {data.samples && data.samples.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-700">
                                    <p className="text-slate-400 text-xs font-medium mb-1">Sample queries:</p>
                                    <ul className="space-y-1">
                                      {data.samples.slice(0, 3).map((sample: string, idx: number) => (
                                        <li key={idx} className="text-slate-300 text-xs italic">
                                          "{sample.length > 60 ? sample.substring(0, 60) + '...' : sample}"
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} />

                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-xs text-slate-400 italic">
                    * Topics grouped by intent - hover bars to see sample queries
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <MessageSquare size={48} className="mb-3" />
                  <p>No trending queries yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Insights */}
          <div key="feedback-insights" className="card p-4 flex flex-col h-full overflow-visible">
            <div className="drag-handle cursor-move p-2 hover:bg-slate-700/20 rounded-lg transition-colors self-start mb-2">
              <GripVertical className="text-slate-400" size={20} />
            </div>
            <div className="flex-1 overflow-auto">
              <FeedbackInsights loading={analyticsLoading} dateRange={dateRange} showActions={false} />
            </div>
          </div>
        </GridLayout>
      </div>

      {/* Toast Notifications */}
      <Toaster />

      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {showSaveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirmModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Save className="text-green-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-50">Save Layout</h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-slate-300">
                  Are you sure you want to save the current layout as the new default? This will overwrite your previously saved layout.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-900/50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSaveConfirmModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={performSaveLayout}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Save Layout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirmModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <RotateCcw className="text-orange-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-50">Reset Layout</h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-slate-300">
                  Are you sure you want to reset the layout to your last saved configuration? Any unsaved changes will be lost.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-900/50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowResetConfirmModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={performResetLayout}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Reset Layout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
