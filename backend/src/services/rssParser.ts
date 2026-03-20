import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 60000,
  headers: {
    'User-Agent': 'NewsCollection/1.0 (RSS Reader)',
  },
});

export interface ParsedArticle {
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  excerpt: string;
}

export async function fetchFeedArticles(
  feedUrl: string,
  feedName: string
): Promise<ParsedArticle[]> {
  const feed = await parser.parseURL(feedUrl);
  const items = feed.items || [];
  const baseUrl = feed.link || feedUrl;

  return items.map((item) => ({
    title: item.title || 'Untitled',
    url: item.link || item.guid || '',
    source: feedName,
    sourceUrl: baseUrl,
    publishedAt: item.pubDate || new Date().toISOString(),
    excerpt: (item.contentSnippet || item.content || item.summary || '').slice(0, 300) || 'No excerpt',
  }));
}
