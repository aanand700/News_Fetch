import OpenAI from 'openai';

export interface ArticleForReview {
  url: string;
  title: string;
  excerpt: string;
  source: string;
  publishedAt: string;
}

export interface ReviewedArticle {
  url: string;
  score: number;
  rationale: string;
}

const MAX_ARTICLES_TO_RETURN = 100;

const FETCH_APPROACH_RULES = `## Fetch & ranking approach (MUST follow)
- Articles are fetched from feeds SERIALLY, one feed at a time, in a deterministic order.
- All articles are COLLATED first, then ranked together.
- DEDUPLICATE: If the same story appears from multiple feeds (different URLs but same/similar content), keep only ONE entry. Prefer the most authoritative or primary source. Remove duplicates during ranking.
- Comprehensive coverage is critical—prioritize thoroughness over speed.`;

export async function filterAndRankWithLLM(
  articles: ArticleForReview[],
  userInstructions: string,
  apiKey: string
): Promise<ReviewedArticle[]> {
  if (articles.length === 0) return [];

  const openai = new OpenAI({ apiKey });

  const articlesJson = JSON.stringify(
    articles.map((a) => ({
      url: a.url,
      title: a.title,
      excerpt: a.excerpt.slice(0, 500),
      source: a.source,
      publishedAt: a.publishedAt,
    })),
    null,
    2
  );

  const systemPrompt = `You are an editor filtering and ranking news articles based on the user's editorial brief.

${FETCH_APPROACH_RULES}

Given a list of articles and the user's criteria, you must:
1. FILTER: Exclude articles that do not match the user's criteria (e.g., EXCLUDE/DOWNRANK items).
2. RANK: Order the remaining articles by relevance to the brief (most relevant first).
3. SCORE: Assign each kept article a score from 1-10 based on how well it matches the criteria.
4. RATIONALE: Write 1-2 sentences explaining why each article was included and scored as such.
5. DEDUPLICATE: When the same story appears from multiple feeds, keep only one—choose the best source. Remove duplicates before ranking.

Return a JSON object with this exact structure (no markdown, no code blocks):
{
  "articles": [
    {
      "url": "<exact url from input>",
      "score": <number 1-10>,
      "rationale": "<1-2 sentence explanation>"
    }
  ]
}

Return ONLY articles that pass the filter. Return at most ${MAX_ARTICLES_TO_RETURN} articles.
If no articles match the criteria, return {"articles": []}.
The "url" field MUST exactly match one of the input URLs.`;

  const userPrompt = `## User's Editorial Brief

${userInstructions}

---

## Articles to filter and rank

${articlesJson}

---

Return the filtered and ranked articles as JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');

  let parsed: { articles?: ReviewedArticle[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON from LLM');
  }

  const results = Array.isArray(parsed.articles) ? parsed.articles : [];
  const urlSet = new Set(articles.map((a) => a.url));

  return results.filter((r) => urlSet.has(r.url)).slice(0, MAX_ARTICLES_TO_RETURN);
}
