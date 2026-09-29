import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  FileText,
  UserX,
  UserCheck,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminService } from '../services/adminService';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function AdminView({ onNavigateToProfile }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  // Active Admin Tab: 'overview' | 'users' | 'posts' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Stats State
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // User Management State
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selected user for details modal
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // Post Moderation State
  const [recentPosts, setRecentPosts] = useState([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Action Modals State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'BLOCK_USER' | 'UNBLOCK_USER' | 'DELETE_POST'
    targetId: null,
    targetName: '',
    reason: '',
    isProcessing: false
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Load Overview Stats
  const loadDashboardStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await adminService.getDashboardStats();
      setStatsData(res);
      setRecentPosts(res.recentPosts || []);
    } catch (err) {
      showNotification(err.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 2. Load Users with Search & Pagination
  const loadUsers = useCallback(
    async (page = 1) => {
      try {
        setLoadingUsers(true);
        const res = await adminService.getUsers({
          page,
          limit: 15,
          search: userSearch,
          status: userStatusFilter,
          role: userRoleFilter
        });
        setUsers(res.users);
        setUserPagination(res.pagination);
      } catch (err) {
        showNotification(err.message || 'Failed to fetch users', 'error');
      } finally {
        setLoadingUsers(false);
      }
    },
    [userSearch, userStatusFilter, userRoleFilter]
  );

  // 3. Load Audit Logs
  const loadAuditLogs = useCallback(async (page = 1) => {
    try {
      setLoadingAudit(true);
      const res = await adminService.getAuditActions({ page, limit: 20 });
      setAuditLogs(res.actions);
      setAuditPagination(res.pagination);
    } catch (err) {
      showNotification(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      if (activeTab === 'overview') loadDashboardStats();
      if (activeTab === 'users') loadUsers(1);
      if (activeTab === 'posts') loadDashboardStats();
      if (activeTab === 'audit') loadAuditLogs(1);
    }
  }, [activeTab, user?.role, loadDashboardStats, loadUsers, loadAuditLogs]);

  // Open User Details
  const handleOpenUserDetails = async (userId) => {
    try {
      setLoadingUserDetails(true);
      const details = await adminService.getUserById(userId);
      setSelectedUserDetails(details);
    } catch (err) {
      showNotification(err.message || 'Could not load user details', 'error');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Confirm Modal Handler
  const handleExecuteAdminAction = async () => {
    const { type, targetId, reason } = actionModal;
    if (!targetId || !type) return;

    setActionModal((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (type === 'BLOCK_USER') {
        await adminService.blockUser(targetId, reason || 'Violating community guidelines');
        showNotification(`User successfully blocked`, 'success');
        loadUsers(userPagination.page);
        loadDashboardStats();
      } else if (type === 'UNBLOCK_USER') {
        await adminService.unblockUser(targetId, reason || 'Account restored by administrator');
        showNotification(`User successfully unblocked`, 'success');
        loadUsers(userPagination.page);
        loadDashboardStats();
      } else if (type === 'DELETE_POST') {
        await adminService.deleteHarmfulPost(targetId, reason || 'Violating content guidelines');
        showNotification(`Harmful post and media successfully removed`, 'success');
        loadDashboardStats();
      }

      setActionModal({ isOpen: false, type: null, targetId: null, targetName: '', reason: '', isProcessing: false });
    } catch (err) {
      showNotification(err.message || 'Action failed', 'error');
      setActionModal((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // Access Denied if not ADMIN
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          You must have <strong className="text-rose-400">role = ADMIN</strong> to view this module. Backend role-based authorization enforces security on every admin API request.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
            notification.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
          }`}
        >
          {notification.type === 'error' ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Admin Module Header */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">SocialX Admin Console</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  R.9 Admin Module
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Role-based moderation, user management, and harmful content oversight.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'overview') loadDashboardStats();
                if (activeTab === 'users') loadUsers(userPagination.page);
                if (activeTab === 'audit') loadAuditLogs(auditPagination.page);
              }}
              className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                isDark ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.06]">
          {[
            { id: 'overview', label: 'Overview & Analytics', icon: Activity },
            { id: 'users', label: 'Manage Users', icon: Users },
            { id: 'posts', label: 'Post Moderation', icon: FileText },
            { id: 'audit', label: 'Audit Trail', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-white text-slate-950 shadow-md shadow-white/10'
                      : 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & ANALYTICS                             */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stat Cards */}
          {loadingStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-28 rounded-3xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 block mb-1">Total Users</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {statsData?.stats?.totalUsers || 0}
                </span>
                <span className="text-[11px] text-indigo-400 block mt-1 font-medium">Registered Accounts</span>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 block mb-1">Active Accounts</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-500">
                  {statsData?.stats?.activeUsers || 0}
                </span>
                <span className="text-[11px] text-emerald-400/80 block mt-1 font-medium">In Good Standing</span>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 block mb-1">Blocked Users</span>
                <span className="text-2xl sm:text-3xl font-black text-rose-500">
                  {statsData?.stats?.blockedUsers || 0}
                </span>
                <span className="text-[11px] text-rose-400/80 block mt-1 font-medium">Suspended Accounts</span>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 block mb-1">Total Posts</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-500">
                  {statsData?.stats?.totalPosts || 0}
                </span>
                <span className="text-[11px] text-amber-400/80 block mt-1 font-medium">Published Social Posts</span>
              </div>
            </div>
          )}

          {/* Recent Registrations & Moderation Feed Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Registered Users */}
            <div
              className={`p-5 rounded-3xl border ${
                isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Recent User Registrations</span>
                </h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-indigo-400 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>

              {loadingStats ? (
                <LoadingSkeleton count={3} />
              ) : statsData?.recentUsers?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No users found.</p>
              ) : (
                <div className="space-y-3">
                  {statsData?.recentUsers?.map((u) => (
                    <div
                      key={u._id}
                      className={`p-3 rounded-2xl flex items-center justify-between border ${
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                u.role === 'ADMIN'
                                  ? 'bg-rose-500/15 text-rose-400'
                                  : 'bg-indigo-500/10 text-indigo-400'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">@{u.username}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.accountStatus === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {u.accountStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Moderation Activity */}
            <div
              className={`p-5 rounded-3xl border ${
                isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span>Recent Moderation Actions</span>
                </h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs text-indigo-400 hover:underline font-semibold"
                >
                  Full Log
                </button>
              </div>

              {loadingStats ? (
                <LoadingSkeleton count={3} />
              ) : statsData?.recentActions?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No moderation activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {statsData?.recentActions?.map((act) => (
                    <div
                      key={act._id}
                      className={`p-3 rounded-2xl flex items-center justify-between border ${
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              act.actionType === 'BLOCK_USER'
                                ? 'bg-rose-500/20 text-rose-400'
                                : act.actionType === 'UNBLOCK_USER'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {act.actionType}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            by @{act.admin?.username || 'admin'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 truncate">
                          {act.description}
                        </p>
                      </div>

                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MANAGE USERS TABLE                                */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div
            className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div
                className={`relative flex-1 flex items-center rounded-2xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <Search className="w-4 h-4 ml-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, username, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers(1)}
                  className="w-full py-2 pl-2.5 pr-4 text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={() => loadUsers(1)}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Search
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setTimeout(() => loadUsers(1), 50);
                }}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border outline-none cursor-pointer ${
                  isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="">Status: All</option>
                <option value="ACTIVE">Active Only</option>
                <option value="BLOCKED">Blocked Only</option>
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setTimeout(() => loadUsers(1), 50);
                }}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border outline-none cursor-pointer ${
                  isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="">Role: All</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {/* User Table (Desktop) / Cards (Mobile) */}
          {loadingUsers ? (
            <LoadingSkeleton count={4} />
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="No user accounts match the search or filter criteria."
              actionText="Reset Filters"
              onAction={() => {
                setUserSearch('');
                setUserStatusFilter('');
                setUserRoleFilter('');
                setTimeout(() => loadUsers(1), 50);
              }}
            />
          ) : (
            <div
              className={`rounded-3xl border overflow-hidden ${
                isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-400">User Profile</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Email</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Role</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Status</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Joined</th>
                      <th className="py-3 px-4 font-bold text-slate-400 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                              <span className="text-[11px] text-slate-400">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                              u.accountStatus === 'BLOCKED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {u.accountStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenUserDetails(u._id)}
                              className={`p-1.5 rounded-xl border text-[11px] font-semibold transition-colors ${
                                isDark
                                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {u.accountStatus === 'ACTIVE' ? (
                              <button
                                onClick={() =>
                                  setActionModal({
                                    isOpen: true,
                                    type: 'BLOCK_USER',
                                    targetId: u._id,
                                    targetName: `@${u.username}`,
                                    reason: '',
                                    isProcessing: false
                                  })
                                }
                                disabled={u._id === user?.id}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-30"
                              >
                                Block
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setActionModal({
                                    isOpen: true,
                                    type: 'UNBLOCK_USER',
                                    targetId: u._id,
                                    targetName: `@${u.username}`,
                                    reason: '',
                                    isProcessing: false
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors"
                              >
                                Unblock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/5">
                {users.map((u) => (
                  <div key={u._id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.profileImage}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                          <span className="text-xs text-slate-400">@{u.username}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          u.accountStatus === 'BLOCKED' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {u.accountStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono truncate">{u.email}</div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-400">Role: {u.role}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenUserDetails(u._id)}
                          className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
                        >
                          Details
                        </button>
                        {u.accountStatus === 'ACTIVE' ? (
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                type: 'BLOCK_USER',
                                targetId: u._id,
                                targetName: `@${u.username}`,
                                reason: '',
                                isProcessing: false
                              })
                            }
                            disabled={u._id === user?.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setActionModal({
                                isOpen: true,
                                type: 'UNBLOCK_USER',
                                targetId: u._id,
                                targetName: `@${u.username}`,
                                reason: '',
                                isProcessing: false
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          >
                            Unblock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {userPagination.pages > 1 && (
                <div
                  className={`p-3 border-t flex items-center justify-between text-xs ${
                    isDark ? 'border-white/10 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className="text-slate-400">
                    Showing page {userPagination.page} of {userPagination.pages} ({userPagination.total} users)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => loadUsers(userPagination.page - 1)}
                      disabled={userPagination.page <= 1}
                      className="p-1.5 rounded-xl border disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => loadUsers(userPagination.page + 1)}
                      disabled={userPagination.page >= userPagination.pages}
                      className="p-1.5 rounded-xl border disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: POST MODERATION                                   */}
      {/* ======================================================== */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between ${
              isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Feed Moderation</h3>
              <p className="text-xs text-slate-400">
                Inspect public posts and permanently delete harmful content and associated Cloudinary media.
              </p>
            </div>
          </div>

          {loadingStats ? (
            <LoadingSkeleton count={3} />
          ) : recentPosts.length === 0 ? (
            <EmptyState title="No posts to moderate" description="The feed currently has no posts." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentPosts.map((p) => (
                <div
                  key={p._id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between ${
                    isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Author Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.author?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={p.author?.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {p.author?.name || 'Unknown Author'}
                          </span>
                          <span className="text-[11px] text-slate-400">@{p.author?.username}</span>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Caption */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                      {p.caption || 'No caption text provided.'}
                    </p>

                    {/* Media preview if any */}
                    {p.mediaUrl && (
                      <div className="h-40 rounded-2xl overflow-hidden bg-black/20 border border-slate-200 dark:border-white/10">
                        {p.mediaType === 'video' ? (
                          <video src={p.mediaUrl} className="w-full h-full object-cover" controls />
                        ) : (
                          <img src={p.mediaUrl} alt="Post Media" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    {/* Hashtags */}
                    {p.hashtags && p.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.hashtags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] text-indigo-400 font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">ID: {p._id}</span>

                    <button
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: 'DELETE_POST',
                          targetId: p._id,
                          targetName: `Post by @${p.author?.username || 'user'}`,
                          reason: '',
                          isProcessing: false
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Harmful Post</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: AUDIT TRAIL LOG                                   */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between ${
              isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Immutable records of user bans, unbans, and harmful post removal for engineering accountability.
              </p>
            </div>
          </div>

          {loadingAudit ? (
            <LoadingSkeleton count={4} />
          ) : auditLogs.length === 0 ? (
            <EmptyState title="No audit entries" description="No moderation actions have been recorded yet." />
          ) : (
            <div
              className={`rounded-3xl border overflow-hidden ${
                isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-400">Action Type</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Moderator</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Target</th>
                      <th className="py-3 px-4 font-bold text-slate-400">Description / Reason</th>
                      <th className="py-3 px-4 font-bold text-slate-400 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                              log.actionType === 'BLOCK_USER'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : log.actionType === 'UNBLOCK_USER'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          @{log.admin?.username || 'admin'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {log.targetUser ? `@${log.targetUser.username}` : 'Post Asset'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {log.description}
                          {log.details?.reason && (
                            <span className="text-[11px] text-slate-400 block italic">"{log.details.reason}"</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION ACTION MODAL (Prevents 1-click deletions)     */}
      {/* ======================================================== */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  actionModal.type === 'UNBLOCK_USER'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  {actionModal.type === 'BLOCK_USER' && 'Block User Account?'}
                  {actionModal.type === 'UNBLOCK_USER' && 'Unblock User Account?'}
                  {actionModal.type === 'DELETE_POST' && 'Are you sure you want to remove this post?'}
                </h3>
                <span className="text-xs text-slate-400">{actionModal.targetName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {actionModal.type === 'BLOCK_USER' &&
                'This will switch account status to BLOCKED. The user will be immediately disconnected and prevented from posting, commenting, liking, messaging, or accessing secret chats.'}
              {actionModal.type === 'UNBLOCK_USER' &&
                'This will restore active status and allow the user to access standard social features.'}
              {actionModal.type === 'DELETE_POST' &&
                'This will permanently delete the post, delete associated media from Cloudinary, clear related comments/likes, and record an audit entry.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Moderation Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Violating community rules, spam, harmful media..."
                value={actionModal.reason}
                onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
                className={`w-full p-2.5 rounded-xl text-xs bg-transparent border outline-none ${
                  isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal({ isOpen: false, type: null, targetId: null, targetName: '', reason: '', isProcessing: false })}
                className="px-4 py-2 rounded-full text-xs font-semibold"
                disabled={actionModal.isProcessing}
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteAdminAction}
                disabled={actionModal.isProcessing}
                className={`px-5 py-2 rounded-full text-xs font-bold text-white transition-all shadow-md ${
                  actionModal.type === 'UNBLOCK_USER'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionModal.isProcessing ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAILS MODAL */}
      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto ${
              isDark ? 'bg-[#14161f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUserDetails.user.profileImage}
                  alt={selectedUserDetails.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-base font-bold">{selectedUserDetails.user.name}</h3>
                  <span className="text-xs text-slate-400">@{selectedUserDetails.user.username}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetails(null)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-mono text-slate-200">{selectedUserDetails.user.email}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-400 block mb-0.5">Account Status</span>
                <span className={`font-black ${selectedUserDetails.user.accountStatus === 'BLOCKED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedUserDetails.user.accountStatus}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-400 block mb-0.5">Role</span>
                <span className="font-bold">{selectedUserDetails.user.role}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <span className="text-slate-400 block mb-0.5">Posts Count</span>
                <span className="font-bold">{selectedUserDetails.user.postsCount || 0}</span>
              </div>
            </div>

            {selectedUserDetails.user.bio && (
              <p className="text-xs text-slate-400 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                {selectedUserDetails.user.bio}
              </p>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  if (onNavigateToProfile) onNavigateToProfile(selectedUserDetails.user.username);
                  setSelectedUserDetails(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                View Public Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
