import './RunSelector.css';

export interface Run {
  id: string;
  runNumber: number;
  createdAt: string;
}

interface RunSelectorProps {
  runs: Run[];
  selectedRunId: string | null;
  onSelectRun: (runId: string | null) => void;
}

function RunSelector({ runs, selectedRunId, onSelectRun }: RunSelectorProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (runs.length === 0) return null;

  return (
    <div className="run-selector">
      <label htmlFor="run-select" className="run-selector-label">
        View run:
      </label>
      <select
        id="run-select"
        value={selectedRunId ?? ''}
        onChange={(e) => onSelectRun(e.target.value || null)}
        className="run-select"
      >
        <option value="">Latest</option>
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            Run {run.runNumber} ({formatDate(run.createdAt)})
          </option>
        ))}
      </select>
    </div>
  );
}

export default RunSelector;
