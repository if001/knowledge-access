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
      listKnowledgeCatalogItems: async () => [],
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

test("inspectCatalog returns bounded hints without article bodies", async () => {
  const service = createKnowledgeAccessService({
    repository: {
      saveArticle: async () => { throw new Error("unused"); },
      getSavedArticleById: async () => null,
      getSavedArticleByUrl: async () => null,
      searchSavedKnowledge: async () => [],
      listKnowledgeCatalogItems: async () => [{
        title: ` ${"TypeScript ".repeat(10)} `,
        tags: ["agents", "memory", "postgres", "retrieval", "design"],
        updatedAt: new Date("2026-09-09T00:00:00.000Z"),
      }],
    },
    webClient: { webList: async () => [], webPage: async () => { throw new Error("unused"); } },
    analysisModel: { generateJson: async () => { throw new Error("unused"); } },
  });

  const catalog = await service.inspectCatalog();

  assert.equal(catalog.status, "available");
  assert.equal(catalog.topics.length, 5);
  assert.equal(catalog.topics[0]?.length, 80);
  assert.equal(catalog.updatedAt, "2026-09-09T00:00:00.000Z");
  assert.equal("summary" in catalog, false);
});

test("inspectCatalog distinguishes an empty store from an unavailable store", async () => {
  const makeService = (listKnowledgeCatalogItems: KnowledgeRepository["listKnowledgeCatalogItems"]) =>
    createKnowledgeAccessService({
      repository: {
        saveArticle: async () => { throw new Error("unused"); },
        getSavedArticleById: async () => null,
        getSavedArticleByUrl: async () => null,
        searchSavedKnowledge: async () => [],
        listKnowledgeCatalogItems,
      },
      webClient: { webList: async () => [], webPage: async () => { throw new Error("unused"); } },
      analysisModel: { generateJson: async () => { throw new Error("unused"); } },
    });

  assert.deepEqual(await makeService(async () => []).inspectCatalog(), {
    status: "empty", available: false, topics: [],
  });
  assert.deepEqual(await makeService(async () => { throw new Error("db offline"); }).inspectCatalog(), {
    status: "unavailable", available: false, topics: [], reason: "db offline",
  });
});
