import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import './EditorialBrief.css';

interface Template {
  id: string;
  name: string;
  instructionText: string;
  createdAt: string;
}

const STORAGE_KEY = 'news-selected-template';

interface EditorialBriefProps {
  onSave?: () => void;
}

function EditorialBrief({ onSave }: EditorialBriefProps) {
  const [instructionText, setInstructionText] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || null;
    } catch {
      return null;
    }
  });
  const [newTemplateName, setNewTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadInstructions = useCallback(async () => {
    try {
      const { instructionText: text, updatedAt: at } = await api.instructions.get();
      setInstructionText(text);
      setUpdatedAt(at);
    } catch {
      setInstructionText('');
    }
  }, []);

  const loadTemplates = useCallback(async (): Promise<Template[]> => {
    try {
      const list = await api.templates.list();
      setTemplates(list);
      return list;
    } catch (err) {
      console.error('Failed to load templates:', err);
      setTemplates([]);
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [, list] = await Promise.all([loadInstructions(), loadTemplates()]);
    setLoading(false);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && list.some((t) => t.id === saved)) {
        const t = list.find((x) => x.id === saved);
        if (t) {
          setSelectedTemplateId(saved);
          setInstructionText(t.instructionText);
        }
      } else {
        if (saved) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
        }
        setSelectedTemplateId(null);
        // Keep instructionText from loadInstructions — do not clear
      }
    } catch {
      setSelectedTemplateId(null);
    }
  }, [loadInstructions, loadTemplates]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectTemplate = async (templateId: string | null) => {
    setError(null);
    setSelectedTemplateId(templateId);
    try {
      if (templateId) {
        localStorage.setItem(STORAGE_KEY, templateId);
        const t = templates.find((x) => x.id === templateId);
        if (t) {
          setInstructionText(t.instructionText);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        const { instructionText: text, updatedAt: at } = await api.instructions.get();
        setInstructionText(text);
        setUpdatedAt(at);
      }
    } catch {
      // ignore localStorage; instructions fetch failed — leave text as-is
    }
  };

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.instructions.update(instructionText);
      setUpdatedAt(res.updatedAt);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply brief');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = newTemplateName.trim() || 'Untitled';
    setSaving(true);
    setError(null);
    try {
      const created = await api.templates.create(name, instructionText);
      setNewTemplateName('');
      await loadTemplates();
      setSelectedTemplateId(created.id);
      try {
        localStorage.setItem(STORAGE_KEY, created.id);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);
    setError(null);
    try {
      await api.templates.update(selectedTemplateId, { instructionText });
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    const t = templates.find((x) => x.id === selectedTemplateId);
    const label = t?.name?.trim() ? `“${t.name}”` : 'this saved brief';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

    setSaving(true);
    setError(null);
    const idToRemove = selectedTemplateId;
    try {
      await api.templates.delete(idToRemove);
      setTemplates((prev) => prev.filter((x) => x.id !== idToRemove));
      setSelectedTemplateId(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      await loadTemplates();
      await loadInstructions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="editorial-brief">
        <p className="editorial-loading">Loading editorial brief...</p>
      </section>
    );
  }

  const selectedTemplate = selectedTemplateId
    ? templates.find((x) => x.id === selectedTemplateId)
    : null;

  return (
    <section className="editorial-brief">
      <div className="editorial-header">
        <button
          type="button"
          className="editorial-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="editorial-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="editorial-toggle-label">Editorial Brief / Fetch Criteria</span>
        </button>
        {updatedAt && (
          <span className="editorial-updated">
            Last applied: {new Date(updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="editorial-body">
          <p className="editorial-desc">
            Describe what you want: topics, tone, what to emphasize or avoid, and how articles should be
            ranked. When you run a fetch, this brief is used to choose and order articles from your feeds.
          </p>

          {error && (
            <div className="editorial-error">
              {error}
              <button type="button" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}

          <div className="editorial-saved-briefs">
            <div className="editorial-saved-briefs-heading">Saved briefs</div>
            <div className="editorial-saved-briefs-row">
              <select
                id="template-select"
                className="editorial-template-select"
                aria-label="Load a saved brief"
                value={selectedTemplateId ?? ''}
                onChange={(e) => void handleSelectTemplate(e.target.value || null)}
              >
                <option value="">Custom — what’s applied on the server</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-remove btn-small editorial-delete-btn"
                onClick={() => void handleDeleteTemplate()}
                disabled={saving || !selectedTemplateId}
                title={
                  selectedTemplateId
                    ? `Delete “${selectedTemplate?.name ?? 'saved brief'}”`
                    : 'Select a saved brief to delete it'
                }
              >
                Delete saved brief
              </button>
            </div>
            <p className="editorial-saved-hint">
              {selectedTemplateId
                ? 'You’re editing a saved copy. Use “Save to this brief” to update it, or Apply to use this text for the next fetch.'
                : 'Edit the box below, then Apply. Save a copy anytime with the name field.'}
            </p>
          </div>

          <textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="Describe your target audience, what to prioritize, what to exclude, and how to rank articles..."
            className="editorial-textarea"
            rows={20}
            spellCheck={false}
          />

          <div className="editorial-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleApply()}
              disabled={saving}
            >
              {saving ? 'Applying…' : 'Apply for next fetch'}
            </button>

            {selectedTemplateId ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void handleUpdateTemplate()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save to this brief'}
              </button>
            ) : (
              <div className="editorial-save-new-inline">
                <input
                  id="new-template-name"
                  type="text"
                  className="editorial-template-name-input"
                  placeholder="Name for new saved brief"
                  aria-label="Name for new saved brief"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveAsTemplate();
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleSaveAsTemplate()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default EditorialBrief;
