import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Edit,
  Pencil,
  CheckCircle,
  XCircle,
  Key,
  Search,
  X,
  MoreVertical,
  Info,
  Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { CompanyUser, Role, InviteUserRequest } from '../../types';

const PREDEFINED_ROLES = [
  {
    code: 'owner',
    name: 'Owner',
    description: 'Full control over company',
    permissions: 17,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    code: 'admin',
    name: 'Admin',
    description: 'All except billing & role management',
    permissions: 15,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    code: 'editor',
    name: 'Editor',
    description: 'Create/edit content',
    permissions: 8,
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  {
    code: 'trainer',
    name: 'Trainer',
    description: 'Upload docs, edit bots',
    permissions: 5,
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  {
    code: 'analyst',
    name: 'Analyst',
    description: 'View analytics, export data',
    permissions: 5,
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  {
    code: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: 4,
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
];

export const TeamPage: React.FC = () => {
  const { userInfo, refreshUserInfo } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [showRoleDetailsModal, setShowRoleDetailsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<typeof PREDEFINED_ROLES[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Check if current user can edit/delete other users (Owner or Admin only)
  const canManageUsers = userInfo?.role === 'owner' || userInfo?.role === 'admin';

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      const usersList = Array.isArray(data) ? data : (data.users || []);
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      // Note: We'd need to add a getRoles API endpoint
      // For now, we'll use the predefined roles
      setRoles([]);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleInviteUser = async (data: InviteUserRequest) => {
    try {
      await apiService.createUser(data);
      await loadUsers();
      setShowInviteModal(false);
      toast.success('Team member invited successfully!');
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    }
  };

  const handleEditUser = (user: CompanyUser) => {
    setEditingUser(user);
    setShowEditModal(true);
    setOpenActionMenu(null);
  };

  const handleUpdateUser = async (userId: string, data: { first_name?: string; last_name?: string; role?: string; is_active?: boolean }) => {
    try {
      await apiService.updateUser(userId, data);
      await loadUsers();
      setShowEditModal(false);
      setEditingUser(null);
      toast.success('User updated successfully!');

      // If the updated user is the currently logged-in user, refresh user info to update the sidebar
      if (userInfo && userId === userInfo.userId) {
        await refreshUserInfo();
      }
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiService.updateUser(userId, { is_active: !currentStatus });
      await loadUsers();
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from your team?`)) return;

    try {
      await apiService.deleteUser(userId);
      await loadUsers();
      toast.success('Team member removed successfully!');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove team member');
    }
  };

  const getRoleInfo = (roleName?: string) => {
    const role = PREDEFINED_ROLES.find(r => r.code === roleName?.toLowerCase() || r.name.toLowerCase() === roleName?.toLowerCase());
    return role || PREDEFINED_ROLES[5]; // Default to viewer
  };

  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.email.toLowerCase().includes(query) &&
          !user.full_name?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (roleFilter !== 'all' && user.role?.toLowerCase() !== roleFilter) {
      return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !user.is_active) return false;
      if (statusFilter === 'inactive' && user.is_active) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Management</h1>
          <p className="text-slate-400 mt-1">
            Manage team members, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Total Members</div>
          <div className="text-2xl font-bold text-white mt-1">{users.length}</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Active Members</div>
          <div className="text-2xl font-bold text-white mt-1">
            {users.filter(u => u.is_active).length}
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Roles Used</div>
          <div className="text-2xl font-bold text-white mt-1">
            {new Set(users.map(u => u.role)).size}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            {PREDEFINED_ROLES.map(role => (
              <option key={role.code} value={role.code}>{role.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>


      {/* Users Table */}
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No members found'
                : 'No team members yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Invite your first team member to get started'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredUsers.map((user, index) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">
                          {user.first_name || <span className="text-slate-500">N/A</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">
                          {user.last_name || <span className="text-slate-500">N/A</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${roleInfo.color}`}>
                            <Shield className="w-3 h-3" />
                            {roleInfo.name}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedRole(roleInfo);
                              setShowRoleDetailsModal(true);
                            }}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                            title="View role permissions"
                          >
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManageUsers && (
                          <div className="relative" ref={openActionMenu === user.id ? actionMenuRef : null}>
                            <button
                              onClick={() => setOpenActionMenu(openActionMenu === user.id ? null : user.id)}
                              className="p-2 hover:bg-slate-600 rounded transition-colors"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                            <AnimatePresence>
                              {openActionMenu === user.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 mt-1 w-40 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10"
                                >
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors rounded-t-lg"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleToggleUserStatus(user.id, user.is_active);
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                                  >
                                    <Power className="w-4 h-4" />
                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteUser(user.id, user.email);
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600 transition-colors rounded-b-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInviteUser}
            roles={PREDEFINED_ROLES}
            currentUserRole={userInfo?.role || 'viewer'}
          />
        )}
        {showEditModal && editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
            onUpdate={handleUpdateUser}
            roles={PREDEFINED_ROLES}
            currentUserRole={userInfo?.role || 'viewer'}
          />
        )}
        {showRoleDetailsModal && selectedRole && (
          <RoleDetailsModal
            role={selectedRole}
            onClose={() => {
              setShowRoleDetailsModal(false);
              setSelectedRole(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Invite Modal Component
interface InviteModalProps {
  onClose: () => void;
  onInvite: (data: InviteUserRequest) => void;
  roles: typeof PREDEFINED_ROLES;
  currentUserRole: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ onClose, onInvite, roles, currentUserRole }) => {
  // Only owners can assign the owner role
  const availableRoles = currentUserRole === 'owner'
    ? roles
    : roles.filter(r => r.code !== 'owner');

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role_id: availableRoles[Math.min(2, availableRoles.length - 1)]?.code || 'editor', // Default to Editor
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Send first_name and last_name separately to backend
      const inviteData: InviteUserRequest = {
        email: formData.email,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        role_id: formData.role_id,
        password: formData.password,
      };
      await onInvite(inviteData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="member@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Role *
            </label>
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <div
                  key={role.code}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.role_id === role.code
                      ? 'border-blue-500 bg-slate-800'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                  }`}
                  onClick={() => setFormData({ ...formData, role_id: role.code })}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.role_id === role.code
                          ? 'border-blue-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {formData.role_id === role.code && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${role.color}`}>
                      <Shield className="w-3 h-3" />
                      {role.name}
                    </span>
                    <span className="text-xs text-slate-400">{role.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRoleInfo(showRoleInfo === role.code ? null : role.code);
                    }}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="View permissions"
                  >
                    <Info className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                  </button>
                </div>
              ))}
            </div>
            <AnimatePresence>
              {showRoleInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-3 bg-slate-700 rounded-lg border border-slate-600"
                >
                  <div className="text-sm text-slate-300">
                    <span className="font-medium text-white">
                      {availableRoles.find(r => r.code === showRoleInfo)?.name} permissions:
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {availableRoles.find(r => r.code === showRoleInfo)?.permissions} permissions including{' '}
                      {showRoleInfo === 'owner' && 'full control over company, billing, and roles'}
                      {showRoleInfo === 'admin' && 'all except billing & role management'}
                      {showRoleInfo === 'editor' && 'create/edit content and chatbots'}
                      {showRoleInfo === 'trainer' && 'upload docs and edit bots'}
                      {showRoleInfo === 'analyst' && 'view analytics and export data'}
                      {showRoleInfo === 'viewer' && 'read-only access to all resources'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Temporary Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              placeholder="Min. 8 characters"
            />
            <p className="text-xs text-slate-400 mt-1">
              User will be prompted to change on first login
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Edit User Modal Component
interface EditUserModalProps {
  user: CompanyUser;
  onClose: () => void;
  onUpdate: (userId: string, data: { first_name?: string; last_name?: string; role?: string; is_active?: boolean }) => void;
  roles: typeof PREDEFINED_ROLES;
  currentUserRole: string;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdate, roles, currentUserRole }) => {
  const { userInfo } = useAuth();
  const isEditingSelf = userInfo?.userId === user.id;
  const isEditingOwner = user.role === 'owner';

  // Determine which roles are available based on current user's role
  const availableRoles = currentUserRole === 'owner'
    ? roles  // Owners see all roles
    : currentUserRole === 'admin'
    ? roles.filter(r => r.code !== 'owner')  // Admins see all except owner
    : [];  // Others see no roles (shouldn't reach here)

  const [formData, setFormData] = useState({
    first_name: user.first_name || user.full_name?.split(' ')[0] || '',
    last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
    role: user.role || 'viewer',
    is_active: user.is_active,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpdate(user.id, formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Edit Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-slate-400 mb-4">
            <Mail className="w-4 h-4 inline mr-2" />
            {user.email}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Role
              {isEditingSelf && (
                <span className="ml-2 text-xs text-amber-400">(You cannot change your own role)</span>
              )}
              {!isEditingSelf && isEditingOwner && currentUserRole !== 'owner' && (
                <span className="ml-2 text-xs text-amber-400">(Only owners can change owner's role)</span>
              )}
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableRoles.map((role) => {
                // Disable role selection if:
                // 1. User is editing themselves
                // 2. Admin trying to edit owner's role
                const isDisabled = isEditingSelf || (isEditingOwner && currentUserRole !== 'owner');

                return (
                  <div
                    key={role.code}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    } ${
                      formData.role === role.code
                        ? 'border-blue-500 bg-slate-800'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    }`}
                    onClick={() => !isDisabled && setFormData({ ...formData, role: role.code })}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.role === role.code
                          ? 'border-blue-500'
                          : 'border-slate-500'
                      }`}
                    >
                      {formData.role === role.code && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium ${role.color}`}>
                      <Shield className="w-3 h-3" />
                      {role.name}
                    </span>
                    <span className="text-xs text-slate-400">{role.description}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Role Details Modal Component
interface RoleDetailsModalProps {
  role: typeof PREDEFINED_ROLES[0];
  onClose: () => void;
}

const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({ role, onClose }) => {
  const PERMISSION_DETAILS: Record<string, string[]> = {
    owner: [
      'view_documents', 'upload_documents', 'delete_documents',
      'view_chatbots', 'create_chatbots', 'edit_chatbots', 'delete_chatbots', 'deploy_chatbots',
      'view_analytics', 'export_data',
      'view_team', 'invite_members', 'edit_members', 'remove_members',
      'edit_company', 'manage_billing', 'manage_roles',
    ],
    admin: [
      'view_documents', 'upload_documents', 'delete_documents',
      'view_chatbots', 'create_chatbots', 'edit_chatbots', 'delete_chatbots', 'deploy_chatbots',
      'view_analytics', 'export_data',
      'view_team', 'invite_members', 'edit_members', 'remove_members',
      'edit_company',
    ],
    editor: [
      'view_documents', 'upload_documents',
      'view_chatbots', 'create_chatbots', 'edit_chatbots',
      'view_analytics',
      'view_team',
    ],
    trainer: [
      'view_documents', 'upload_documents',
      'view_chatbots', 'edit_chatbots',
      'view_team',
    ],
    analyst: [
      'view_documents',
      'view_chatbots',
      'view_analytics', 'export_data',
      'view_team',
    ],
    viewer: [
      'view_documents',
      'view_chatbots',
      'view_analytics',
      'view_team',
    ],
  };

  const permissions = PERMISSION_DETAILS[role.code] || [];

  const getCategoryColor = (permission: string) => {
    if (permission.includes('document')) return 'text-green-400';
    if (permission.includes('chatbot')) return 'text-blue-400';
    if (permission.includes('analytics')) return 'text-purple-400';
    if (permission.includes('team') || permission.includes('member')) return 'text-yellow-400';
    if (permission.includes('company') || permission.includes('billing') || permission.includes('role')) return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{role.name} Role</h2>
            <p className="text-sm text-slate-400 mt-1">{role.description}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Key className="w-4 h-4" />
            <span className="font-medium">{role.permissions} Permissions</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-300 mb-2">Allowed Actions:</div>
          {permissions.map((permission) => (
            <div
              key={permission}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded border border-slate-700"
            >
              <CheckCircle className={`w-4 h-4 ${getCategoryColor(permission)}`} />
              <span className="text-sm text-slate-300">
                {permission.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
