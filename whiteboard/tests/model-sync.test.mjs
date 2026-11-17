import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDocument,
  emptyServer,
  validateDocument,
  makePatch,
  mergeRemote,
  acknowledge,
  asDocument,
} from "../src/model.mjs";
import { SerializedWriter } from "../src/storage.mjs";
import { DocumentSync } from "../src/sync.mjs";
const element = (id, x = 0) => ({
  id,
  type: "rectangle",
  x,
  y: 0,
  width: 100,
  height: 80,
  angle: 0,
  version: 1,
  strokeColor: "#333333",
  backgroundColor: "transparent",
  isDeleted: false,
});
const base = () => ({
  ...emptyServer(),
  revision: 1,
  title: "Test",
  scene: { ...emptyDocument().scene, elements: [element("a"), element("b")] },
  elementVersions: { a: 1, b: 1 },
  settingsVersion: 1,
});
test("corrupt documents, external images and executable links are rejected before touching the editor", () => {
  const d = emptyDocument();
  validateDocument(d);
  for (const e of [
    element("a", NaN),
    { ...element("a"), type: "iframe" },
    { ...element("a"), link: "javascript:alert(1)" },
    { ...element("a"), type: "image", fileId: "missing" },
  ])
    assert.throws(() =>
      validateDocument({ ...d, scene: { ...d.scene, elements: [e] } }),
    );
  assert.throws(() => validateDocument({ ...d, schemaVersion: 2 }));
});
test("serialization keeps image bytes, bindings and frames while view state never becomes a patch", () => {
  const b = base(),
    local = asDocument(b);
  local.scene.elements.push({
    ...element("arrow"),
    type: "arrow",
    points: [
      [0, 0],
      [100, 0],
    ],
    startBinding: { elementId: "a", focus: 0, gap: 1 },
    endBinding: { elementId: "b", focus: 0, gap: 1 },
  });
  const round = JSON.parse(JSON.stringify(local));
  validateDocument(round);
  assert.equal(round.scene.elements[2].endBinding.elementId, "b");
  assert.equal(makePatch(b, asDocument(b)), null);
});
test("independent remote edits merge, same-element edits become explicit conflicts", () => {
  const b = base(),
    local = asDocument(b),
    remote = structuredClone(b);
  local.scene.elements[0].x = 10;
  remote.revision = 2;
  remote.scene.elements[1].x = 40;
  remote.elementVersions.b = 2;
  let result = mergeRemote(b, local, remote);
  assert.equal(result.document.scene.elements.find((e) => e.id === "b").x, 40);
  assert.deepEqual(result.conflicts, []);
  remote.scene.elements[0].x = 20;
  remote.elementVersions.a = 2;
  result = mergeRemote(b, local, remote);
  assert.deepEqual(result.conflicts, ["a"]);
});
test("an edit made during an in-flight save survives its acknowledgement", () => {
  const b = base(),
    sent = asDocument(b),
    current = asDocument(b),
    remote = structuredClone(b);
  sent.scene.elements[0].x = 10;
  current.scene.elements[0].x = 20;
  remote.scene.elements[0].x = 10;
  remote.scene.elements[1].x = 55;
  remote.revision = 2;
  const next = acknowledge(sent, current, remote);
  assert.equal(next.scene.elements.find((e) => e.id === "a").x, 20);
  assert.equal(next.scene.elements.find((e) => e.id === "b").x, 55);
});
test("serialized local writes finish in order and cannot let an older async save overwrite a newer one", async () => {
  let release, started;
  const gate = new Promise((r) => (release = r)),
    began = new Promise((r) => (started = r)),
    values = [];
  const writer = new SerializedWriter(
    async (value) => {
      if (value === 1) {
        started();
        await gate;
      }
      values.push(value);
    },
    () => {},
    10000,
  );
  writer.schedule(1);
  const first = writer.flush();
  await began;
  writer.schedule(2);
  const second = writer.flush();
  release();
  await Promise.all([first, second]);
  assert.deepEqual(values, [1, 2]);
});
test("storage failures keep the latest pending document and can be retried", async () => {
  let fail = true,
    errors = 0,
    saved;
  const writer = new SerializedWriter(
    async (v) => {
      if (fail) throw Error("quota");
      saved = v;
    },
    () => errors++,
    10000,
  );
  writer.schedule({ v: 3 });
  await assert.rejects(() => writer.flush());
  assert.equal(errors, 1);
  fail = false;
  await writer.flush();
  assert.deepEqual(saved, { v: 3 });
});
test("a retry after a lost response reuses its operation ID and conflict resolution preserves unrelated remote work", async () => {
  const b = base(),
    local = asDocument(b);
  local.scene.elements[0].x = 15;
  const ids = [];
  let offline = true;
  const remote = structuredClone(b);
  remote.revision = 3;
  remote.elementVersions = { a: 2, b: 3 };
  remote.scene.elements = [element("a", 25), element("b", 70)];
  const sync = new DocumentSync({
    id: "doc",
    document: local,
    base: b,
    request: async (_, o) => {
      const p = JSON.parse(o.body);
      ids.push(p.operationId);
      if (offline) {
        offline = false;
        throw Error("offline");
      }
      throw Object.assign(Error("conflict"), {
        status: 409,
        data: { state: remote, conflictIds: ["a"] },
      });
    },
    changed: () => {},
    persist: async () => {},
    status: () => {},
  });
  await sync.flush();
  assert.ok(sync.flight);
  await sync.flush();
  assert.equal(ids[0], ids[1]);
  assert.equal(sync.document.scene.elements.find((e) => e.id === "b").x, 70);
  sync.request = async () => remote;
  sync.resolve(false);
  assert.equal(sync.document.scene.elements.find((e) => e.id === "a").x, 25);
  assert.equal(sync.document.scene.elements.find((e) => e.id === "b").x, 70);
});

test("fractional layer order stays ordinal across browser and server merges", () => {
  const b = base(),
    local = asDocument(b),
    remote = structuredClone(b);
  remote.revision = 2;
  remote.scene.elements[0].index = "aZ";
  remote.scene.elements[1].index = "aa";
  local.scene.elements[0].index = "aZ";
  local.scene.elements[1].index = "aa";
  const merged = mergeRemote(b, local, remote);
  assert.deepEqual(
    merged.document.scene.elements.map((e) => e.id),
    ["a", "b"],
  );
});
