import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeNote,
  prepareNoteSave,
  emptyNote,
  noteMatches,
  convertNote,
  moveChecklist,
  checkLabelName,
  trashDaysLeft,
  noteTextFile,
} from "../src/DameDast.Web/wwwroot/keep-model.js";
import {
  organizerReport,
  reminderOccurrences,
} from "../src/DameDast.Web/wwwroot/organizer.js";
import { NotePageController } from "../src/DameDast.Web/wwwroot/keep-notes.js";
const task = (text, indent = 0) => ({
  id: crypto.randomUUID(),
  text,
  done: false,
  indent,
});
test("untitled notes, checklist conversion, stable content and independent history survive serialization", () => {
  const a = prepareNoteSave(
    null,
    normalizeNote({ body: "اول\nدوم" }),
    "2026-11-24T12:00:00Z",
  );
  assert.equal(a.title, "");
  assert.throws(() => prepareNoteSave(null, normalizeNote({ body: "  " })));
  assert.equal(emptyNote(a), false);
  const b = prepareNoteSave(
    a,
    { ...a, body: "ویرایش" },
    "2026-11-24T13:00:00Z",
  );
  assert.equal(b.history[0].body, "اول\nدوم");
  assert.equal(b.createdAt, a.createdAt);
  assert.equal(prepareNoteSave(b, { ...b, color: "sage" }).history.length, 1);
  const c = convertNote(a, "checklist");
  assert.deepEqual(
    c.checklist.map((x) => x.text),
    ["اول", "دوم"],
  );
  assert.equal(convertNote(c, "text").body, a.body);
  assert.match(noteTextFile(JSON.parse(JSON.stringify(b.history[0]))), /دوم/);
});
test("Persian normalized search, labels, color and explicit trash scope never leak removed notes", () => {
  const r = {
    id: "a",
    kind: "note",
    data: normalizeNote({
      body: "كتاب يادداشت",
      labels: ["label"],
      color: "sage",
    }),
  };
  assert.equal(
    noteMatches(r, { search: "کتاب یادداشت", color: "sage", label: "label" }),
    true,
  );
  assert.equal(
    noteMatches(
      { ...r, data: { ...r.data, status: "trashed" } },
      { search: "کتاب" },
    ),
    false,
  );
  assert.equal(
    noteMatches(
      { ...r, data: { ...r.data, status: "trashed" } },
      { route: "trash", search: "کتاب" },
    ),
    true,
  );
  assert.throws(() =>
    checkLabelName("کتاب", [
      { id: "x", kind: "noteLabel", data: { name: "كتاب" } },
    ]),
  );
  assert.equal(
    trashDaysLeft(
      { trashedAt: "2026-11-24T12:00:00Z" },
      "2026-11-30T12:00:00Z",
    ),
    1,
  );
  assert.equal(
    trashDaysLeft(
      { trashedAt: "2026-11-24T12:00:00Z" },
      "2026-12-01T12:00:00Z",
    ),
    0,
  );
});
test("moving a checklist parent also moves its children and conversion keeps their text", () => {
  const a = task("a"),
    child = task("child", 1),
    b = task("b");
  const moved = moveChecklist([a, child, b], a.id, 1);
  assert.deepEqual(
    moved.map((x) => x.text),
    ["b", "a", "child"],
  );
  assert.equal(
    convertNote(
      normalizeNote({ noteType: "checklist", checklist: moved }),
      "text",
    ).body,
    "b\na\n  child",
  );
});
test("a queued autosave never overwrites text typed while the previous save was in flight", async () => {
  const ctl = Object.create(NotePageController.prototype);
  let release;
  const saves = [];
  let version = 0;
  ctl.context = () => ({ records: [{ id: "a", version }] });
  ctl.cb = {
    save: async (data) => {
      saves.push(structuredClone(data));
      if (saves.length === 1) await new Promise((r) => (release = r));
      version++;
    },
  };
  ctl.persist = () => true;
  ctl.status = () => {};
  ctl.update = () => {};
  const d = {
    id: "a",
    data: normalizeNote({ body: "first" }),
    base: null,
    version: 0,
    seq: 1,
    dirty: true,
  };
  const p = ctl.flush(d);
  d.data.body = "newer";
  d.seq++;
  release();
  await p;
  assert.equal(saves.length, 2);
  assert.equal(saves[1].body, "newer");
  assert.equal(d.data.body, "newer");
  assert.equal(d.version, 2);
  assert.equal(d.dirty, false);
});
test("autosave preserves an active empty checklist row so later typing cannot disappear", async () => {
  const ctl = Object.create(NotePageController.prototype);
  let version = 0;
  ctl.context = () => ({ records: [{ id: "a", version }] });
  ctl.cb = {
    save: async () => {
      version++;
    },
  };
  ctl.persist = () => true;
  ctl.status = () => {};
  ctl.update = () => {};
  const blank = task(""),
    d = {
      id: "a",
      data: normalizeNote({
        noteType: "checklist",
        checklist: [task("one"), blank],
      }),
      base: null,
      version: 0,
      seq: 1,
      dirty: true,
    };
  await ctl.flush(d);
  assert.equal(d.data.checklist.length, 2);
  assert.equal(d.base.checklist.length, 1);
  assert.equal(d.data.checklist[1].id, blank.id);
});
test("archived note reminders remain deliverable, use their time zone and stop in trash", () => {
  const reminder = {
    title: "Reminder",
    body: "",
    startDate: "2026-11-24",
    times: ["09:00"],
    repeat: "once",
    interval: 1,
    timeZone: "America/New_York",
  };
  const now = "2026-11-24T14:01:00Z";
  assert.equal(
    reminderOccurrences(reminder, now)[0].dueAt,
    "2026-11-24T14:00:00.000Z",
  );
  const r = {
    id: "n",
    kind: "note",
    data: { title: "Note", status: "archived", reminder },
  };
  assert.equal(organizerReport([r], now).notifications[0].url, "/#note/n");
  assert.equal(
    organizerReport([{ ...r, data: { ...r.data, status: "trashed" } }], now)
      .notifications.length,
    0,
  );
});
test("DST gaps advance to the first valid minute and repeated clocks deliver once at the later time", () => {
  const r = {
    title: "DST",
    body: "",
    times: ["02:30"],
    startDate: "2026-03-08",
    repeat: "once",
    interval: 1,
    timeZone: "America/New_York",
  };
  assert.equal(
    reminderOccurrences(r, "2026-03-08T07:01:00Z")[0].dueAt,
    "2026-03-08T07:00:00.000Z",
  );
  assert.equal(
    reminderOccurrences(
      { ...r, startDate: "2026-11-01", times: ["01:30"] },
      "2026-11-01T06:31:00Z",
    )[0].dueAt,
    "2026-11-01T06:30:00.000Z",
  );
});

