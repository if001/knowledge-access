import { analyzeArticle } from "../application/analyzeArticle";
import {
  KnowledgeAccessAnalysisModel,
  KnowledgeAccessService,
  KnowledgeCatalog,
  KnowledgeRepository,
  WebClient,
} from "../domain/types";

export interface KnowledgeAccessServiceOptions {
  repository: KnowledgeRepository;
  webClient: WebClient;
  analysisModel: KnowledgeAccessAnalysisModel;
}

class DefaultKnowledgeAccessService implements KnowledgeAccessService {
  constructor(private readonly options: KnowledgeAccessServiceOptions) {}

  async inspectCatalog(): Promise<KnowledgeCatalog> {
    try {
      const items =
        await this.options.repository.listKnowledgeCatalogItems(100);
      const topics = [
        ...new Set(
          items
            .flatMap((item) => [item.title, ...item.tags])
            .map(formatCatalogTopic)
            .filter(Boolean),
        ),
      ].slice(0, 5);
      if (topics.length === 0) {
        return { status: "empty", available: false, topics: [] };
      }
      const updatedAt = items
        .map((item) => item.updatedAt.toISOString())
        .sort()
        .at(-1);
      return {
        status: "available",
        available: true,
        topics,
        ...(updatedAt ? { updatedAt } : {}),
      };
    } catch (error) {
      return {
        status: "unavailable",
        available: false,
        topics: [],
        reason:
          error instanceof Error ? error.message : "Knowledge catalog failed",
      };
    }
  }

  async searchSavedKnowledge(input: {
    query: string;
    limit?: number;
    minScore?: number;
  }) {
    return this.options.repository.searchSavedKnowledge(input.query, {
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.minScore !== undefined ? { minScore: input.minScore } : {}),
    });
  }

  async getSavedArticle(input: {
    articleId?: string;
    url?: string;
  }) {
    if (input.articleId) {
      return this.options.repository.getSavedArticleById(input.articleId);
    }
    if (input.url) {
      return this.options.repository.getSavedArticleByUrl(input.url);
    }
    return null;
  }

  async webList(input: { query: string; limit: number }) {
    return this.options.webClient.webList(input.query, input.limit);
  }

  async webPage(input: { url: string }) {
    return this.options.webClient.webPage(input.url);
  }

  async saveWebKnowledge(input: {
    botId: string;
    threadId?: string;
    url: string;
  }) {
    const page = await this.options.webClient.webPage(input.url);
    const analysis = await analyzeArticle(
      this.options.analysisModel,
      input.botId,
      page.title,
      page.url,
      page.markdown,
      input.threadId,
    );
    const saved = await this.options.repository.saveArticle({
      url: page.url,
      title: page.title,
      summary: analysis.summary,
      content: analysis.content,
      tags: analysis.tags,
      rawMarkdown: page.markdown,
    });
    return {
      articleId: saved.id,
      title: saved.title,
      summary: saved.summary,
      url: saved.url,
    };
  }
}

const formatCatalogTopic = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 79)}…`;
};

export const createKnowledgeAccessService = (
  options: KnowledgeAccessServiceOptions,
): KnowledgeAccessService => new DefaultKnowledgeAccessService(options);
