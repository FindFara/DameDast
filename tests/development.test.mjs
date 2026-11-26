import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import {
  developmentWeek,
  developmentMonth,
  developmentEntries,
  developmentProgress,
  validateDevelopment,
} from "../src/DameDast.Web/wwwroot/development.js";
import { prepareDevelopmentResources } from "../src/DameDast.Web/wwwroot/development-resources.js";
import {
  validateExercise,
  stopwatchElapsed,
  countdownRemaining,
  clockText,
} from "../src/DameDast.Web/wwwroot/exercise.js";
import {
  workoutTimerPage,
  workoutProgramsPage,
  weightPlanPage,
} from "../src/DameDast.Web/wwwroot/exercise-ui.js";
import { ExerciseClock } from "../src/DameDast.Web/wwwroot/exercise-clock.js";
import { plannerItems, shiftDay } from "../src/DameDast.Web/wwwroot/planner.js";
import {
  selectBackupRecords,
  validateBackup,
} from "../src/DameDast.Web/wwwroot/backup.js";
const row = (area = "study", date = "2026-11-26", done = false) => ({
  id: crypto.randomUUID(),
  kind: "developmentEntry",
  version: 1,
  data: {
    date,
    area,
    title: "Practice",
    minutes: 30,
    notes: "",
    done,
    resourceId: null,
  },
});

