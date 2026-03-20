import { db } from '../db/schema.js';
import { fetchFeedArticles } from './rssParser.js';
import { scoreArticle } from './reviewService.js';
import { filterAndRankWithLLM, type ArticleForReview } from './llmReviewService.js';
import crypto from 'crypto';

type ArticleToStore = {
  feedId: string;
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  excerpt: string;
};

async function storeWithHeuristic(articles: ArticleToStore[], userId: string, runId: string): Promise<number> {
  const insertStmt = db.prepare(
    `INSERT INTO articles (id, user_id, feed_id, run_id, title, url, source, source_url, published_at, excerpt, rank, review_score, scoring_rationale)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let rank = 1;
  for (const article of articles) {
    const { score, rationale } = scoreArticle(
      article.title,
      article.excerpt,
      article.publishedAt,
      undefined
    );
    await insertStmt.run(
      crypto.randomUUID(),
      userId,
      article.feedId,
      runId,
      article.title,
      article.url,
      article.source,
      article.sourceUrl,
      article.publishedAt,
      article.excerpt,
      rank,
      score,
      rationale
    );
    rank++;
  }
  return articles.length;
}

export async function fetchAllFeedsForUser(userId: string): Promise<{
  added: number;
  errors: string[];
  usedLLM: boolean;
  runId: string;
  runNumber: number;
  fetchedFromRss: number;
  newFromRss: number;
}> {
  const instructionsRow = (await db
    .prepare('SELECT instruction_text FROM user_instructions WHERE user_id = ?')
    .get(userId)) as { instruction_text: string } | undefined;
  const userInstructions = instructionsRow?.instruction_text ?? '';

  const apiKey = process.env.OPENAI_API_KEY;
  const useLLM = Boolean(apiKey && userInstructions.trim().length > 0);

  const feeds = (await db
    .prepare('SELECT id, url, name FROM feeds WHERE user_id = ? ORDER BY added_at ASC')
    .all(userId)) as {
    id: string;
    url: string;
    name: string;
  }[];

  const existingUrls = new Set(
    (await db.prepare('SELECT url FROM articles WHERE user_id = ?').all(userId) as { url: string }[]).map(
      (r) => r.url
    )
  );

  let totalFetchedFromRss = 0;
  const allNewArticles: {
    feedId: string;
    feedUrl: string;
    feedName: string;
    title: string;
    url: string;
    source: string;
    sourceUrl: string;
    publishedAt: string;
    excerpt: string;
  }[] = [];

  const errors: string[] = [];

  // Fetch feeds serially, one by one (order: added_at ASC). Collate all articles, then rank.
  for (const feed of feeds) {
    try {
      const articles = await fetchFeedArticles(feed.url, feed.name);
      totalFetchedFromRss += articles.length;
      for (const article of articles) {
        if (!article.url || existingUrls.has(article.url)) continue;
        allNewArticles.push({
          feedId: feed.id,
          feedUrl: feed.url,
          feedName: feed.name,
          title: article.title,
          url: article.url,
          source: article.source,
          sourceUrl: article.sourceUrl,
          publishedAt: article.publishedAt,
          excerpt: article.excerpt,
        });
        existingUrls.add(article.url);
      }
    } catch (err) {
      errors.push(`${feed.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  const maxRunRow = (await db
    .prepare('SELECT COALESCE(MAX(run_number), 0) as m FROM runs WHERE user_id = ?')
    .get(userId)) as { m: number } | undefined;
  const maxRun = maxRunRow?.m ?? 0;
  const runNumber = maxRun + 1;
  const runId = crypto.randomUUID();
  await db.prepare('INSERT INTO runs (id, user_id, run_number) VALUES (?, ?, ?)').run(runId, userId, runNumber);

  let added = 0;

  if (allNewArticles.length === 0) {
    return { added: 0, errors, usedLLM: useLLM, runId, runNumber, fetchedFromRss: totalFetchedFromRss, newFromRss: 0 };
  }

  if (useLLM && apiKey) {
    try {
      const articlesForReview: ArticleForReview[] = allNewArticles.map((a) => ({
        url: a.url,
        title: a.title,
        excerpt: a.excerpt,
        source: a.source,
        publishedAt: a.publishedAt,
      }));

      const reviewed = await filterAndRankWithLLM(articlesForReview, userInstructions, apiKey as string);

      const insertStmt = db.prepare(
        `INSERT INTO articles (id, user_id, feed_id, run_id, title, url, source, source_url, published_at, excerpt, rank, review_score, scoring_rationale)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      let rank = 1;
      for (const r of reviewed) {
        const article = allNewArticles.find((a) => a.url === r.url);
        if (!article) continue;

        await insertStmt.run(
          crypto.randomUUID(),
          userId,
          article.feedId,
          runId,
          article.title,
          article.url,
          article.source,
          article.sourceUrl,
          article.publishedAt,
          article.excerpt,
          rank,
          r.score,
          r.rationale
        );
        added++;
        rank++;
      }
    } catch (err) {
      errors.push(`LLM filtering: ${err instanceof Error ? err.message : 'Unknown error'}`);
      added = await storeWithHeuristic(allNewArticles, userId, runId);
    }
  } else {
    added = await storeWithHeuristic(allNewArticles, userId, runId);
  }

  return {
    added,
    errors,
    usedLLM: useLLM,
    runId,
    runNumber,
    fetchedFromRss: totalFetchedFromRss,
    newFromRss: allNewArticles.length,
  };
}
