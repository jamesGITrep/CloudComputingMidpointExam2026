import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              DeskSphere
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400">Support Ticket Orchestration Platform</p>
          </div>
        </div>

        {/* Navigation Tabs (if logged in) */}
        {user && (
          <nav className="hidden md:flex space-x-1">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'tickets'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  All Tickets
                </button>
                <button
                  onClick={() => setActiveTab('kb')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'kb'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Knowledge Base Manager
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Audit Trail
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'tickets'
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  My Tickets
                </button>
                <button
                  onClick={() => setActiveTab('kb')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'kb'
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Knowledge Base
                </button>
              </>
            )}
          </nav>
        )}

        {/* User Info & Role Badge */}
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 leading-tight">
                  {user.username}
                </div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>

              {/* Role Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-sky-100 text-sky-700 border border-sky-200'
                }`}
              >
                {user.role}
              </span>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-sm font-medium text-slate-500">
            <span>Enterprise Gateway</span>
          </div>
        )}
      </div>
    </header>
  );
};