test("weekly dates start Saturday and the next week after a Friday starts the following day", () => {
  const week = developmentWeek("2026-11-27");
  assert.equal(week[0], "2026-11-21");
  assert.equal(shiftDay(week[0], 7), "2026-11-28");
  assert.equal(week.at(-1), "2026-11-27");
  const month = developmentMonth("2026-11-26").filter(Boolean);
  assert.equal(new Set(month).size, 30);
  assert.ok(month.includes("2026-11-26"));
});
test("plans appear once in the calendar and language status follows actual review and reading", () => {
  const essay = row("essay"),
    vocabulary = row("vocabulary"),
    study = row("study", "2026-11-26", true),
    removed = { ...row(), deleted: true };
  const records = [
    essay,
    vocabulary,
    study,
    removed,
    {
      id: crypto.randomUUID(),
      kind: "languageEssay",
      data: { date: essay.data.date, reviewed: true },
    },
    {
      id: crypto.randomUUID(),
      kind: "languageVocabulary",
      data: { date: vocabulary.data.date, read: true },
    },
  ];
  const items = plannerItems(records, "2026-11-21", "2026-11-28").filter(
    (r) => r.source === "developmentEntry",
  );
  assert.equal(items.length, 3);
  assert.ok(items.every((r) => r.done && r.kind === "task" && r.allDay));
  assert.deepEqual(developmentProgress(developmentEntries(records)), {
    total: 3,
    done: 3,
    minutes: 90,
    days: 1,
  });
  records[4].data.reviewed = false;
  assert.equal(
    plannerItems(records, "2026-11-21", "2026-11-28").find(
      (r) => r.recordId === essay.id,
    ).done,
    false,
  );
  study.data.date = "2026-12-01";
  assert.equal(
    plannerItems(records, "2026-11-21", "2026-11-28").some(
      (r) => r.recordId === study.id,
    ),
    false,
  );
});
test("activity limits, future completion, duplicate weight entries and goals are validated", () => {
  const r = row();
  validateDevelopment(r.kind, r.data, "2026-11-26");
  assert.throws(() =>
    validateDevelopment(
      r.kind,
      { ...r.data, done: true, date: "2026-11-27" },
      "2026-11-26",
    ),
  );
  assert.throws(() =>
    validateDevelopment(r.kind, { ...r.data, minutes: 1441 }),
  );
  assert.throws(() =>
    validateDevelopment(r.kind, { ...r.data, area: "unknown" }),
  );
  const weight = { date: "2026-11-26", kg: 68.5 },
    saved = { id: crypto.randomUUID(), kind: "weightEntry", data: weight };
  validateExercise("weightEntry", weight, [saved], saved.id, "2026-11-26");
  assert.match(weightPlanPage({ records: [saved] }), /68\.5/);
  assert.throws(() =>
    validateExercise("weightEntry", weight, [saved], null, "2026-11-26"),
  );
  assert.throws(() =>
    validateExercise("weightGoal", weight, [{ ...saved, kind: "weightGoal" }]),
  );
  assert.throws(() =>
    validateExercise(
      "weightEntry",
      { ...weight, kg: 68.55 },
      [],
      null,
      "2026-11-26",
    ),
  );
  assert.throws(() =>
    validateExercise(
      "weightEntry",
      { ...weight, date: "2026-11-27" },
      [],
      null,
      "2026-11-26",
    ),
  );
});
test("weekly lesson imports and vocabulary assignments are real records and survive writing backups", async () => {
  const records = [],
    save = async (kind, data, id) =>
      records.push({ kind, id, version: 1, data: structuredClone(data) });
  const lesson = row("lesson");
  await prepareDevelopmentResources(lesson.data, {
    records,
    save,
    file: {
      name: "grammar.md",
      size: 32,
      text: async () => "# Grammar\n\n**Practice** فارسی",
    },
  });
  assert.equal(records[0].kind, "languageLesson");
  assert.equal(lesson.data.resourceId, records[0].id);
  const essay = row("essay");
  await prepareDevelopmentResources(essay.data, {
    records,
    save,
    words: "learn | یاد گرفتن | I learn daily.",
  });
  assert.equal(records[1].kind, "languageVocabulary");
  assert.equal(records[1].data.words[0].term, "learn");
  assert.equal(records[1].data.title, essay.data.title);
  records.push(
    lesson,
    essay,
    {
      id: crypto.randomUUID(),
      kind: "workoutProgram",
      version: 1,
      data: { title: "Day A", body: "- Squat 3×10" },
    },
    {
      id: crypto.randomUUID(),
      kind: "weightEntry",
      version: 1,
      data: { date: "2026-11-26", kg: 68 },
    },
  );
  assert.equal(selectBackupRecords(records, "finance").length, 0);
  const backup = validateBackup({
    format: "damdast-v3",
    section: "notes",
    records: selectBackupRecords(records, "notes"),
  });
  assert.equal(backup.records.length, 6);
  assert.equal(
    backup.records.find(
      (r) => r.kind === "developmentEntry" && r.data.area === "lesson",
    ).data.resourceId,
    records[0].id,
  );
  await assert.rejects(
    prepareDevelopmentResources(row("lesson").data, {
      records,
      save,
      file: { name: "x.html", size: 20, text: async () => "bad" },
    }),
  );
  assert.match(
    workoutProgramsPage({
      records: [
        {
          id: crypto.randomUUID(),
          kind: "workoutProgram",
          data: {
            title: "<script>x</script>",
            body: "<img src=x onerror=alert(1)>",
          },
        },
      ],
    }),
    /&lt;script/,
  );
});
test("stopwatch and countdown use wall-clock time rather than interval ticks", () => {
  assert.equal(
    stopwatchElapsed({ elapsed: 1200, running: true, since: 1000 }, 61000),
    61200,
  );
  assert.equal(
    stopwatchElapsed({ elapsed: 1200, running: false, since: 1000 }, 61000),
    1200,
  );
  assert.equal(countdownRemaining({ running: true, deadline: 4000 }, 10000), 0);
  assert.equal(clockText(3661000), "01:01:01");
});
test("clocks pause, resume, finish, restore after refresh and stay isolated between accounts", (t) => {
  const { document, window } = parseHTML(
      `<html><body>${workoutTimerPage()}</body></html>`,
    ),
    values = new Map();
  const previous = {
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      setInterval: globalThis.setInterval,
    },
    now = Date.now;
  let time = 100000;
  Object.assign(globalThis, {
    document,
    localStorage: {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
    },
    setInterval: () => 1,
  });
  Date.now = () => time;
  t.after(() => {
    Object.assign(globalThis, previous);
    Date.now = now;
  });
  const clock = new ExerciseClock((e) => {
    throw e;
  });
  clock.attach("google:alice");
  clock.action("watch-start");
  time += 10000;
  clock.action("watch-lap");
  clock.action("watch-pause");
  time += 90000;
  assert.equal(stopwatchElapsed(clock.state.watch), 10000);
  clock.action("watch-start");
  time += 5000;
  clock.action("watch-pause");
  assert.equal(clock.state.watch.elapsed, 15000);
  document.querySelector("[data-clock-minutes]").value = "0";
  document.querySelector("[data-clock-seconds]").value = "3";
  clock.setDuration();
  clock.action("timer-start");
  time += 10000;
  clock.update();
  assert.equal(clock.state.timer.finished, true);
  const restored = new ExerciseClock((e) => {
    throw e;
  });
  restored.attach("google:alice");
  assert.equal(restored.state.watch.elapsed, 15000);
  assert.equal(restored.state.watch.laps[0], 10000);
  assert.equal(restored.state.timer.finished, true);
  restored.attach("google:bob");
  assert.equal(restored.state.watch.elapsed, 0);
  assert.equal(restored.state.timer.finished, false);
});
