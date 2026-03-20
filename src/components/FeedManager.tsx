import { useState, useEffect } from 'react';
import type { RssFeed } from '../types';
import './FeedManager.css';

interface FeedManagerProps {
  feeds: RssFeed[];
  onAddFeed: (url: string, name: string) => void;
  onRemoveFeed: (id: string) => void;
  onEditFeed: (id: string, url: string, name: string) => void;
}

function FeedManager({ feeds, onAddFeed, onRemoveFeed, onEditFeed }: FeedManagerProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(feeds.length === 0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (feeds.length === 0) setIsExpanded(true);
  }, [feeds.length]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedUrl = newUrl.trim();
    const trimmedName = newName.trim() || extractDomain(trimmedUrl);

    if (!trimmedUrl) {
      setError('Please enter an RSS feed URL');
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }
    if (feeds.some((f) => f.url === trimmedUrl)) {
      setError('This feed is already in your list');
      return;
    }

    onAddFeed(trimmedUrl, trimmedName);
    setNewUrl('');
    setNewName('');
    setShowQuickAdd(false);
  };

  const startEdit = (feed: RssFeed) => {
    setEditingId(feed.id);
    setEditUrl(feed.url);
    setEditName(feed.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
    setEditName('');
    setError('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmedUrl = editUrl.trim();
    const trimmedName = editName.trim() || extractDomain(trimmedUrl);

    if (!trimmedUrl) {
      setError('URL cannot be empty');
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid URL');
      return;
    }
    const otherFeeds = feeds.filter((f) => f.id !== editingId);
    if (otherFeeds.some((f) => f.url === trimmedUrl)) {
      setError('This URL is already used by another feed');
      return;
    }

    onEditFeed(editingId, trimmedUrl, trimmedName);
    cancelEdit();
  };

  const extractDomain = (url: string) => {
    try {
      const host = new URL(url).hostname;
      return host.replace(/^www\./, '');
    } catch {
      return 'Unknown Source';
    }
  };

  return (
    <section className="feed-manager">
      <div className="feed-manager-header">
        <button
          type="button"
          className="feed-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="feed-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="feed-toggle-label">
            Your Feeds
            <span className="feed-count">({feeds.length})</span>
          </span>
        </button>
        <div className="feed-header-actions">
          <button
            type="button"
            className="btn btn-add-compact"
            onClick={() => {
              setShowQuickAdd(!showQuickAdd);
              if (!showQuickAdd) setIsExpanded(true);
            }}
            aria-pressed={showQuickAdd}
          >
            + Add Feed
          </button>
        </div>
      </div>

      {(isExpanded || showQuickAdd) && (
        <div className="feed-manager-body">
          <form onSubmit={handleAdd} className="feed-form">
            <div className="feed-form-row">
              <input
                type="url"
                placeholder="https://example.com/feed.xml"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="feed-input"
                aria-label="RSS feed URL"
              />
              <input
                type="text"
                placeholder="Source name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="feed-input feed-input-name"
                aria-label="Source name"
              />
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </div>
            {error && !editingId && <p className="feed-error">{error}</p>}
          </form>

          <div className="feed-list-section">
            <h3 className="feed-list-title">Your added feeds</h3>
            <ul className="feed-list">
              {feeds.length === 0 ? (
                <li className="feed-empty">No feeds yet. Add one above.</li>
              ) : (
                feeds.map((feed) => (
                  <li key={feed.id} className="feed-item">
                    {editingId === feed.id ? (
                      <div className="feed-item-edit">
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="feed-input feed-edit-input"
                          placeholder="Feed URL"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="feed-input feed-edit-input feed-edit-name"
                          placeholder="Source name"
                        />
                        <div className="feed-edit-actions">
                          <button type="button" className="btn btn-save" onClick={saveEdit}>
                            Save
                          </button>
                          <button type="button" className="btn btn-cancel" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                        {error && editingId === feed.id && (
                          <p className="feed-error feed-error-inline">{error}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="feed-item-info">
                          <span className="feed-item-name">{feed.name}</span>
                          <a href={feed.url} target="_blank" rel="noopener noreferrer" className="feed-item-url">
                            {feed.url}
                          </a>
                        </div>
                        <div className="feed-item-actions">
                          <button
                            type="button"
                            className="btn btn-edit"
                            onClick={() => startEdit(feed)}
                            aria-label={`Edit ${feed.name}`}
                            title="Edit feed"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-remove-icon"
                            onClick={() => onRemoveFeed(feed.id)}
                            aria-label={`Remove ${feed.name}`}
                            title="Remove feed"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export default FeedManager;
