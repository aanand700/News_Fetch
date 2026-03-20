/**
 * Generates a review score (1-10) and rationale for an article.
 * Uses simple heuristics when no user instructions; can use AI/LLM with instructions later.
 */
export function scoreArticle(
  title: string,
  excerpt: string,
  publishedAt: string,
  _userInstructions?: string
): { score: number; rationale: string } {
  let score = 6; // Base score
  const reasons: string[] = [];

  // Length-based: longer excerpts suggest more substantial content
  if (excerpt.length > 200) {
    score += 1;
    reasons.push('substantial content');
  }
  if (excerpt.length > 100) {
    score += 0.5;
  }

  // Recency: newer articles get a slight boost
  const age = Date.now() - new Date(publishedAt).getTime();
  const daysOld = age / (1000 * 60 * 60 * 24);
  if (daysOld < 1) {
    score += 0.5;
    reasons.push('very recent');
  } else if (daysOld < 7) {
    reasons.push('recent');
  }

  // Title quality: question marks or very short titles might be less substantive
  if (title.length > 50 && !title.endsWith('?')) {
    score += 0.5;
    reasons.push('descriptive title');
  }

  score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

  const rationale =
    reasons.length > 0
      ? `Rated based on: ${reasons.join(', ')}.`
      : 'Fetched from RSS. Pending manual review.';

  return { score, rationale };
}
