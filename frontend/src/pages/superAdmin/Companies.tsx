import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, MessageSquare, TrendingUp, Search, Filter, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  website?: string;
  logo_url?: string;
  industry?: string;
  company_size?: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  stats?: {
    total_bots: number;
    active_bots: number;
    total_documents: number;
    total_conversations: number;
    total_messages: number;
    avg_satisfaction: number | null;
  };
}

export const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await apiService.api.get('/api/v1/super-admin/companies');
      setCompanies(response.data.companies || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast.error(error.response?.data?.detail || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || company.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const getPlanBadgeColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'free':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'pro':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Companies</h1>
          <p className="text-slate-400">Manage all companies on the platform</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Companies</p>
              <p className="text-2xl font-bold text-white">{companies.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-2xl font-bold text-white">
                {companies.filter(c => c.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Chatbots</p>
              <p className="text-2xl font-bold text-white">
                {companies.reduce((sum, c) => sum + (c.stats?.total_bots || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Messages</p>
              <p className="text-2xl font-bold text-white">
                {companies.reduce((sum, c) => sum + (c.stats?.total_messages || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No companies found</h3>
          <p className="text-slate-400">
            {searchTerm || filterPlan !== 'all'
              ? 'Try adjusting your filters'
              : 'No companies have been registered yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-red-500/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Company Logo/Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">
                        {company.name}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlanBadgeColor(company.plan)}`}>
                        {company.plan.charAt(0).toUpperCase() + company.plan.slice(1)}
                      </span>
                      {!company.is_active && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                      {company.website && (
                        <span>{company.website}</span>
                      )}
                      {company.industry && (
                        <span>• {company.industry}</span>
                      )}
                      {company.company_size && (
                        <span>• {company.company_size} employees</span>
                      )}
                    </div>

                    {/* Stats */}
                    {company.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Chatbots</p>
                          <p className="text-sm font-medium text-white">
                            {company.stats.active_bots}/{company.stats.total_bots}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Documents</p>
                          <p className="text-sm font-medium text-white">{company.stats.total_documents}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Conversations</p>
                          <p className="text-sm font-medium text-white">{company.stats.total_conversations}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Messages</p>
                          <p className="text-sm font-medium text-white">{company.stats.total_messages.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Satisfaction</p>
                          <p className="text-sm font-medium text-white">
                            {company.stats.avg_satisfaction
                              ? `${(company.stats.avg_satisfaction * 100).toFixed(0)}%`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow Icon */}
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-red-400 transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