test("failed saves keep the draft and retry against the same expected version", async () => {
  const ctl = Object.create(NotePageController.prototype);
  let attempts = 0;
  ctl.context = () => ({ records: [{ id: "a", version: 1 }] });
  ctl.cb = {
    save: async () => {
      if (++attempts === 1) throw Error("Storage unavailable");
    },
  };
  ctl.persist = () => true;
  ctl.status = () => {};
  ctl.update = () => {};
  const d = {
    id: "a",
    data: normalizeNote({ body: "Keep this text" }),
    base: null,
    version: 0,
    seq: 1,
    dirty: true,
  };
  await ctl.flush(d);
  assert.equal(d.state, "error");
  assert.equal(d.dirty, true);
  assert.equal(d.version, 0);
  assert.equal(d.data.body, "Keep this text");
  await ctl.flush(d);
  assert.equal(d.state, "saved");
  assert.equal(d.dirty, false);
});
test("a draft from a previous account cannot be written into the newly selected account", async () => {
  const ctl = Object.create(NotePageController.prototype);
  ctl.scope = "bob";
  let writes = 0;
  ctl.context = () => ({ space: "bob", records: [] });
  ctl.cb = { save: async () => writes++ };
  ctl.persist = () => {
    throw Error("Must not store Alice draft in Bob storage");
  };
  ctl.status = () => {};
  ctl.update = () => {};
  const d = {
    id: "shared-id",
    scope: "alice",
    data: normalizeNote({ body: "Alice private text" }),
    base: null,
    version: 0,
    seq: 1,
    dirty: true,
  };
  await ctl.flush(d);
  assert.equal(writes, 0);
  assert.equal(d.dirty, true);
  assert.equal(d.state, "error");
  assert.match(d.error, /Account changed/);
});

