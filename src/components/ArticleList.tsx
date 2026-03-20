import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Article } from '../types';
import './ArticleList.css';

interface ArticleListProps {
  articles: Article[];
  onReorder: (articles: Article[]) => void;
}

function SortableArticle({
  article,
  formatDate,
  getScoreColor,
}: {
  article: Article;
  formatDate: (s: string) => string;
  getScoreColor: (n: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`article-card ${isDragging ? 'article-card-dragging' : ''}`}
    >
      <div
        className="article-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <span className="drag-handle-icon">⋮⋮</span>
      </div>
      <div className="article-rank">#{article.rank}</div>
      <div className="article-review-block">
        <span className={`score-badge ${getScoreColor(article.reviewScore)}`}>
          {article.reviewScore}/10
        </span>
        <p className="article-rationale">{article.scoringRationale}</p>
      </div>
      <h3 className="article-title">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h3>
      <p className="article-excerpt">{article.excerpt}</p>
      <div className="article-meta">
        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="article-source">
          {article.source}
        </a>
        <span className="article-date">{formatDate(article.publishedAt)}</span>
      </div>
    </li>
  );
}

function ArticleList({ articles, onReorder }: ArticleListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'score-high';
    if (score >= 6) return 'score-mid';
    return 'score-low';
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = articles.findIndex((a) => a.id === active.id);
    const newIndex = articles.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(articles, oldIndex, newIndex);
    onReorder(reordered);
  };

  if (articles.length === 0) {
    return (
      <section className="article-list">
        <h2>Ranked Articles</h2>
        <div className="article-empty">
          <p>No articles yet. Add RSS feeds and wait for the next crawl (Mondays & Thursdays).</p>
          <p className="article-empty-hint">Articles will be fetched and ranked based on your criteria.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="article-list">
      <h2>Ranked Articles</h2>
      <p className="article-list-desc">
        Drag articles to reorder by your assessment. Each shows score and scoring rationale.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={articles.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <ol className="article-grid">
            {articles.map((article) => (
              <SortableArticle
                key={article.id}
                article={article}
                formatDate={formatDate}
                getScoreColor={getScoreColor}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}

export default ArticleList;
