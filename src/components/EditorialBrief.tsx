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
  const [showNewTemplateInput, setShowNewTemplateInput] = useState(false);
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
    // Restore selected template from localStorage after templates load
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && list.some((t) => t.id === saved)) {
        const t = list.find((x) => x.id === saved);
        if (t) {
          setSelectedTemplateId(saved);
          setInstructionText(t.instructionText);
        }
      } else {
        setInstructionText('');
      }
    } catch {
      setInstructionText('');
    }
  }, [loadInstructions, loadTemplates]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectTemplate = async (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setShowNewTemplateInput(false);
    try {
      if (templateId) {
        localStorage.setItem(STORAGE_KEY, templateId);
        const t = templates.find((x) => x.id === templateId);
        if (t) {
          setInstructionText(t.instructionText);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setInstructionText('');
      }
    } catch {
      // ignore localStorage errors
    }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const res = await api.instructions.update(instructionText);
      setUpdatedAt(res.updatedAt);
      onSave?.();
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
      setShowNewTemplateInput(false);
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
    if (!confirm('Delete this template?')) return;
    setSaving(true);
    try {
      await api.templates.delete(selectedTemplateId);
      setSelectedTemplateId(null);
      setInstructionText('');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      await loadTemplates();
      await loadInstructions();
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
            Define what kind of articles you want the system to fetch and rank. When you run a fetch,
            the LLM uses this brief to filter and rank articles. Set <code>OPENAI_API_KEY</code> in
            the backend environment for LLM filtering.
          </p>

          {error && (
            <div className="editorial-error">
              {error}
              <button type="button" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          <div className="editorial-templates">
            <label htmlFor="template-select">Template:</label>
            <select
              id="template-select"
              className="editorial-template-select"
              value={selectedTemplateId ?? ''}
              onChange={(e) => void handleSelectTemplate(e.target.value || null)}
            >
              <option value="">— New brief —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selectedTemplateId && (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleDeleteTemplate}
                disabled={saving}
                title="Delete template"
              >
                Delete
              </button>
            )}
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
              onClick={handleApply}
              disabled={saving}
            >
              {saving ? 'Applying…' : 'Apply'}
            </button>
            {selectedTemplateId ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleUpdateTemplate}
                disabled={saving}
              >
                {saving ? 'Updating…' : 'Update template'}
              </button>
            ) : (
              <>
                {showNewTemplateInput ? (
                  <div className="editorial-save-template-row">
                    <input
                      type="text"
                      className="editorial-template-name-input"
                      placeholder="Template name"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAsTemplate();
                        if (e.key === 'Escape') setShowNewTemplateInput(false);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSaveAsTemplate}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setShowNewTemplateInput(false); setNewTemplateName(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowNewTemplateInput(true)}
                  >
                    Save as new template
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default EditorialBrief;
