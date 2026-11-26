import { validIso } from "./calendar.js";
import { escapeHtml as esc } from "./finance.js";
export const languagePages = [
  "languageEssays",
  "languageLessons",
  "languageVocabulary",
];
export const languageKinds = [
  "languageEssay",
  "languageLesson",
  "languageVocabulary",
];
const pack = (title, topic, words) => ({
  title,
  topic,
  words: words.map(([term, meaning, example]) => ({ term, meaning, example })),
});
export const vocabularyPacks = [
  pack(
    "My daily routine",
    "Describe a normal day. What do you do before and after work?",
    [
      ["usually", "معمولاً", "I usually wake up at seven."],
      ["wake up", "بیدار شدن", "I wake up early on weekdays."],
      ["breakfast", "صبحانه", "I have breakfast at home."],
      ["prepare", "آماده کردن", "I prepare my lunch in the morning."],
      ["work", "کار کردن؛ کار", "I work in an office."],
      ["sometimes", "گاهی", "I sometimes walk to work."],
      ["relax", "استراحت کردن", "I relax after dinner."],
      ["evening", "عصر؛ اوایل شب", "I read in the evening."],
    ],
  ),
  pack(
    "Learning something new",
    "Write about something you want to learn and your plan for learning it.",
    [
      ["learn", "یاد گرفتن", "I want to learn English."],
      ["practice", "تمرین کردن؛ تمرین", "I practice every day."],
      ["improve", "بهتر کردن؛ پیشرفت کردن", "I want to improve my writing."],
      ["mistake", "اشتباه", "A mistake can help me learn."],
      ["understand", "فهمیدن", "I understand this lesson."],
      ["question", "سؤال", "I have a question."],
      ["remember", "به یاد آوردن", "I remember new words by using them."],
      ["progress", "پیشرفت", "Small steps lead to progress."],
    ],
  ),
  pack(
    "A friend I appreciate",
    "Describe a friend and explain why you enjoy spending time together.",
    [
      ["friend", "دوست", "My friend lives nearby."],
      ["kind", "مهربان", "She is kind to everyone."],
      ["honest", "صادق", "He is an honest person."],
      ["help", "کمک کردن", "We help each other."],
      ["listen", "گوش دادن", "A good friend can listen."],
      ["together", "با هم", "We cook together."],
      ["trust", "اعتماد کردن؛ اعتماد", "I trust my friend."],
      ["enjoy", "لذت بردن", "We enjoy long walks."],
    ],
  ),
  pack(
    "A place to visit",
    "Describe a place you would like to visit and what you would do there.",
    [
      ["visit", "دیدن؛ بازدید کردن", "I want to visit a small town."],
      ["travel", "سفر کردن", "I like to travel by train."],
      ["quiet", "آرام؛ ساکت", "The village is quiet."],
      ["beautiful", "زیبا", "The mountains are beautiful."],
      ["explore", "گشتن و کشف کردن", "I want to explore the city."],
      ["local", "محلی", "I like local food."],
      ["journey", "سفر؛ مسیر سفر", "The journey takes two hours."],
      ["discover", "کشف کردن", "We can discover new places."],
    ],
  ),
  pack(
    "My favorite meal",
    "Describe your favorite meal, its ingredients and how you prepare it.",
    [
      ["meal", "وعدهٔ غذایی", "Dinner is my favorite meal."],
      ["fresh", "تازه", "I use fresh vegetables."],
      ["cook", "آشپزی کردن", "I cook at home."],
      ["ingredient", "مادهٔ اولیهٔ غذا", "Rice is an important ingredient."],
      ["healthy", "سالم", "I try to eat healthy food."],
      ["taste", "مزه؛ مزه دادن", "The taste is wonderful."],
      ["share", "شریک شدن؛ به اشتراک گذاشتن", "I share food with my family."],
      ["favorite", "موردعلاقه", "Soup is my favorite dish."],
    ],
  ),
  pack(
    "A goal for this year",
    "Write about a personal goal and the small actions that can help you reach it.",
    [
      ["goal", "هدف", "My goal is to read more."],
      ["plan", "برنامه؛ برنامه‌ریزی کردن", "I have a simple plan."],
      ["achieve", "به دست آوردن؛ محقق کردن", "I can achieve my goal."],
      ["effort", "تلاش", "Learning takes effort."],
      ["habit", "عادت", "Reading is a useful habit."],
      ["patient", "صبور", "I need to be patient."],
      ["challenge", "چالش", "This challenge helps me grow."],
      ["success", "موفقیت", "Success takes time."],
    ],
  ),
  pack(
    "A weekend without my phone",
    "Imagine a weekend with less screen time. How would you spend it?",
    [
      ["weekend", "آخر هفته", "I rest at the weekend."],
      ["outside", "بیرون", "I spend more time outside."],
      ["walk", "پیاده‌روی کردن؛ پیاده‌روی", "I go for a walk."],
      ["notice", "متوجه شدن", "I notice the trees around me."],
      ["spend", "صرف کردن؛ گذراندن", "I spend time with my family."],
      ["instead", "در عوض؛ به جای آن", "I read a book instead."],
      ["peaceful", "آرامش‌بخش", "The park is peaceful."],
      ["experience", "تجربه", "It is a new experience."],
    ],
  ),
];
export function dailyVocabulary(records, date) {
  const saved = records.find(
    (r) =>
      !r.deleted && r.kind === "languageVocabulary" && r.data.date === date,
  );
  if (saved) return saved;
  const index =
    ((Math.floor(Date.parse(date + "T12:00:00Z") / 86400000) %
      vocabularyPacks.length) +
      vocabularyPacks.length) %
    vocabularyPacks.length;
  return {
    id: null,
    version: 0,
    kind: "languageVocabulary",
    data: { date, ...structuredClone(vocabularyPacks[index]), read: false },
  };
}
export const wordCount = (body) =>
  (String(body).match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || []).length;
