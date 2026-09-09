import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { KnowledgeBaseView } from './KnowledgeBaseView';

export const UserDashboard = ({ activeTab, onNotify }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Ticket creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  // Selected ticket for detailed view
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.tickets.getAll(user?.email);
      setTickets(data);
    } catch (err) {
      if (onNotify) onNotify(`Failed to fetch tickets: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email && activeTab === 'tickets') {
      fetchTickets();
    }
  }, [user, activeTab]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      if (onNotify) onNotify('Please fill in both title and description.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const newTicket = await api.tickets.create({
        title,
        description,
        priority,
        userId: String(user.id || ''),
        userEmail: user.email,
      });

      // Audit log
      await api.audit.createLog({
        action: 'TICKET_CREATED',
        user_email: user.email,
        details: `Ticket #${newTicket.id} created: "${title}" [${priority}]`,
      });

      if (onNotify) onNotify('Support ticket created successfully!', 'success');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setPriority('Medium');
      fetchTickets();
    } catch (err) {
      if (onNotify) onNotify(`Failed to create ticket: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'Open').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Progress':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Open':
      default:
        return 'bg-sky-100 text-sky-800 border-sky-200';
    }
  };

  if (activeTab === 'kb') {
    return <KnowledgeBaseView onNotify={onNotify} isAdmin={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner and Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="text-sm text-slate-500">Track and manage your enterprise support tickets</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Support Ticket
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Open Tickets</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">{stats.open}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.inProgress}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search tickets by title or content..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
          <p className="text-sm text-slate-500 mt-2">Loading your support tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-base font-semibold text-slate-800">No tickets found</h3>
          <p className="text-xs text-slate-500 mt-1">Submit a new request or change your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
            return (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all overflow-hidden"
              >
                <div
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{ticket.id}</span>
                      <h4 className="text-sm font-bold text-slate-900">{ticket.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs text-slate-700">
                    <div>
                      <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Full Description</div>
                      <p className="mt-1 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-200">
                      <span>Submitted by: {ticket.userEmail}</span>
                      <span>Created: {new Date(ticket.createdAt || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Support Ticket</h3>
                <p className="text-xs text-slate-500">Provide details for the technical operations team</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ticket Subject / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot connect to staging database cluster"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Urgency & Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        priority === lvl
                          ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Issue Description
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the problem, steps to reproduce, and any error messages..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
