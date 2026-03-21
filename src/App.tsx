import { useState, useEffect, useCallback } from 'react';
import FeedManager from './components/FeedManager';
import ArticleList from './components/ArticleList';
import RunSelector from './components/RunSelector';
import ScheduleBadge from './components/ScheduleBadge';
import EditorialBrief from './components/EditorialBrief';
import { api } from './api';
import type { RssFeed, Article } from './types';
import './App.css';

function App() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [runs, setRuns] = useState<{ id: string; runNumber: number; createdAt: string }[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [fetchMessageSticky, setFetchMessageSticky] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    api.status.get().then((s) => setLlmConfigured(s.llmConfigured)).catch(() => setLlmConfigured(false));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feedsRes, runsRes, articlesRes] = await Promise.all([
        api.feeds.list(),
        api.runs.list(),
        api.articles.list(selectedRunId ?? undefined),
      ]);
      setFeeds(feedsRes);
      setRuns(runsRes);
      setArticles(articlesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunFetch = useCallback(async () => {
    setIsFetching(true);
    setFetchMessage(null);
    setFetchMessageSticky(false);
    try {
      const res = await api.fetch.run();
      const newRuns = await api.runs.list();
      setRuns(newRuns);
      if (res.runId) {
        setSelectedRunId(res.runId);
      }
      const articlesRes = await api.articles.list(res.runId ?? undefined);
      setArticles(articlesRes);
      let msg =
        res.usedLLM
          ? `Run ${res.runNumber}: Added ${res.added} articles (LLM filtered)`
          : `Run ${res.runNumber}: Added ${res.added} articles`;
      const fetched = (res as { fetchedFromRss?: number }).fetchedFromRss ?? 0;
      const newFromRss = (res as { newFromRss?: number }).newFromRss ?? 0;
      if (res.added === 0) {
        setFetchMessageSticky(true);
        if (fetched === 0) {
          msg = `Run ${res.runNumber}: No articles from feeds. Add RSS feeds or check for errors.`;
        } else if (newFromRss === 0) {
          msg = `Run ${res.runNumber}: All ${fetched} articles were already in the database.`;
        } else if (res.usedLLM) {
          msg = `Run ${res.runNumber}: LLM filtered out all ${newFromRss} new articles.`;
        }
      }
      if (res.errors?.length) {
        msg += ` Errors: ${res.errors.join('; ')}`;
      }
      setFetchMessage(msg);
      if (res.added > 0) {
        setTimeout(() => setFetchMessage(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsFetching(false);
    }
  }, []);

  const handleAddFeed = useCallback(async (url: string, name: string) => {
    const feed = await api.feeds.add(url, name);
    setFeeds((prev) => [...prev, feed]);
  }, []);

  const handleRemoveFeed = useCallback(async (id: string) => {
    await api.feeds.remove(id);
    setFeeds((prev) => prev.filter((f) => f.id !== id));
    const [runsRes, articlesRes] = await Promise.all([
      api.runs.list(),
      api.articles.list(selectedRunId ?? undefined),
    ]);
    setRuns(runsRes);
    setArticles(articlesRes);
  }, [selectedRunId]);

  const handleEditFeed = useCallback(async (id: string, url: string, name: string) => {
    const updated = await api.feeds.update(id, url, name);
    setFeeds((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, []);

  const handleReorder = useCallback(async (reordered: Article[]) => {
    const articleIds = reordered.map((a) => a.id);
    await api.articles.reorder(articleIds);
    setArticles(reordered.map((a, i) => ({ ...a, rank: i + 1 })));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>News Collection</h1>
        <p className="tagline">Curated articles from your RSS feeds, reviewed and ranked</p>
        <ScheduleBadge onRunFetch={handleRunFetch} isFetching={isFetching} />
      </header>

      <main className="main">
        {error && (
          <div className="app-error">
            {error}
            <button type="button" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        {fetchMessage && (
          <div className={fetchMessageSticky ? 'app-fetch-message app-fetch-message-sticky' : 'app-fetch-message'}>
            <span>{fetchMessage}</span>
            {fetchMessageSticky && (
              <button
                type="button"
                className="app-fetch-dismiss"
                onClick={() => { setFetchMessage(null); setFetchMessageSticky(false); }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {llmConfigured === false && (
          <div className="app-llm-warning">
            <strong>LLM filtering is off.</strong>{' '}
            {import.meta.env.PROD ? (
              <>
                In Vercel: <strong>Project → Settings → Environment Variables</strong>. Add{' '}
                <code>OPENAI_API_KEY</code> (exact name) with your <code>sk-...</code> key, enable{' '}
                <strong>Production</strong>, then <strong>Redeploy</strong>. No quotes around the value.
                If the key is already set, redeploy—env changes apply after a new deployment.
              </>
            ) : (
              <>
                Create <code>backend/.env</code> with <code>OPENAI_API_KEY=sk-your-key</code>, then restart
                the backend.
              </>
            )}{' '}
            Without it, all articles are stored with heuristic scoring.
          </div>
        )}
        {loading ? (
          <p className="loading-text">Loading your data...</p>
        ) : (
          <>
            <EditorialBrief />
            <FeedManager
              feeds={feeds}
              onAddFeed={handleAddFeed}
              onRemoveFeed={handleRemoveFeed}
              onEditFeed={handleEditFeed}
            />
            <div className="articles-section">
              <RunSelector
                runs={runs}
                selectedRunId={selectedRunId}
                onSelectRun={(id) => {
                  setSelectedRunId(id);
                }}
              />
              <ArticleList articles={articles} onReorder={handleReorder} />
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>Articles are fetched on Mondays and Thursdays</p>
      </footer>
    </div>
  );
}

export default App;
