# knowledge-access

`knowledge-access` is a shared package for:

- searching saved knowledge
- fetching web search results and web pages
- analyzing fetched articles with an LLM
- saving analyzed articles into Postgres

This package does not provide a topic-planning agent.
It provides the lower-level knowledge and web access functions that other systems can wrap as tools.

## Responsibilities

The package owns:

- Postgres-backed knowledge storage
- web search / web page fetch access
- article analysis for summary/content/tags
- `saveWebKnowledge(...)` as a single entrypoint for fetch -> analyze -> persist

Typical callers are:

- the root main agent
- `simple-pomdp-system` exploit flow

## Main API

From [src/index.ts](/home/issei/prog/mcp/chat_agent/packages/knowledge-access/src/index.ts):

- `createKnowledgeAccessService(...)`
- `createPostgresPool(...)`
- `createDrizzleClient(...)`
- `PostgresKnowledgeRepository`
- `SimpleWebClient`
- `OllamaEmbeddingProvider`
- `createOllamaKnowledgeAccessAnalysisModel(...)`

## KnowledgeAccessService

The main service API is:

- `searchSavedKnowledge({ query, limit?, minScore? })`
- `getSavedArticle({ articleId?, url? })`
- `webList({ query, limit })`
- `webPage({ url })`
- `saveWebKnowledge({ botId, threadId?, url })`

`saveWebKnowledge(...)` performs:

1. fetch page content
2. analyze the page with the configured LLM
3. save the analyzed article into Postgres

## Required Runtime Dependencies

To construct the package in an app, you typically need:

- Postgres connection string
- web backend base URL
- Ollama embedding model settings
- Ollama chat model settings for article analysis

The root app and `simple-pomdp-system` pass these in explicitly.

## Expected Environment Variables

Typical settings:

```bash
POSTGRES_URL=postgresql://app_user:app_password@localhost:5432/chat_agent
SIMPLE_CLIENT_BASE_URL=http://localhost:8000

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_API_KEY=

OLLAMA_EMBEDDING_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_DIMENSION=1024
```

Notes:

- embedding settings are separate from chat-model settings
- `knowledge-access` uses the embedding settings for vector search
- article analysis uses the chat-model settings

## Example

```ts
import {
  createDrizzleClient,
  createKnowledgeAccessService,
  createOllamaKnowledgeAccessAnalysisModel,
  createPostgresPool,
  OllamaEmbeddingProvider,
  PostgresKnowledgeRepository,
  SimpleWebClient,
} from "@chat-agent/knowledge-access";

const pool = createPostgresPool(process.env.POSTGRES_URL!);
const db = createDrizzleClient(pool);

const embeddingProvider = new OllamaEmbeddingProvider(
  process.env.OLLAMA_EMBEDDING_BASE_URL!,
  process.env.OLLAMA_EMBEDDING_MODEL!,
);

const repository = new PostgresKnowledgeRepository(db, embeddingProvider);
const webClient = new SimpleWebClient(process.env.SIMPLE_CLIENT_BASE_URL!);
const analysisModel = createOllamaKnowledgeAccessAnalysisModel(
  process.env.OLLAMA_BASE_URL!,
  process.env.OLLAMA_CHAT_MODEL!,
  process.env.OLLAMA_API_KEY,
);

const knowledgeAccessService = createKnowledgeAccessService({
  repository,
  webClient,
  analysisModel,
});
```

## Design Notes

- This package may use LLMs for article analysis.
- This package should not decide what topic to research next.
- Higher-level systems should wrap this package as tools when agentic behavior is needed.
