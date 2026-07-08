import {
  KnowledgeAccessAnalysis,
  KnowledgeAccessAnalysisModel,
} from "../domain/types";

export const analyzeArticle = async (
  model: KnowledgeAccessAnalysisModel,
  botId: string,
  title: string,
  url: string,
  markdown: string,
  threadId?: string,
): Promise<KnowledgeAccessAnalysis> => {
  const parsed = await model.generateJson<{
    summary?: string;
    content?: string;
    tags?: string[];
  }>(
    [
      "あなたは web 記事を解析し、保存用メタデータを返します。",
      "JSON のみを返してください。",
      "summary と content は簡潔な日本語にしてください。",
      "tags は短い文字列の配列にしてください。",
    ].join(" "),
    JSON.stringify({
      instruction: [
        "記事を解析してください。",
        "次の shape で返してください:",
        '- summary: 3-5文の要約',
        "- content: 記事内容の要点説明",
        "- tags: 3-8 個の短いタグ",
      ].join(" "),
      botId,
      ...(threadId ? { threadId } : {}),
      title,
      url,
      markdown,
    }),
  );

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallbackSummary(markdown);
  const content =
    typeof parsed.content === "string" && parsed.content.trim().length > 0
      ? parsed.content.trim()
      : summary;
  const tags = Array.isArray(parsed.tags)
    ? dedupeTags(
        parsed.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      )
    : [];

  return {
    summary,
    content,
    tags,
  };
};

const fallbackSummary = (markdown: string): string =>
  markdown
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

const dedupeTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(tag);
  }
  return result;
};
