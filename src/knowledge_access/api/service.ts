import { analyzeArticle } from "../application/analyzeArticle";
import {
  KnowledgeAccessAnalysisModel,
  KnowledgeAccessService,
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

export const createKnowledgeAccessService = (
  options: KnowledgeAccessServiceOptions,
): KnowledgeAccessService => new DefaultKnowledgeAccessService(options);
