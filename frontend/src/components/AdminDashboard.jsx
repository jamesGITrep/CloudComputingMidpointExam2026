import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { KnowledgeBaseView } from './KnowledgeBaseView';

export const AdminDashboard = ({ activeTab, setActiveTab, onNotify }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketFilter, setTicketFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // KB Article Management state
  const [kbArticles, setKbArticles] = useState([]);
  const [loadingKb, setLoadingKb] = useState(true);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('General');
  const [articleContent, setArticleContent] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('');
  const [savingArticle, setSavingArticle] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const data = await api.tickets.getAll();
      setTickets(data);
    } catch (err) {
      if (onNotify) onNotify(`Failed to fetch system tickets: ${err.message}`, 'error');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch KB Articles
  const fetchKbArticles = async () => {
    try {
      setLoadingKb(true);
      const data = await api.kb.getArticles();
      setKbArticles(data);
    } catch (err) {
      if (onNotify) onNotify(`Failed to fetch KB articles: ${err.message}`, 'error');
    } finally {
      setLoadingKb(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await api.audit.getLogs();
      setAuditLogs(data);
    } catch (err) {
      if (onNotify) onNotify(`Failed to fetch audit logs: ${err.message}`, 'error');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') fetchTickets();
    if (activeTab === 'kb') fetchKbArticles();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // Handle status update
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.tickets.updateStatus(ticketId, newStatus);
      
      // Update local state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );

      // Audit log
      await api.audit.createLog({
        action: 'TICKET_STATUS_UPDATED',
        user_email: user.email,
        details: `Ticket #${ticketId} status changed to "${newStatus}" by Admin`,
      });

      if (onNotify) onNotify(`Ticket #${ticketId} marked as ${newStatus}`, 'success');
    } catch (err) {
      if (onNotify) onNotify(`Failed to update status: ${err.message}`, 'error');
    }
  };

  // Open Article Modal (Create or Edit)
  const openArticleModal = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setArticleTitle(article.title);
      setArticleCategory(article.category);
      setArticleContent(article.content);
      setArticleAuthor(article.author || user.username);
    } else {
      setEditingArticle(null);
      setArticleTitle('');
      setArticleCategory('General');
      setArticleContent('');
      setArticleAuthor(user.username || 'System Admin');
    }
    setArticleModalOpen(true);
  };

  // Save Article (Create or Update)
  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!articleTitle.trim() || !articleContent.trim()) {
      if (onNotify) onNotify('Title and content are required', 'error');
      return;
    }

    try {
      setSavingArticle(true);
      if (editingArticle) {
        await api.kb.updateArticle(editingArticle.id, {
          title: articleTitle,
          category: articleCategory,
          content: articleContent,
          author: articleAuthor,
        });

        await api.audit.createLog({
          action: 'KB_ARTICLE_UPDATED',
          user_email: user.email,
          details: `Article #${editingArticle.id} ("${articleTitle}") updated`,
        });

        if (onNotify) onNotify('Article updated successfully!', 'success');
      } else {
        const created = await api.kb.createArticle({
          title: articleTitle,
          category: articleCategory,
          content: articleContent,
          author: articleAuthor,
        });

        await api.audit.createLog({
          action: 'KB_ARTICLE_CREATED',
          user_email: user.email,
          details: `New article published: "${articleTitle}" [${articleCategory}]`,
        });

        if (onNotify) onNotify('New article published!', 'success');
      }

      setArticleModalOpen(false);
      fetchKbArticles();
    } catch (err) {
      if (onNotify) onNotify(`Article save failed: ${err.message}`, 'error');
    } finally {
      setSavingArticle(false);
    }
  };

  // Delete Article
  const handleDeleteArticle = async (articleId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await api.kb.deleteArticle(articleId);

      await api.audit.createLog({
        action: 'KB_ARTICLE_DELETED',
        user_email: user.email,
        details: `Article #${articleId} ("${title}") deleted`,
      });

      if (onNotify) onNotify('Article deleted.', 'success');
      fetchKbArticles();
    } catch (err) {
      if (onNotify) onNotify(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = ticketFilter === 'All' || t.status === ticketFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'Open').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Administrative Control Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Admin Mode
            </span>
          </div>
          <p className="text-sm text-slate-500">System-wide ticket resolution, knowledge management, and audit inspection</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'tickets') fetchTickets();
              if (activeTab === 'kb') fetchKbArticles();
              if (activeTab === 'audit') fetchAuditLogs();
              if (onNotify) onNotify('Data refreshed', 'success');
            }}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 shadow-sm transition-all"
            title="Refresh current view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Global System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Pending / Open</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">{stats.open}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Under Investigation</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved Rate</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '100%'}
          </div>
        </div>
      </div>

      {/* TAB 1: ALL TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search by user email, subject, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setTicketFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    ticketFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingTickets ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-slate-500 mt-2">Loading system tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 p-8">
                <p className="text-slate-500 text-sm font-medium">No tickets match the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Title & Details</th>
                      <th className="py-3.5 px-4">Requester</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Current Status</th>
                      <th className="py-3.5 px-4 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-400">#{t.id}</td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 text-sm">{t.title}</div>
                          <div className="text-slate-500 text-[11px] truncate mt-0.5">{t.description}</div>
                          <div className="text-slate-400 text-[10px] mt-1">{new Date(t.createdAt || Date.now()).toLocaleString()}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{t.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              t.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : t.priority === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              t.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'In Progress'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE MANAGER */}
      {activeTab === 'kb' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900">Knowledge Base Article Catalog</h3>
              <p className="text-xs text-slate-500">Create, revise, or deprecate self-service guides</p>
            </div>
            <button
              onClick={() => openArticleModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create New Article
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingKb ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-slate-500 mt-2">Loading catalog...</p>
              </div>
            ) : kbArticles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No articles published yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Title</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4">Published Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {kbArticles.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm">
                          <div>{art.title}</div>
                          <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{art.content}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {art.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{art.author || 'Admin'}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(art.createdat || art.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openArticleModal(art)}
                            className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id, art.title)}
                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900">Security & Operational Audit Log</h3>
              <p className="text-xs text-slate-500">Immutable ledger of platform events recorded in MySQL</p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Logs
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingAudit ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="text-sm text-slate-500 mt-2">Fetching audit stream...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No audit logs recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor Email</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-700">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 font-mono text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{log.user_email}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Article Create/Edit Modal */}
      {articleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingArticle ? 'Edit Knowledge Article' : 'Publish Knowledge Article'}
                </h3>
                <p className="text-xs text-slate-500">Provide documentation for end-user self-service</p>
              </div>
              <button
                onClick={() => setArticleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Article Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Setting up VPN on MacOS Ventura"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={articleCategory}
                    onChange={(e) => setArticleCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Networking">Networking</option>
                    <option value="Security">Security</option>
                    <option value="Applications">Applications</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Author / Team
                  </label>
                  <input
                    type="text"
                    value={articleAuthor}
                    onChange={(e) => setArticleAuthor(e.target.value)}
                    placeholder="IT Security Team"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Article Content & Instructions
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Step-by-step instructions, troubleshooting commands, and resolution guidance..."
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArticleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingArticle}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  {savingArticle ? 'Saving...' : editingArticle ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
