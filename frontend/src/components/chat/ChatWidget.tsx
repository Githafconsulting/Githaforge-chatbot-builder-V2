import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast, { Toaster } from 'react-hot-toast';
import { apiService } from '../../services/api';
import { getSessionId } from '../../utils/session';
import { slideInRight, fadeInUp } from '../../utils/animations';
import type { ChatMessage, Source } from '../../types';

interface ChatWidgetProps {
  adminMode?: boolean; // Show sources and feedback for internal testing
  embedMode?: boolean; // When true, auto-opens chat and hides toggle button (for iframe embed)
  titleOverride?: string; // Override title from widget settings (for live preview)
  subtitleOverride?: string; // Override subtitle from widget settings (for live preview)
  greetingOverride?: string; // Override greeting from widget settings (for live preview)
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  adminMode = false,
  embedMode = false,
  titleOverride,
  subtitleOverride,
  greetingOverride
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(embedMode); // Auto-open if embedMode
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(getSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentingMessageId, setCommentingMessageId] = useState<string | undefined>(undefined);

  // Track messages that received negative feedback (to show "Leave feedback" button)
  const [negativeRatedMessages, setNegativeRatedMessages] = useState<Set<string>>(new Set());

  // Dynamic content overrides (can be updated via postMessage for live preview)
  const [title, setTitle] = useState(titleOverride || '');
  const [subtitle, setSubtitle] = useState(subtitleOverride || '');
  const [greeting, setGreeting] = useState(greetingOverride || '');

