export interface RssFeed {
  id: string;
  url: string;
  name: string;
  addedAt: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  excerpt: string;
  rank: number;
  reviewScore: number;
  scoringRationale: string;
}
