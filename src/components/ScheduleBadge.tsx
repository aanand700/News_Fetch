import './ScheduleBadge.css';

interface ScheduleBadgeProps {
  onRunFetch?: () => void;
  isFetching?: boolean;
}

function ScheduleBadge({ onRunFetch, isFetching }: ScheduleBadgeProps) {
  return (
    <div className="schedule-badge">
      <span className="schedule-icon" aria-hidden>📅</span>
      <div className="schedule-badge-content">
        <span>
          <strong>Next run:</strong> Mondays & Thursdays
        </span>
        {onRunFetch && (
          <button
            type="button"
            className="btn-run-fetch"
            onClick={onRunFetch}
            disabled={isFetching}
            aria-label="Run RSS fetch now"
          >
            {isFetching ? 'Fetching…' : 'Run fetch now'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ScheduleBadge;
