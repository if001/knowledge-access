export interface SavedArticle {
  id: string;
  url: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  rawMarkdown: string;
  createdAt: Date;
}

export interface SearchResultItem {
  articleId: string;
  score: number;
  title: string;
  summary: string;
  tags: string[];
  url: string;
}

export interface SearchKnowledgeOptions {
  limit?: number;
  minScore?: number;
}

export interface KnowledgeCatalog {
  status: "available" | "empty" | "unavailable";
  available: boolean;
  topics: string[];
  updatedAt?: string;
  reason?: string;
}

export interface KnowledgeCatalogSourceItem {
  title: string;
  tags: string[];
  updatedAt: Date;
}

export interface WebListItem {
  rank: number;
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
}

export interface WebPage {
  url: string;
  title: string;
  markdown: string;
}

export interface KnowledgeRepository {
  saveArticle(
    article: Omit<SavedArticle, "id" | "createdAt">,
  ): Promise<SavedArticle>;
  getSavedArticleById(articleId: string): Promise<SavedArticle | null>;
  getSavedArticleByUrl(url: string): Promise<SavedArticle | null>;
  searchSavedKnowledge(
    query: string,
    options?: SearchKnowledgeOptions,
  ): Promise<SearchResultItem[]>;
  listKnowledgeCatalogItems(
    limit: number,
  ): Promise<KnowledgeCatalogSourceItem[]>;
}

export interface WebClient {
  webList(query: string, k: number): Promise<WebListItem[]>;
  webPage(url: string): Promise<WebPage>;
}

export interface KnowledgeAccessAnalysis {
  summary: string;
  content: string;
  tags: string[];
}

export interface KnowledgeAccessAnalysisModel {
  generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T>;
}

export interface KnowledgeAccessService {
  inspectCatalog(): Promise<KnowledgeCatalog>;
  searchSavedKnowledge(input: {
    query: string;
    limit?: number;
    minScore?: number;
  }): Promise<SearchResultItem[]>;
  getSavedArticle(input: {
    articleId?: string;
    url?: string;
  }): Promise<SavedArticle | null>;
  webList(input: {
    query: string;
    limit: number;
  }): Promise<WebListItem[]>;
  webPage(input: {
    url: string;
  }): Promise<WebPage>;
  saveWebKnowledge(input: {
    botId: string;
    threadId?: string;
    url: string;
  }): Promise<{
    articleId: string;
    title: string;
    summary: string;
    url: string;
  }>;
}
