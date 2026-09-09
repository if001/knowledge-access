import { cosineDistance, desc, eq, gte, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  KnowledgeRepository,
  SavedArticle,
  SearchKnowledgeOptions,
  SearchResultItem,
  KnowledgeCatalogSourceItem,
} from "../../domain/types";
import { articlesTable } from "./schema";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export class PostgresKnowledgeRepository implements KnowledgeRepository {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async saveArticle(
    article: Omit<SavedArticle, "id" | "createdAt">,
  ): Promise<SavedArticle> {
    const embedding = await this.embeddingProvider.embed(
      [article.title, article.summary, article.tags.join(", ")].join("\n"),
    );
    const id = `article_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const [row] = await this.db
      .insert(articlesTable)
      .values({
        id,
        url: article.url,
        title: article.title,
        summary: article.summary,
        content: article.content,
        tags: article.tags,
        rawMarkdown: article.rawMarkdown,
        embedding,
      })
      .onConflictDoUpdate({
        target: articlesTable.url,
        set: {
          title: article.title,
          summary: article.summary,
          content: article.content,
          tags: article.tags,
          rawMarkdown: article.rawMarkdown,
          embedding,
        },
      })
      .returning();
    const saved = mapSavedArticle(row);
    if (!saved) {
      throw new Error("Failed to save article");
    }
    return saved;
  }

  async getSavedArticleById(articleId: string): Promise<SavedArticle | null> {
    const rows = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .limit(1);
    return mapSavedArticle(rows[0]);
  }

  async getSavedArticleByUrl(url: string): Promise<SavedArticle | null> {
    const rows = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.url, url))
      .limit(1);
    return mapSavedArticle(rows[0]);
  }

  async searchSavedKnowledge(
    query: string,
    options?: SearchKnowledgeOptions,
  ): Promise<SearchResultItem[]> {
    const embedding = await this.embeddingProvider.embed(query);
    const limit = options?.limit ?? 10;
    const minScore = options?.minScore ?? 0;
    const distance = cosineDistance(articlesTable.embedding, embedding);
    const score = sql<number>`1 - (${distance})`;
    const rows = await this.db
      .select({
        id: articlesTable.id,
        url: articlesTable.url,
        title: articlesTable.title,
        summary: articlesTable.summary,
        tags: articlesTable.tags,
        score,
      })
      .from(articlesTable)
      .where(gte(score, minScore))
      .orderBy(distance)
      .limit(limit);

    return rows.map((row) => ({
      articleId: row.id,
      score: row.score,
      title: row.title,
      summary: row.summary,
      tags: row.tags,
      url: row.url,
    }));
  }

  async listKnowledgeCatalogItems(
    limit: number,
  ): Promise<KnowledgeCatalogSourceItem[]> {
    const rows = await this.db
      .select({
        title: articlesTable.title,
        tags: articlesTable.tags,
        updatedAt: articlesTable.createdAt,
      })
      .from(articlesTable)
      .orderBy(desc(articlesTable.createdAt))
      .limit(limit);
    return rows.map((row) => ({ ...row, updatedAt: new Date(row.updatedAt) }));
  }
}

const mapSavedArticle = (
  row: typeof articlesTable.$inferSelect | undefined,
): SavedArticle | null => {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    content: row.content,
    tags: row.tags,
    rawMarkdown: row.rawMarkdown,
    createdAt: new Date(row.createdAt),
  };
};
