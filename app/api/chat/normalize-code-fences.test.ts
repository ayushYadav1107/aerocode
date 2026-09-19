// run: node --test app/api/chat/normalize-code-fences.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCodeFences } from "./normalize-code-fences.ts";

test("wraps bare code that arrived with no fence", () => {
  const raw = `function toLowerCase(str) { return str.toLowerCase(); }
// Example usage: const original = "HELLO WORLD";`;
  assert.equal(
    normalizeCodeFences(raw, "javascript"),
    "```javascript\n" + raw + "\n```",
  );
});

test("labels an unlabelled fence and leaves a labelled one alone", () => {
  assert.equal(
    normalizeCodeFences("```\nprint(1)\n```", "python"),
    "```python\nprint(1)\n```",
  );
  const labelled = "```python\nprint(1)\n```";
  assert.equal(normalizeCodeFences(labelled, "javascript"), labelled);
});

test("leaves prose unfenced", () => {
  const prose =
    "You should memoize that component.\nIt re-renders on every keystroke otherwise.";
  assert.equal(normalizeCodeFences(prose, "typescript"), prose);
});

test("does not relabel the closing fence of a labelled block", () => {
  const mixed = "Here you go:\n\n```\nconst a = 1;\n```\n\nThat is all.";
  assert.equal(
    normalizeCodeFences(mixed, "ts"),
    "Here you go:\n\n```ts\nconst a = 1;\n```\n\nThat is all.",
  );
});
