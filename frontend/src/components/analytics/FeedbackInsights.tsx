import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, AlertTriangle, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import type { FeedbackInsights as FeedbackInsightsType, FeedbackPattern } from '../../types';

interface FeedbackInsightsProps {
  loading?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  showActions?: boolean; // Hide dropdown and draft button when false
}

const priorityConfig = {
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle, label: 'Critical' },
  high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle, label: 'High' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Lightbulb, label: 'Medium' },
  low: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Lightbulb, label: 'Low' },
};

export const FeedbackInsights: React.FC<FeedbackInsightsProps> = ({ loading: parentLoading, dateRange, showActions = true }) => {
  const [insights, setInsights] = useState<FeedbackInsightsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [dateRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange) {
        startDate = dateRange.startDate.toISOString().split('T')[0];
        endDate = dateRange.endDate.toISOString().split('T')[0];
      }

      const data = await apiService.getFeedbackInsights(startDate, endDate);
      setInsights(data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load feedback insights:', err);
      setError(err.response?.data?.detail || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async (pattern: FeedbackPattern) => {
    try {
      setGeneratingDraft(pattern.pattern);
      const response = await apiService.generateDraft({
        feedback_ids: pattern.feedback_ids,
        query_pattern: pattern.pattern,
        category: 'user_feedback',
      });

      if (response.success) {
        alert(`Draft generated successfully! View it in the Documents page under "Pending Drafts".`);
      } else {
        alert(`Failed to generate draft: ${response.message}`);
      }
    } catch (err: any) {
      console.error('Failed to generate draft:', err);
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setGeneratingDraft(null);
    }
  };

  if (loading || parentLoading) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2 mb-2">
          <Lightbulb className="text-primary-600" size={24} />
          Feedback Insights
        </h2>
        <p className="text-sm text-slate-300 mb-4">AI-powered analysis of user feedback</p>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2 mb-2">
          <Lightbulb className="text-primary-600" size={24} />
          Feedback Insights
        </h2>
        <p className="text-sm text-slate-300 mb-4">AI-powered analysis of user feedback</p>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights || insights.patterns.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2 mb-2">
          <Lightbulb className="text-primary-600" size={24} />
          Feedback Insights
        </h2>
        <p className="text-sm text-slate-300 mb-4">AI-powered analysis of user feedback</p>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Lightbulb size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No feedback patterns detected yet</p>
            <p className="text-xs mt-1">Check back after receiving more user feedback</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2 mb-2">
        <Lightbulb className="text-primary-600" size={24} />
        Feedback Insights
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        {insights.total_negative_feedback} negative feedback in last {insights.period_days} days • {insights.patterns_identified} patterns identified
      </p>

      <div className="flex-1 overflow-auto space-y-3">
        {insights.patterns.map((pattern, index) => {
          const config = priorityConfig[pattern.priority];
          const PriorityIcon = config.icon;
          const isExpanded = expandedPattern === pattern.pattern;
          const isGenerating = generatingDraft === pattern.pattern;

          return (
            <motion.div
              key={pattern.pattern}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-100">{pattern.pattern}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${config.color} flex items-center gap-1`}>
                      <PriorityIcon size={12} />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{pattern.count} occurrences</p>
                </div>
              </div>

              {/* Samples Preview - Only show if showActions is true */}
              {showActions && pattern.samples.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setExpandedPattern(isExpanded ? null : pattern.pattern)}
                    className="text-xs text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {isExpanded ? '▼' : '▶'} View {pattern.samples.length} sample{pattern.samples.length > 1 ? 's' : ''}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-2"
                      >
                        {pattern.samples.map((sample, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-xs">
                            <p className="text-slate-300 mb-1">
                              <span className="font-semibold">Query:</span> {sample.query}
                            </p>
                            <p className="text-slate-400">
                              <span className="font-semibold">Feedback:</span> {sample.comment}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Action Button - Enhanced CTA - Only show if showActions is true */}
              {showActions && (
                <motion.button
                  onClick={() => handleGenerateDraft(pattern)}
                  disabled={isGenerating}
                  className={`w-full px-4 py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                    isGenerating
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/50 hover:shadow-emerald-500/70 hover:scale-[1.02]'
                  }`}
                  whileHover={!isGenerating ? { scale: 1.02 } : {}}
                  whileTap={!isGenerating ? { scale: 0.98 } : {}}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Generating Draft...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="animate-pulse" />
                      <span>Generate Knowledge Base Draft</span>
                      <Sparkles size={20} className="animate-pulse" />
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
