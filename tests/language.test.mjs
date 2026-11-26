import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyVocabulary,
  vocabularyPacks,
  usedWords,
  validateLanguage,
  reviewedEssay,
  rebaseCorrections,
  parseWordLines,
} from "../src/DameDast.Web/wwwroot/language-model.js";
import { renderMarkdown } from "../src/DameDast.Web/wwwroot/language-markdown.js";
import {
  selectBackupRecords,
  validateBackup,
} from "../src/DameDast.Web/wwwroot/backup.js";
const id = "11111111-1111-4111-8111-111111111111",
  essayId = "22222222-2222-4222-8222-222222222222";
const pack = () => ({ ...dailyVocabulary([], "2026-11-26"), id });
const essay = (v) => ({
  date: v.data.date,
  title: "Practice",
  body: "I usually work at home.",
  vocabularyId: v.id,
  assignedWords: structuredClone(v.data.words),
  corrections: [],
  reviewed: false,
});
test("daily words exist before an essay, are deterministic and can be customized without changing previous assignments", () => {
  assert.equal(vocabularyPacks.length, 7);
  assert.equal(
    vocabularyPacks.reduce((n, p) => n + p.words.length, 0),
    56,
  );
  const v = pack();
  validateLanguage(v.kind, v.data, [], id);
  assert.deepEqual(
    dailyVocabulary([], v.data.date),
    dailyVocabulary([], v.data.date),
  );
  const data = essay(v);
  validateLanguage("languageEssay", data, [v], essayId);
  validateLanguage(
    "languageEssay",
    { ...data, reviewNotes: "Use am with I. فارسی" },
    [v],
    essayId,
  );
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      { ...data, reviewNotes: "x".repeat(5001) },
      [v],
      essayId,
    ),
  );
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      { ...data, reviewNotes: null },
      [v],
      essayId,
    ),
  );
  const saved = { id: essayId, kind: "languageEssay", version: 1, data };
  const edited = {
    ...v,
    data: {
      ...v.data,
      words: [{ term: "different", meaning: "متفاوت", example: "" }],
    },
  };
  validateLanguage(
    "languageEssay",
    { ...data, title: "Renamed" },
    [edited, saved],
    essayId,
  );
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      { ...data, assignedWords: edited.data.words },
      [edited, saved],
      essayId,
    ),
  );
  assert.throws(() => validateLanguage("languageEssay", data, [], essayId));
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      data,
      [v, saved],
      "33333333-3333-4333-8333-333333333333",
    ),
  );
});
test("word use matches complete words and phrases rather than substrings", () => {
  const words = [
    { term: "work" },
    { term: "wake up" },
    { term: "I" },
    { term: "learn" },
  ];
  assert.deepEqual(
    usedWords("I wake up and work, but not homework or learning.", words),
    ["work", "wake up", "I"],
  );
});
test("corrections stay anchored after edits before them and remain as detached notes after edits inside them", () => {
  const c = {
    id: crypto.randomUUID(),
    start: 2,
    end: 4,
    original: "is",
    replacement: "am",
    explanation: "",
  };
  const moved = rebaseCorrections("I is happy.", "Today I is happy.", [c]);
  assert.equal(moved[0].start, 8);
  const detached = rebaseCorrections("I is happy.", "I am happy.", [c]);
  assert.equal(detached[0].start, null);
  assert.equal(detached[0].replacement, "am");
  const html = reviewedEssay("I is <script>alert(1)</script>", [c]);
  assert.match(html, /class="language-error"/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
test("invalid or overlapping correction ranges and oversized lesson content are rejected", () => {
  const v = pack(),
    data = essay(v),
    c = {
      id: crypto.randomUUID(),
      start: 0,
      end: 1,
      original: "I",
      replacement: "We",
      explanation: "",
    };
  validateLanguage(
    "languageEssay",
    { ...data, corrections: [c] },
    [v],
    essayId,
  );
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      { ...data, corrections: [c, { ...c, id: crypto.randomUUID() }] },
      [v],
      essayId,
    ),
  );
  assert.throws(() =>
    validateLanguage(
      "languageEssay",
      { ...data, corrections: [{ ...c, end: 9 }] },
      [v],
      essayId,
    ),
  );
  assert.throws(() =>
    validateLanguage("languageLesson", {
      title: "Lesson",
      fileName: "x.md",
      markdown: "x".repeat(200001),
    }),
  );
  assert.deepEqual(
    parseWordLines("learn | یاد گرفتن | I learn daily.\n work | کار"),
    [
      { term: "learn", meaning: "یاد گرفتن", example: "I learn daily." },
      { term: "work", meaning: "کار", example: "" },
    ],
  );
});
test("Markdown renders lesson structure while escaping raw HTML and refusing executable links", () => {
  const html = renderMarkdown(
    "# Lesson\n\n**Bold** and *italic*\n\n| Word | Meaning |\n| --- | --- |\n| learn | یاد گرفتن |\n\n- First\n- Second\n\n```js\n<script>alert(1)</script>\n```\n\n[x](javascript:alert)\n<img src=x onerror=alert(1)>",
  );
  assert.match(html, /<h1/);
  assert.match(html, /<table\b/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script|<img|href="javascript:/);
});
test("language records belong to writing backups with the essay-to-vocabulary relationship intact", () => {
  const v = pack(),
    e = { id: essayId, kind: "languageEssay", version: 1, data: essay(v) },
    lesson = {
      id: "33333333-3333-4333-8333-333333333333",
      kind: "languageLesson",
      version: 1,
      data: {
        title: "Grammar",
        fileName: "grammar.md",
        markdown: "# Present simple",
      },
    };
  const records = [e, lesson, v];
  assert.equal(selectBackupRecords(records, "notes").length, 3);
  assert.equal(selectBackupRecords(records, "finance").length, 0);
  const backup = validateBackup({
    format: "damdast-v3",
    section: "notes",
    records,
  });
  assert.equal(backup.records[0].data.vocabularyId, id);
});
