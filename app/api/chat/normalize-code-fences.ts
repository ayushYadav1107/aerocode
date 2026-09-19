// Local models emit code with no ``` fence, or a fence with no language, which
// react-markdown renders as prose so EnhancedCodeBlock never mounts.

const CODE_HINT =
  /^\s*(\/\/|#|\/\*|import |from |export |def |class |function |const |let |var |return |public |private |if |for |while |try |catch |print\(|console\.)|[{};]\s*$|=>/;

export function normalizeCodeFences(text: string, language?: string): string {
  const lang = language || "javascript";

  if (text.includes("```")) {
    let open = false;
    return text
      .split("\n")
      .map((line) => {
        if (!line.trimStart().startsWith("```")) return line;
        open = !open;
        return open && line.trim() === "```" ? "```" + lang : line;
      })
      .join("\n");
  }

  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return text;

  const codeLines = lines.filter((line) => CODE_HINT.test(line)).length;
  // ponytail: line-shape heuristic, swap for a real tokenizer if prose gets wrapped
  if (codeLines / lines.length < 0.6) return text;

  return "```" + lang + "\n" + text.trim() + "\n```";
}
