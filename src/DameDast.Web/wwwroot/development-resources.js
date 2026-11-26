import {
  dailyVocabulary,
  parseWordLines,
  validateLanguage,
} from "./language-model.js";
export async function prepareDevelopmentResources(
  data,
  { file, words, records, save, attached },
) {
  if (["essay", "vocabulary"].includes(data.area)) {
    const pack = dailyVocabulary(records, data.date),
      parsed = parseWordLines(words);
    const changed = JSON.stringify(parsed) !== JSON.stringify(pack.data.words);
    const payload = {
      ...pack.data,
      title: pack.id ? pack.data.title : data.title,
      topic: pack.id ? pack.data.topic : data.notes?.trim() || data.title,
      words: parsed,
      read: changed ? false : pack.data.read,
    };
    validateLanguage("languageVocabulary", payload, records, pack.id);
    if (!pack.id || changed)
      await save(
        "languageVocabulary",
        payload,
        pack.id || crypto.randomUUID(),
        false,
        pack.version,
      );
  }
  if (data.area !== "lesson") {
    data.resourceId = null;
    return;
  }
  if (file?.size) {
    if (!/\.(md|markdown)$/i.test(file.name) || file.size > 200000)
      throw Error("Choose a Markdown file under 200 KB.");
    const markdown = (await file.text()).replace(/^\uFEFF/, "");
    const payload = {
      title: (
        /^#\s+(.+)$/m.exec(markdown)?.[1] ||
        file.name.replace(/\.(md|markdown)$/i, "")
      ).slice(0, 120),
      markdown,
      fileName: file.name,
    };
    validateLanguage("languageLesson", payload);
    data.resourceId = crypto.randomUUID();
    await save("languageLesson", payload, data.resourceId, false, 0);
    attached?.(data.resourceId);
  }
  if (!data.resourceId) throw Error("Choose a Markdown file under 200 KB.");
}