test("editing note settings in the main settings preserves unsaved drafts and stays isolated per workspace", async (t) => {
  const { readNoteSettings, saveNoteSettings, noteSettingsKey } = await import(
    "../src/DameDast.Web/wwwroot/keep-preferences.js"
  );
  const old = globalThis.localStorage,
    store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
  t.after(() => {
    globalThis.localStorage = old;
  });
  const draft = { id: "draft", data: { body: "Unsaved text" }, version: 3 };
  store.set(
    noteSettingsKey("alice"),
    JSON.stringify({
      preferences: { view: "grid", linkPreviews: true },
      drafts: [draft],
    }),
  );
  saveNoteSettings("alice", { view: "list", linkPreviews: false });
  assert.deepEqual(JSON.parse(store.get(noteSettingsKey("alice"))).drafts, [
    draft,
  ]);
  assert.equal(readNoteSettings("alice").view, "list");
  assert.equal(readNoteSettings("bob").view, "grid");
  assert.throws(() => saveNoteSettings("alice", { view: "unknown" }));
  assert.equal(readNoteSettings("alice").view, "list");
});
test("the integrated notes page keeps only the supported menus and controls", async () => {
  const { shell, toolbar, notesMenu } = await import(
    "../src/DameDast.Web/wwwroot/keep-view.js"
  );
  const c = { space: "guest", records: [] };
  const html =
    shell(c, { view: "grid" }) + toolbar(normalizeNote({ body: "Note" }));
  assert.doesNotMatch(
    html,
    /keep-topbar|keep-sidebar|keep-bulk|data-k="(?:select|exit-selection|refresh|settings|menu|reminder|convert|compose-checklist)"/,
  );
  assert.match(html, /data-k="notes-menu"/);
  const menu = notesMenu(c, "notes", "");
  assert.match(menu, /role="menu"/);
  assert.doesNotMatch(menu, /data-route="(?:archive|trash)"/);
  const controller = Object.create(NotePageController.prototype);
  let more = "";
  controller.popover = (_anchor, html) => {
    more = html;
  };
  controller.more(null, "note");
  assert.doesNotMatch(
    more,
    /data-k="(?:archive|history|duplicate|permanent|empty-trash)"/,
  );
  assert.match(more, /data-k="delete-note"/);
  assert.doesNotMatch(menu, /data-route="reminders"/);
});
test("old embedded reminders remain manageable in the main Reminders page and appear in notifications", async () => {
  const { renderPage } = await import("../src/DameDast.Web/wwwroot/ui.js");
  const { notificationsMarkup } = await import(
    "../src/DameDast.Web/wwwroot/organizer-ui.js"
  );
  const c = {
    page: "reminders",
    space: "guest",
    filter: "",
    records: [
      {
        id: "legacy-note",
        kind: "note",
        data: {
          title: "Linked reminder",
          body: "Preserved",
          reminder: {
            title: "Linked reminder",
            body: "",
            startDate: "2026-11-24",
            times: ["09:00"],
            repeat: "once",
            interval: 1,
            timeZone: "Asia/Tehran",
          },
        },
      },
    ],
    now: "2026-11-24T12:00:00Z",
    month: "1405-09",
    session: {},
  };
  const html = renderPage(c);
  assert.match(html, /data-action="note-reminder-edit"/);
  assert.match(html, /data-action="note-reminder-delete"/);
  assert.match(html, /Linked reminder/);
  assert.match(notificationsMarkup(c), /Linked reminder/);
});

test("removing archive navigation keeps earlier archived notes visible without exposing deleted notes", () => {
  const record = {
    kind: "note",
    id: "old",
    data: { title: "Preserved", body: "Archived earlier", status: "archived" },
  };
  assert.equal(noteMatches(record), false);
  assert.equal(noteMatches(record, { includeArchived: true }), true);
  assert.equal(
    noteMatches(
      { ...record, data: { ...record.data, status: "trashed" } },
      { includeArchived: true },
    ),
    false,
  );
});
