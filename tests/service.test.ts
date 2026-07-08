import assert from "node:assert/strict";
import { test } from "vitest";
import {
  createKnowledgeAccessService,
  KnowledgeAccessAnalysisModel,
  KnowledgeRepository,
  SavedArticle,
  WebClient,
} from "../src";

test("saveWebKnowledge fetches, analyzes, and saves article", async () => {
  let savedInput: Omit<SavedArticle, "id" | "createdAt"> | null = null;
  const service = createKnowledgeAccessService({
    repository: {
      saveArticle: async (article) => {
        savedInput = article;
        return {
          id: "a1",
          createdAt: new Date("2026-06-26T00:00:00.000Z"),
          ...article,
        };
      },
      getSavedArticleById: async () => null,
      getSavedArticleByUrl: async () => null,
      searchSavedKnowledge: async () => [],
    } satisfies KnowledgeRepository,
    webClient: {
      webList: async () => [],
      webPage: async () => ({
        url: "https://example.com/article",
        title: "Example Article",
        markdown: "# hello",
      }),
    } satisfies WebClient,
    analysisModel: {
      generateJson: async () => ({
        summary: "summary",
        content: "content",
        tags: ["tag1", "tag2"],
      }),
    } satisfies KnowledgeAccessAnalysisModel,
  });

  const saved = await service.saveWebKnowledge({
    botId: "ao",
    threadId: "thread-1",
    url: "https://example.com/article",
  });

  assert.equal(saved.articleId, "a1");
  assert.equal(savedInput?.summary, "summary");
  assert.deepEqual(savedInput?.tags, ["tag1", "tag2"]);
});
