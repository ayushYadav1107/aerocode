// run: node --test app/api/github-import/route.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTree, parseRepoUrl, shouldSkip, splitFilename } from "./repo-tree.ts";

test("parses the URL shapes people actually paste", () => {
  const expected = { owner: "vercel", repo: "next.js" };
  for (const input of [
    "https://github.com/vercel/next.js",
    "http://github.com/vercel/next.js/",
    "https://www.github.com/vercel/next.js.git",
    "github.com/vercel/next.js",
    "vercel/next.js",
    "  https://github.com/vercel/next.js/tree/main/packages  ",
  ]) {
    assert.deepEqual(parseRepoUrl(input), expected, input);
  }
});

test("rejects junk and path traversal", () => {
  for (const input of ["", "not a url", "https://gitlab.com/a/b", "../../etc"]) {
    assert.equal(parseRepoUrl(input), null, input);
  }
});

test("splits filenames including dotfiles and multi-dot names", () => {
  assert.deepEqual(splitFilename("src/index.ts"), {
    filename: "index",
    fileExtension: "ts",
  });
  assert.deepEqual(splitFilename("a/b/vite.config.mjs"), {
    filename: "vite.config",
    fileExtension: "mjs",
  });
  assert.deepEqual(splitFilename("Dockerfile"), {
    filename: "Dockerfile",
    fileExtension: "",
  });
  // leading dot is not an extension separator
  assert.deepEqual(splitFilename(".gitignore"), {
    filename: ".gitignore",
    fileExtension: "",
  });
});

test("skips vendored dirs and binaries but keeps real source", () => {
  assert.ok(shouldSkip("node_modules/react/index.js"));
  assert.ok(shouldSkip("src/.git/config"));
  assert.ok(shouldSkip("public/logo.png"));
  assert.ok(shouldSkip("package-lock.json".replace("json", "lock")));
  assert.ok(!shouldSkip("src/components/Button.tsx"));
  assert.ok(!shouldSkip("README.md"));
});

test("nests flat paths into one folder tree without duplicating dirs", () => {
  const tree = buildTree("demo", [
    { path: "README.md", content: "hi" },
    { path: "src/index.ts", content: "a" },
    { path: "src/lib/util.ts", content: "b" },
  ]);

  assert.equal(tree.folderName, "demo");
  assert.equal(tree.items.length, 2);

  const src = tree.items.find((i) => "folderName" in i && i.folderName === "src");
  assert.ok(src && "items" in src);
  // src must appear once, holding both index.ts and the lib/ folder
  assert.equal(src.items.length, 2);

  const lib = src.items.find((i) => "folderName" in i && i.folderName === "lib");
  assert.ok(lib && "items" in lib);
  assert.deepEqual(lib.items, [
    { filename: "util", fileExtension: "ts", content: "b" },
  ]);
});