export function usedWords(body, words) {
  const text = body.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  return words
    .filter(({ term }) => {
      const phrase = term
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `(^|[^\\p{L}\\p{N}])${phrase}(?=$|[^\\p{L}\\p{N}])`,
        "u",
      ).test(text);
    })
    .map((w) => w.term);
}
export function parseWordLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [term, meaning, ...example] = line.split("|").map((x) => x.trim());
      return { term, meaning: meaning || "", example: example.join(" | ") };
    });
}
export function rebaseCorrections(previous, next, corrections) {
  let start = 0,
    oldEnd = previous.length,
    newEnd = next.length;
  while (start < oldEnd && start < newEnd && previous[start] === next[start])
    start++;
  while (
    oldEnd > start &&
    newEnd > start &&
    previous[oldEnd - 1] === next[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;
  return corrections.map((c) => {
    if (c.start == null || c.end <= start) return c;
    if (c.start >= oldEnd)
      return { ...c, start: c.start + delta, end: c.end + delta };
    return { ...c, start: null, end: null };
  });
}
export function reviewedEssay(body, corrections) {
  let end = 0,
    result = "";
  for (const c of corrections
    .filter((c) => c.start != null && body.slice(c.start, c.end) === c.original)
    .sort((a, b) => a.start - b.start)) {
    if (c.start < end) continue;
    result +=
      esc(body.slice(end, c.start)) +
      `<mark class="language-error" title="${esc(c.replacement)}">${esc(c.original)}</mark>`;
    end = c.end;
  }
  return result + esc(body.slice(end));
}
const guid = (value) =>
  typeof value === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value) &&
  !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
const text = (value, max, empty = false) =>
  typeof value === "string" &&
  value.length <= max &&
  (empty || value.trim().length > 0);
const wordsValid = (words) =>
  Array.isArray(words) &&
  words.length > 0 &&
  words.length <= 30 &&
  new Set(words.map((w) => w?.term?.toLowerCase())).size === words.length &&
  words.every(
    (w) =>
      w &&
      text(w.term, 80) &&
      w.term === w.term.trim() &&
      text(w.meaning, 200) &&
      text(w.example, 300, true),
  );
export function validateLanguage(kind, data, records = [], id = null) {
  if (!languageKinds.includes(kind)) return;
  if (!data || !text(data.title, 120, kind === "languageEssay"))
    throw Error("Enter a valid language title.");
  if (kind === "languageLesson") {
    if (!text(data.markdown, 200000) || !text(data.fileName, 200, true))
      throw Error("Choose a Markdown file under 200 KB.");
    return;
  }
  if (!validIso(data.date)) throw Error("Choose a valid language date.");
  if (
    records.some(
      (r) =>
        !r.deleted &&
        r.kind === kind &&
        r.id !== id &&
        r.data.date === data.date,
    )
  )
    throw Error("This day already has an entry. Open it to edit.");
  if (kind === "languageVocabulary") {
    if (
      !wordsValid(data.words) ||
      !text(data.topic, 300) ||
      typeof data.read !== "boolean"
    )
      throw Error("Enter up to 30 unique words with their meanings.");
    return;
  }
  const vocabulary = records.find(
    (r) =>
      !r.deleted &&
      r.kind === "languageVocabulary" &&
      r.id === data.vocabularyId,
  );
  if (
    !guid(data.vocabularyId) ||
    !vocabulary ||
    vocabulary.data.date !== data.date ||
    !wordsValid(data.assignedWords)
  )
    throw Error("Save the daily words before the essay.");
  const previous = records.find(
    (r) => !r.deleted && r.kind === kind && r.id === id,
  );
  const expected = previous?.data.assignedWords || vocabulary.data.words;
  if (
    data.assignedWords.length !== expected.length ||
    data.assignedWords.some(
      (w, i) =>
        w.term !== expected[i].term ||
        w.meaning !== expected[i].meaning ||
        w.example !== expected[i].example,
    ) ||
    (previous &&
      (previous.data.date !== data.date ||
        previous.data.vocabularyId !== data.vocabularyId))
  )
    throw Error("The assigned words changed. Reopen the essay.");
  if (
    !text(data.body, 20000) ||
    typeof data.reviewed !== "boolean" ||
    !Array.isArray(data.corrections) ||
    data.corrections.length > 100
  )
    throw Error("Enter an essay under 20000 characters.");
  const ranges = [];
  for (const c of data.corrections) {
    if (
      !guid(c?.id) ||
      !text(c.original, 2000) ||
      !text(c.replacement, 2000) ||
      !text(c.explanation, 1000, true)
    )
      throw Error("Enter the correction for the selected text.");
    if (c.start == null && c.end == null) continue;
    if (
      !Number.isInteger(c.start) ||
      !Number.isInteger(c.end) ||
      c.start < 0 ||
      c.end <= c.start ||
      c.end > data.body.length ||
      data.body.slice(c.start, c.end) !== c.original ||
      ranges.some(([s, e]) => c.start < e && c.end > s)
    )
      throw Error("Select a different part of the essay.");
    ranges.push([c.start, c.end]);
  }
  if (
    new Set(data.corrections.map((c) => c.id)).size !== data.corrections.length
  )
    throw Error("Invalid essay corrections.");
}
