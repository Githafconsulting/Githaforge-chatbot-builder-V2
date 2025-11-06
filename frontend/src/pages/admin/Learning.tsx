import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Lightbulb,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Play,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  CalendarClock,
  TrendingUp,
  Search,
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { DateRangePicker } from '../../components/DateRangePicker';
import type { FeedbackInsights, DraftDocument, PendingDraftsResponse } from '../../types';

export const LearningPage: React.FC = () => {
  // State
  const [drafts, setDrafts] = useState<DraftDocument[]>([]);
  const [insights, setInsights] = useState<FeedbackInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftDocument | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Advanced section toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Insights filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });
  const [selectedPattern, setSelectedPattern] = useState<any>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [expandedPatternId, setExpandedPatternId] = useState<number | null>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setDraftsLoading(true);
      const draftsData = await apiService.getPendingDrafts({ status: 'pending', limit: 100 });
      setDrafts(draftsData.drafts || []);
    } catch (err: any) {
      console.error('Failed to load drafts:', err);
      toast.error('Failed to load drafts');
    } finally {
      setDraftsLoading(false);
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      setInsightsLoading(true);
      const startDate = dateRange.startDate.toISOString().split('T')[0];
      const endDate = dateRange.endDate.toISOString().split('T')[0];
      const insightsData = await apiService.getFeedbackInsights(startDate, endDate);
      setInsights(insightsData);
    } catch (err: any) {
      console.error('Failed to load insights:', err);
      toast.error('Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleTriggerLearningJob = async () => {
    try {
      setTriggeringJob(true);
      const result = await apiService.triggerLearningJob();

      if (result.success) {
        toast.success(
          `Learning job completed! Generated ${result.drafts_generated} new drafts.`
        );
        await loadDrafts();
      } else {
        toast.error('Learning job failed');
      }
    } catch (err: any) {
      console.error('Failed to trigger learning job:', err);
      toast.error(err.response?.data?.detail || 'Failed to trigger learning job');
    } finally {
      setTriggeringJob(false);
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    try {
      const result = await apiService.approveDraft(draftId, {
        status: 'approved',
        review_notes: 'Approved by admin',
      });

      if (result.published && result.document_id) {
        // Show success toast with document ID and navigation hint
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Draft approved and published!</span>
              <span className="text-sm text-slate-400">
                Document ID: {result.document_id.substring(0, 8)}...
              </span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Navigate to Documents page with draft_published filter
                  window.location.href = '/admin/documents';
                }}
                className="mt-1 px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded transition-colors"
              >
                View in Documents →
              </button>
            </div>
          ),
          {
            duration: 8000,
            icon: '✨',
          }
        );
      } else if (result.published) {
        toast.success('Draft approved and published to knowledge base!');
      } else {
        toast.success('Draft approved!');
      }

      await loadDrafts();
      setSelectedDraft(null);
    } catch (err: any) {
      console.error('Failed to approve draft:', err);
      toast.error('Failed to approve draft');
    }
  };

  const handleRejectDraft = async (draftId: string) => {
    try {
      await apiService.rejectDraft(draftId, {
        status: 'rejected',
        review_notes: 'Rejected by admin',
      });
      toast.success('Draft rejected');
      await loadDrafts();
      setSelectedDraft(null);
    } catch (err: any) {
      console.error('Failed to reject draft:', err);
      toast.error('Failed to reject draft');
    }
  };

  const handleSaveEdit = async (draftId: string) => {
    try {
      await apiService.updateDraft(draftId, {
        content: editContent,
        title: editTitle
      });
      toast.success('Draft updated!');
      await loadDrafts();
      setEditingDraft(null);
    } catch (err: any) {
      console.error('Failed to update draft:', err);
      toast.error('Failed to update draft');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      await apiService.deleteDraft(draftId);
      toast.success('Draft deleted');
      await loadDrafts();
      setSelectedDraft(null);
    } catch (err: any) {
      console.error('Failed to delete draft:', err);
      toast.error('Failed to delete draft');
    }
  };

  const handleGenerateDraft = async (pattern: any) => {
    try {
      setGeneratingDraft(true);
      setSelectedPattern(pattern);

      const result = await apiService.generateDraft({
        feedback_ids: pattern.feedback_ids,
        query_pattern: pattern.pattern,
        category: 'manual_generated',
        additional_context: `Manually generated from pattern with ${pattern.count} occurrences`
      });

      if (result.success) {
        toast.success('Draft generated successfully!');
        await loadDrafts();
        setSelectedPattern(null);
      } else {
        toast.error(result.message || 'Failed to generate draft');
      }
    } catch (err: any) {
      console.error('Failed to generate draft:', err);
      toast.error('Failed to generate draft');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const getDraftSourceBadge = (draft: DraftDocument) => {
    const category = draft.category || '';

    if (category === 'realtime_generated') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <Zap size={12} />
          Real-time
        </span>
      );
    } else if (category === 'auto_generated') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <CalendarClock size={12} />
          Weekly
        </span>
      );
    } else if (category === 'manual_generated') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Search size={12} />
          Manual
        </span>
      );
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-slate-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Brain className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Learning Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              AI-powered knowledge base improvements • Auto-learning from feedback
            </p>
          </div>
        </div>
        <button
          onClick={handleTriggerLearningJob}
          disabled={triggeringJob}
          className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
            triggeringJob
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 hover:scale-105'
          }`}
        >
          {triggeringJob ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play size={20} />
              <span>Run Learning Job</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-emerald-400" size={24} />
            <h3 className="text-lg font-semibold text-slate-100">Pending Drafts</h3>
          </div>
          <p className="text-3xl font-bold text-slate-50">{drafts.length}</p>
          <p className="text-sm text-slate-400 mt-1">awaiting review</p>
        </motion.div>

        <motion.div variants={staggerItem} className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-purple-400" size={24} />
            <h3 className="text-lg font-semibold text-slate-100">Real-time</h3>
          </div>
          <p className="text-3xl font-bold text-slate-50">
            {drafts.filter(d => d.category === 'realtime_generated').length}
          </p>
          <p className="text-sm text-slate-400 mt-1">from negative feedback</p>
        </motion.div>

        <motion.div variants={staggerItem} className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="text-blue-400" size={24} />
            <h3 className="text-lg font-semibold text-slate-100">Weekly</h3>
          </div>
          <p className="text-3xl font-bold text-slate-50">
            {drafts.filter(d => d.category === 'auto_generated').length}
          </p>
          <p className="text-sm text-slate-400 mt-1">from scheduled job</p>
        </motion.div>
      </motion.div>

      {/* Auto-Generated Drafts - PRIMARY SECTION */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-400" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-slate-50">Auto-Generated Drafts</h2>
              <p className="text-sm text-slate-300">
                AI-generated from feedback patterns • Auto-publish on approval
              </p>
            </div>
          </div>
          <button
            onClick={loadDrafts}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Refresh drafts"
          >
            <RefreshCw size={20} className="text-slate-400" />
          </button>
        </div>

        {draftsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Sparkles size={48} className="mx-auto mb-3 opacity-50" />
            <p>No pending drafts</p>
            <p className="text-sm mt-1">
              Drafts are auto-generated after every 5 negative feedbacks or weekly on Sunday 2 AM
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">{draft.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getDraftSourceBadge(draft)}
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(draft.status)}`}>
                        {draft.status}
                      </span>
                      {draft.feedback_count && (
                        <span className="text-xs text-slate-400">
                          {draft.feedback_count} feedback{draft.feedback_count > 1 ? 's' : ''}
                        </span>
                      )}
                      {draft.confidence_score && (
                        <span className="text-xs text-slate-400">
                          {(draft.confidence_score * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDraft(draft)}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                      title="View full draft"
                    >
                      <Eye size={18} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingDraft(draft.id);
                        setEditContent(draft.content);
                        setEditTitle(draft.title);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                      title="Edit draft"
                    >
                      <Edit size={18} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>

                {editingDraft === draft.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Draft title"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(draft.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingDraft(null)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 line-clamp-2">{draft.content}</p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleApproveDraft(draft.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => handleRejectDraft(draft.id)}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Analysis - SECONDARY SECTION (Collapsible) */}
      <div className="card p-6">
        <button
          onClick={() => {
            setShowAdvanced(!showAdvanced);
            if (!showAdvanced && !insights) {
              loadInsights();
            }
          }}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-slate-50">Advanced Analysis</h2>
              <p className="text-sm text-slate-300">
                Custom date range insights • Manual draft generation
              </p>
            </div>
          </div>
          {showAdvanced ? (
            <ChevronUp className="text-slate-400" size={24} />
          ) : (
            <ChevronDown className="text-slate-400" size={24} />
          )}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-slate-700 space-y-6">
                {/* Date Range Filters */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Date Range
                    </label>
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                  </div>
                  <button
                    onClick={loadInsights}
                    disabled={insightsLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {insightsLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Analyze
                      </>
                    )}
                  </button>
                </div>

                {/* Insights Summary */}
                {insights && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="text-red-400" size={20} />
                        <h3 className="text-sm font-semibold text-slate-100">Negative Feedback</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-50">{insights.total_negative_feedback || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        in selected period
                      </p>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="text-yellow-400" size={20} />
                        <h3 className="text-sm font-semibold text-slate-100">Patterns Found</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-50">{insights.patterns_identified || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {insights.patterns?.filter(p => p.priority === 'critical').length || 0} critical
                      </p>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="text-emerald-400" size={20} />
                        <h3 className="text-sm font-semibold text-slate-100">Actionable</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-50">
                        {insights.patterns?.filter(p => p.count >= 3).length || 0}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">patterns with 3+ occurrences</p>
                    </div>
                  </div>
                )}

                {/* Patterns List */}
                {insights && insights.patterns && insights.patterns.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Lightbulb className="text-yellow-400" size={20} />
                      Identified Patterns
                    </h3>
                    {insights.patterns.map((pattern, index) => (
                      <div
                        key={index}
                        className="bg-slate-800/30 border border-slate-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-100">{pattern.pattern}</h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(pattern.priority)}`}>
                                {pattern.priority}
                              </span>
                              <span className="text-xs text-slate-400">
                                {pattern.count} occurrence{pattern.count > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleGenerateDraft(pattern)}
                            disabled={generatingDraft && selectedPattern === pattern}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                          >
                            {generatingDraft && selectedPattern === pattern ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles size={16} />
                                Generate Draft
                              </>
                            )}
                          </button>
                        </div>

                        {/* Expandable Samples - Show query + feedback like Analytics */}
                        {pattern.samples && pattern.samples.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => setExpandedPatternId(expandedPatternId === index ? null : index)}
                              className="text-xs text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1"
                            >
                              {expandedPatternId === index ? (
                                <>
                                  <ChevronUp size={14} />
                                  Hide {pattern.samples.length} sample{pattern.samples.length > 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} />
                                  View {pattern.samples.length} sample{pattern.samples.length > 1 ? 's' : ''}
                                </>
                              )}
                            </button>
                            <AnimatePresence>
                              {expandedPatternId === index && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-2 space-y-2 overflow-hidden"
                                >
                                  {pattern.samples.map((sample: any, idx: number) => (
                                    <div key={idx} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-xs">
                                      <p className="text-slate-300 mb-1">
                                        <span className="font-semibold">Query:</span> {sample.query}
                                      </p>
                                      <p className="text-slate-400">
                                        <span className="font-semibold">Feedback:</span> {sample.comment || 'No comment provided'}
                                      </p>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {insightsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                  </div>
                )}

                {!insightsLoading && insights && (!insights.patterns || insights.patterns.length === 0) && (
                  <div className="text-center py-12 text-slate-400">
                    <Lightbulb size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No patterns found in the selected period</p>
                    <p className="text-sm mt-1">Try adjusting the date range</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draft Preview Modal */}
      <AnimatePresence>
        {selectedDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDraft(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-700 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100">{selectedDraft.title}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getDraftSourceBadge(selectedDraft)}
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(selectedDraft.status)}`}>
                      {selectedDraft.status}
                    </span>
                    {selectedDraft.query_pattern && (
                      <span className="text-xs text-slate-400">
                        Pattern: {selectedDraft.query_pattern}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-300">{selectedDraft.content}</div>
                </div>

                {selectedDraft.llm_model && (
                  <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400">
                      Generated by: {selectedDraft.llm_model} | Confidence:{' '}
                      {((selectedDraft.confidence_score || 0) * 100).toFixed(0)}% | Sources:{' '}
                      {selectedDraft.feedback_count} feedbacks
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-700 flex gap-3">
                <button
                  onClick={() => handleApproveDraft(selectedDraft.id)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Approve & Publish
                </button>
                <button
                  onClick={() => handleRejectDraft(selectedDraft.id)}
                  className="flex-1 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={20} />
                  Reject Draft
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