  // Listen for postMessage updates (for live preview)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'updateChatContent') {
        if (event.data.title !== undefined) setTitle(event.data.title);
        if (event.data.subtitle !== undefined) setSubtitle(event.data.subtitle);
        if (event.data.greeting !== undefined) setGreeting(event.data.greeting);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update local state when props change
  useEffect(() => {
    if (titleOverride !== undefined) setTitle(titleOverride);
    if (subtitleOverride !== undefined) setSubtitle(subtitleOverride);
    if (greetingOverride !== undefined) setGreeting(greetingOverride);
  }, [titleOverride, subtitleOverride, greetingOverride]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // End conversation when component unmounts or window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only end conversation if there are messages (conversation actually started)
      if (messages.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({ session_id: sessionId });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`${import.meta.env.VITE_API_BASE_URL}/api/v1/conversations/end`, blob);
      }
    };

    // Handle window close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also end conversation when component unmounts (e.g., when chat widget closes)
      if (messages.length > 0) {
        apiService.endConversation(sessionId).catch(() => {
          // Silently fail - conversation ending is best-effort
        });
      }
    };
  }, [sessionId, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      message: input,
      session_id: sessionId,
      is_user: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiService.sendMessage(input, sessionId);

      const botMessage: ChatMessage = {
        message: input,
        response: response.response,
        session_id: sessionId,
        is_user: false,
        timestamp: new Date().toISOString(),
        sources: response.sources,
        id: response.message_id,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        message: input,
        response: t('chat.errorMessage'),
        session_id: sessionId,
        is_user: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId: string | undefined, rating: number) => {
    if (!messageId) return;

    // For thumbs down (rating=0), mark message and show "Leave feedback" button
    if (rating === 0) {
      setNegativeRatedMessages((prev) => new Set(prev).add(messageId));
      // Don't remove msg.id - keep it so we can show "Leave feedback" button
      return;
    }

    // For thumbs up (rating=1), submit immediately
    try {
      await apiService.submitFeedback({ message_id: messageId, rating });
      // Remove msg.id after successful submission
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, id: undefined } : msg
        )
      );

      // Show thank you toast
      toast.success(t('chat.feedbackThankYou'), {
        duration: 3000,
        position: 'bottom-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #334155',
        },
        icon: '👍',
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error(t('chat.feedbackError'), {
        duration: 3000,
        position: 'bottom-center',
      });
    }
  };

  const openFeedbackModal = (messageId: string) => {
    setCommentingMessageId(messageId);
    setShowCommentModal(true);
  };

  const submitFeedbackWithComment = async () => {
    if (!commentingMessageId) return;

    try {
      await apiService.submitFeedback({
        message_id: commentingMessageId,
        rating: 0,
        comment: commentText.trim() || undefined, // Send comment if provided
      });

      // Remove from negativeRatedMessages set
      setNegativeRatedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commentingMessageId);
        return newSet;
      });

      // Remove msg.id after successful submission
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === commentingMessageId ? { ...msg, id: undefined } : msg
        )
      );

      // Close modal and reset state
      setShowCommentModal(false);
      setCommentText('');
      setCommentingMessageId(undefined);

      // Show thank you toast
      toast.success(t('chat.feedbackThankYouDetailed'), {
        duration: 4000,
        position: 'bottom-center',
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid #334155',
        },
        icon: '🙏',
      });
    } catch (error) {
      console.error('Failed to submit feedback with comment:', error);
      toast.error(t('chat.feedbackError'), {
        duration: 3000,
        position: 'bottom-center',
      });
    }
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setCommentText('');
    setCommentingMessageId(undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <Toaster />

      {/* Chat Toggle Button - Hidden in embedMode since outer button handles toggling */}
      {!embedMode && (
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              data-chat-toggle
              onClick={() => setIsOpen(true)}
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-br from-primary-600 to-secondary-600 text-white rounded-full p-3 sm:p-4 shadow-strong hover:shadow-xl transition-all z-50 no-print"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <MessageCircle size={24} />
              </motion.div>

              {/* Notification Badge */}
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={embedMode
              ? "w-full h-full bg-slate-800 flex flex-col border border-slate-700 overflow-hidden"
              : "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[calc(100vh-2rem)] sm:h-[600px] max-h-[700px] bg-slate-800 rounded-2xl shadow-strong flex flex-col z-50 no-print border border-slate-700"
            }
            variants={embedMode ? undefined : slideInRight}
            initial={embedMode ? undefined : "hidden"}
            animate={embedMode ? undefined : "visible"}
            exit={embedMode ? undefined : "exit"}
          >
            {/* Header */}
            <motion.div
              className={`bg-gradient-to-br from-primary-600 to-secondary-600 text-white p-4 sm:p-5 flex justify-between items-center ${!embedMode ? 'rounded-t-2xl' : ''}`}
              initial={embedMode ? undefined : { opacity: 0, y: -20 }}
              animate={embedMode ? undefined : { opacity: 1, y: 0 }}
              transition={embedMode ? undefined : { delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={20} />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg">
                    {title || t('chat.title')}
                  </h3>
                  <p className="text-xs text-blue-100">
                    {subtitle || t('chat.subtitle')}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => {
                  if (embedMode) {
                    // In embed mode, notify parent window to close iframe
                    if (window.parent !== window) {
                      window.parent.postMessage({ type: 'closeChat' }, '*');
                    }
                  } else {
                    // In normal mode, just close the widget
                    setIsOpen(false);
                  }
                }}
                className="hover:bg-white/20 rounded-lg p-2 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-900/50">
              <AnimatePresence mode="popLayout">
                {messages.length === 0 && (
                  <motion.div
                    className="text-center text-slate-300 mt-8"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <MessageCircle size={48} className="mx-auto mb-3 text-primary-400" />
                    </motion.div>
                    <p className="text-sm sm:text-base font-medium text-white">
                      {greeting || t('chat.greeting')}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">{t('chat.askAnything')}</p>
                  </motion.div>
                )}

                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    {msg.is_user ? (
                      <div className="flex justify-end">
                        <motion.div
                          className="bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl rounded-tr-sm py-2.5 px-4 max-w-[85%] sm:max-w-[80%] shadow-md"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <p className="text-sm sm:text-base">{msg.message}</p>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start">
                        <motion.div
                          className="bg-slate-700 rounded-2xl rounded-tl-sm py-2.5 px-4 max-w-[85%] sm:max-w-[80%] shadow-md border border-slate-600"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <p className="text-sm sm:text-base text-white">{msg.response}</p>
                        </motion.div>

                        {/* Sources (only visible in admin mode) */}
                        {adminMode && msg.sources && msg.sources.length > 0 && (
                          <motion.div
                            className="mt-2 text-xs text-slate-300"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            <details className="cursor-pointer bg-slate-700 rounded-lg p-2 border border-slate-600">
                              <summary className="font-medium text-primary-400 hover:text-primary-300">
                                📚 {t('chat.viewSources')} ({msg.sources.length})
                              </summary>
                              <div className="mt-2 space-y-1 pl-2">
                                {msg.sources.map((source: Source, sidx: number) => (
                                  <div key={sidx} className="text-slate-300 border-l-2 border-primary-400 pl-2">
                                    • {source.content.substring(0, 60)}...
                                    {adminMode && (
                                      <span className="ml-2 text-green-400 font-mono">
                                        ({(source.similarity * 100).toFixed(1)}% match)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </motion.div>
                        )}

                        {/* Feedback - Show thumbs up/down if not yet rated negative */}
                        {msg.id && !negativeRatedMessages.has(msg.id) && (
                          <motion.div
                            className="flex gap-2 mt-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <motion.button
                              onClick={() => handleFeedback(msg.id, 1)}
                              className="text-slate-400 hover:text-green-400 transition-colors p-1.5 hover:bg-green-900/30 rounded"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              title={t('chat.helpful')}
                            >
                              <ThumbsUp size={14} />
                            </motion.button>
                            <motion.button
                              onClick={() => handleFeedback(msg.id, 0)}
                              className="text-slate-400 hover:text-red-400 transition-colors p-1.5 hover:bg-red-900/30 rounded"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              title={t('chat.notHelpful')}
                            >
                              <ThumbsDown size={14} />
                            </motion.button>
                          </motion.div>
                        )}

                        {/* "Leave feedback" button - Show after negative rating */}
                        {msg.id && negativeRatedMessages.has(msg.id) && (
                          <motion.button
                            onClick={() => openFeedbackModal(msg.id!)}
                            className="mt-2 text-xs font-medium text-orange-400 hover:text-orange-300 bg-orange-900/20 hover:bg-orange-900/30 px-3 py-1.5 rounded-lg border border-orange-700/50 transition-all"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            💬 Leave feedback
                          </motion.button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="bg-slate-700 rounded-2xl py-3 px-4 shadow-md border border-slate-600">
                      <div className="flex space-x-2">
                        <motion.div
                          className="w-2 h-2 bg-primary-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-primary-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-primary-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <motion.div
              className={`border-t border-slate-700 p-3 sm:p-4 bg-slate-800 ${!embedMode ? 'rounded-b-2xl' : ''}`}
              initial={embedMode ? undefined : { opacity: 0, y: 20 }}
              animate={embedMode ? undefined : { opacity: 1, y: 0 }}
              transition={embedMode ? undefined : { delay: 0.2 }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.placeholder')}
                  disabled={loading}
                  className="flex-1 text-sm sm:text-base py-2.5 sm:py-3 px-4 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-600 disabled:cursor-not-allowed"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="btn-primary px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl"
                  whileHover={{ scale: loading || !input.trim() ? 1 : 1.05 }}
                  whileTap={{ scale: loading || !input.trim() ? 1 : 0.95 }}
                >
                  <Send size={18} className="sm:w-5 sm:h-5" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Modal */}
      <AnimatePresence>
        {showCommentModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] no-print"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCommentModal}
            />

            {/* Modal - Responsive to iframe constraints */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[min(500px,calc(100vw-2rem))] bg-slate-800 rounded-2xl shadow-strong border border-slate-700 z-[70] no-print"
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-4 sm:p-5 rounded-t-2xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ThumbsDown size={24} />
                  <div>
                    <h3 className="font-semibold text-lg">{t('chat.feedbackModal.title')}</h3>
                    <p className="text-xs text-red-100">{t('chat.feedbackModal.subtitle')}</p>
                  </div>
                </div>
                <motion.button
                  onClick={closeCommentModal}
                  className="hover:bg-white/20 rounded-lg p-2 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('chat.feedbackModal.label')}
                  <span className="text-slate-500 ml-1">({t('chat.feedbackModal.optional')})</span>
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('chat.feedbackModal.placeholder')}
                  maxLength={500}
                  rows={4}
                  className="w-full py-3 px-4 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-2">
                  {commentText.length}/500 {t('chat.feedbackModal.characters')}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 pt-0 flex gap-3">
                <motion.button
                  onClick={closeCommentModal}
                  className="flex-1 py-2.5 px-4 border border-slate-600 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('chat.feedbackModal.cancel')}
                </motion.button>
                <motion.button
                  onClick={submitFeedbackWithComment}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('chat.feedbackModal.submit')}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
