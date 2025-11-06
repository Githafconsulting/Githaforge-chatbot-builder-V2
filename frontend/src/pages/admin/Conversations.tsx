import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, Star, User, Bot, ThumbsUp, ThumbsDown, MessageCircle, Hash, Calendar, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Conversation, ConversationMessage } from '../../types';
import { staggerContainer, staggerItem } from '../../utils/animations';

export const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('Loading conversations...');
      const data = await apiService.getConversations();
      console.log('Conversations loaded:', data);
      // Handle both array and object responses
      const conversationsList = Array.isArray(data) ? data : (data.conversations || []);
      setConversations(conversationsList);
      setError('');
    } catch (err: any) {
      console.error('Conversations error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      const data = await apiService.getConversation(id);
      setSelectedConversation(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load conversation details');
    }
  };

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent conversation selection

    if (!confirm('Are you sure you want to soft delete this conversation? It and all related messages/feedback can be recovered from the Deleted Items page within 30 days.')) return;

    try {
      setProcessingId(conversationId);
      await apiService.softDeleteConversation(conversationId);

      // Clear selected conversation if it was deleted
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      await loadConversations();
      alert('Conversation soft-deleted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete conversation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem} className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
          <MessageSquare className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Conversations</h1>
          <p className="text-slate-400 text-sm mt-0.5">View all customer interactions</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-soft"
          >
            <AlertCircle size={20} />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-primary-50 to-secondary-50 flex-shrink-0">
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
              <MessageSquare size={24} className="text-primary-600" />
              All Conversations
              {!loading && (
                <span className="ml-2 text-slate-300 font-medium">
                  ({conversations.length})
                </span>
              )}
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
                />
                <p className="text-slate-300">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center mx-auto mb-4"
                >
                  <MessageSquare size={40} className="text-primary-600" />
                </motion.div>
                <p className="text-slate-300 text-lg">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => loadConversationDetails(conv.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedConversation?.id === conv.id
                      ? 'bg-gradient-to-r from-blue-900/60 to-cyan-900/60 border-2 border-blue-400 rounded-lg shadow-lg shadow-blue-400/40'
                      : 'hover:bg-slate-700'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Conversation Number */}
                    <motion.div
                      animate={selectedConversation?.id === conv.id ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 0.5 }}
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                        selectedConversation?.id === conv.id
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {conversations.length - index}
                    </motion.div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                          <Hash size={16} className="text-white" />
                        </div>
                        <span className="font-medium text-slate-50 text-sm font-mono">
                          {conv.session_id.substring(0, 12)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(conv.created_at).toLocaleDateString()}
                        </span>
                        {conv.message_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} />
                            {conv.message_count} msgs
                          </span>
                        )}
                        {conv.avg_rating !== null && conv.avg_rating !== undefined && (
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            {(conv.avg_rating * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 flex-shrink-0">
                      <motion.button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        disabled={processingId === conv.id}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete conversation"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {processingId === conv.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Conversation Details */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-secondary-50 to-primary-50 flex-shrink-0">
            <h2 className="text-xl font-semibold text-slate-50 flex items-center gap-2">
              <Bot size={24} className="text-secondary-600" />
              Conversation Details
            </h2>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {!selectedConversation ? (
              <div className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center mx-auto mb-4"
                >
                  <MessageSquare size={40} className="text-slate-500" />
                </motion.div>
                <p className="text-slate-400">Select a conversation to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Conversation Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 rounded-xl shadow-lg shadow-blue-500/30"
                >
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <span className="text-white/90 font-medium flex items-center gap-1">
                        <Hash size={14} />
                        Session ID:
                      </span>
                      <p className="font-mono text-xs mt-1 text-white">{selectedConversation.session_id}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-white/90 font-medium flex items-center gap-1">
                          <Clock size={14} />
                          Started:
                        </span>
                        <p className="mt-1 text-white">{new Date(selectedConversation.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-white/90 font-medium flex items-center gap-1">
                          <Clock size={14} />
                          Ended:
                        </span>
                        <p className="mt-1 text-white">
                          {(() => {
                            // If ended_at exists, use it
                            if (selectedConversation.ended_at) {
                              return new Date(selectedConversation.ended_at).toLocaleString();
                            }

                            // Otherwise, check if conversation is recent (within 30 minutes)
                            const lastMessageTime = new Date(selectedConversation.last_message_at).getTime();
                            const now = Date.now();
                            const thirtyMinutesInMs = 30 * 60 * 1000;

                            if (now - lastMessageTime < thirtyMinutesInMs) {
                              // Recent conversation - likely still active
                              return <span className="text-green-300 font-semibold">Still Active</span>;
                            } else {
                              // Old conversation - assume it ended at last message time
                              return <span className="text-slate-300">{new Date(selectedConversation.last_message_at).toLocaleString()}</span>;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Messages */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {selectedConversation.messages?.map((msg: ConversationMessage, index: number) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        {msg.role === 'user' ? (
                          /* User Message */
                          <div className="flex justify-end gap-2">
                            <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl rounded-tr-sm py-3 px-4 max-w-[80%] shadow-soft">
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-white" />
                            </div>
                          </div>
                        ) : (
                          /* Assistant Message */
                          <div className="flex justify-start gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center flex-shrink-0">
                              <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-slate-700 rounded-2xl rounded-tl-sm py-3 px-4 max-w-[80%] border border-slate-600">
                              <p className="text-sm text-white">{msg.content}</p>

                              {/* Context Used */}
                              {msg.context_used && Object.keys(msg.context_used).length > 0 && (
                                <details className="mt-2 pt-2 border-t border-slate-600">
                                  <summary className="text-xs text-primary-400 cursor-pointer hover:text-primary-300">
                                    View context sources
                                  </summary>
                                  <div className="mt-2 text-xs text-slate-300">
                                    {JSON.stringify(msg.context_used, null, 2)}
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                        )}

                        <div className={`text-xs text-slate-400 flex items-center gap-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start ml-10'}`}>
                          <Clock size={10} />
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
