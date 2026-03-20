const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('news-token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (res.status === 401) {
    localStorage.removeItem('news-token');
    window.dispatchEvent(new Event('auth-logout'));
  }
  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : {};
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!isJson || text.trim().toLowerCase().startsWith('<!')) {
    throw new Error(
      'Backend may not be running. In a terminal, run: cd backend && npm run dev'
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      'Backend may not be running. In a terminal, run: cd backend && npm run dev'
    );
  }
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
  feeds: {
    list: () => request<{ id: string; url: string; name: string; addedAt: string }[]>('/feeds'),
    add: (url: string, name: string) =>
      request<{ id: string; url: string; name: string; addedAt: string }>('/feeds', {
        method: 'POST',
        body: JSON.stringify({ url, name }),
      }),
    update: (id: string, url: string, name: string) =>
      request<{ id: string; url: string; name: string; addedAt: string }>(`/feeds/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ url, name }),
      }),
    remove: (id: string) => request(`/feeds/${id}`, { method: 'DELETE' }),
  },
  runs: {
    list: () =>
      request<{ id: string; runNumber: number; createdAt: string }[]>('/runs'),
  },
  articles: {
    list: (runId?: string) =>
      request<
        {
          id: string;
          title: string;
          url: string;
          source: string;
          sourceUrl: string;
          publishedAt: string;
          excerpt: string;
          rank: number;
          reviewScore: number;
          scoringRationale: string;
        }[]
      >(runId ? `/articles?runId=${encodeURIComponent(runId)}` : '/articles'),
    reorder: (articleIds: string[]) =>
      request<{ ok: boolean }>('/articles/reorder', {
        method: 'PUT',
        body: JSON.stringify({ articleIds }),
      }),
  },
  fetch: {
    run: () =>
      request<{
        added: number;
        errors: string[];
        usedLLM?: boolean;
        runId?: string;
        runNumber?: number;
        fetchedFromRss?: number;
        newFromRss?: number;
      }>('/fetch', {
        method: 'POST',
      }),
  },
  status: {
    get: () => request<{ llmConfigured: boolean }>('/status'),
  },
  instructions: {
    get: () =>
      request<{ instructionText: string; updatedAt: string | null }>('/instructions'),
    update: (instructionText: string) =>
      request<{ instructionText: string; updatedAt: string }>('/instructions', {
        method: 'PUT',
        body: JSON.stringify({ instructionText }),
      }),
  },
  templates: {
    list: () =>
      request<{ id: string; name: string; instructionText: string; createdAt: string }[]>('/templates'),
    create: (name: string, instructionText: string) =>
      request<{ id: string; name: string; instructionText: string; createdAt: string }>('/templates', {
        method: 'POST',
        body: JSON.stringify({ name, instructionText }),
      }),
    update: (id: string, data: { name?: string; instructionText?: string }) =>
      request<{ id: string; name: string; instructionText: string; createdAt: string }>(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request(`/templates/${id}`, { method: 'DELETE' }),
  },
};
