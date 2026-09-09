// Centralized API Client routing through the Nginx API Gateway

const getAuthHeaders = () => {
  const token = localStorage.getItem('support_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.detail || data.error || data.message || errorMsg;
    } catch {
      // response is not JSON
    }
    throw new Error(errorMsg);
  }
  return response.json();
};

export const api = {
  // Authentication (/api/user)
  auth: {
    login: async (email, password) => {
      const res = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },

    register: async (username, email, password, role = 'user') => {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      return handleResponse(res);
    },

    getMe: async () => {
      const res = await fetch('/api/user/me', {
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Tickets Service (/api/ticket)
  tickets: {
    getAll: async (userEmail = null) => {
      const url = userEmail 
        ? `/api/ticket/tickets?userEmail=${encodeURIComponent(userEmail)}`
        : '/api/ticket/tickets';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },

    create: async ({ title, description, priority, userId, userEmail }) => {
      const res = await fetch('/api/ticket/tickets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, description, priority, userId, userEmail }),
      });
      return handleResponse(res);
    },

    updateStatus: async (id, status) => {
      const res = await fetch(`/api/ticket/tickets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      return handleResponse(res);
    },
  },

  // Knowledge Base Service (/api/kb)
  kb: {
    getArticles: async (category = null, search = '') => {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (search) params.append('search', search);

      const url = `/api/kb/articles${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },

    createArticle: async ({ title, category, content, author }) => {
      const res = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, category, content, author }),
      });
      return handleResponse(res);
    },

    updateArticle: async (id, { title, category, content, author }) => {
      const res = await fetch(`/api/kb/articles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, category, content, author }),
      });
      return handleResponse(res);
    },

    deleteArticle: async (id) => {
      const res = await fetch(`/api/kb/articles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Audit Log Service (/api/audit)
  audit: {
    getLogs: async () => {
      const res = await fetch('/api/audit/logs', {
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },

    createLog: async ({ action, user_email, details }) => {
      try {
        const res = await fetch('/api/audit/logs', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ action, user_email, details }),
        });
        return handleResponse(res);
      } catch (err) {
        console.warn('Audit log write failed silently:', err);
      }
    },
  },
};
