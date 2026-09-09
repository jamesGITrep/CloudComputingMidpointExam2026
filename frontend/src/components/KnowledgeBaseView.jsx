import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const KnowledgeBaseView = ({ onNotify, isAdmin = false, onOpenAdminEditor }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const categories = ['All', 'Networking', 'Security', 'General', 'Applications'];

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await api.kb.getArticles(selectedCategory, searchQuery);
      setArticles(data);
    } catch (err) {
      if (onNotify) onNotify(`Failed to load articles: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Knowledge Base & Guides</h2>
            <p className="text-sm text-slate-500">Self-service troubleshooting articles and IT documentation</p>
          </div>
          {isAdmin && onOpenAdminEditor && (
            <button
              onClick={() => onOpenAdminEditor(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Publish New Article
            </button>
          )}
        </div>

        {/* Search input and Category pills */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search documentation by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <svg
              className="w-5 h-5 text-slate-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
          <p className="text-sm text-slate-500 mt-2">Loading knowledge base articles...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-base font-semibold text-slate-800">No articles found</h3>
          <p className="text-xs text-slate-500 mt-1">Try refining your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                    {article.category}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(article.createdat || article.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>By {article.author || 'IT Team'}</span>
                <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Read Article &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  {selectedArticle.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2 leading-tight">
                  {selectedArticle.title}
                </h2>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>Author: {selectedArticle.author || 'IT Team'}</span>
                  <span>•</span>
                  <span>Published: {new Date(selectedArticle.createdat || selectedArticle.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedArticle.content}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {isAdmin && onOpenAdminEditor ? (
                <button
                  onClick={() => {
                    const art = selectedArticle;
                    setSelectedArticle(null);
                    onOpenAdminEditor(art);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
                >
                  Edit Article
                </button>
              ) : <div></div>}
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
