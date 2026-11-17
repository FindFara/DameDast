import {
  emptyServer,
  makePatch,
  mergeRemote,
  acknowledge,
  asDocument,
  same,
  differences,
} from "./model.mjs";
export class DocumentSync {
  constructor({
    id,
    document,
    base,
    flight,
    request,
    changed,
    persist,
    status,
  }) {
    Object.assign(this, { id, document, request, changed, persist, status });
    this.base = base || emptyServer();
    this.flight = flight || null;
    this.conflict = null;
    this.running = null;
  }
  serialize() {
    return { document: this.document, base: this.base, flight: this.flight };
  }
  local(document) {
    this.document = document;
    this.persist(this.serialize());
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => void this.flush().catch((e) => this.status("Save failed")),
      600,
    );
  }
  async pull() {
    try {
      const access = await this.request(`/api/whiteboards/${this.id}`);
      if (!access.exists) return access;
      this.receive(access.state);
      return access;
    } catch (e) {
      this.status(e.status === 401 ? "Access denied" : "Offline");
      throw e;
    }
  }
  receive(remote) {
    if (remote.revision <= this.base.revision) return;
    const result = mergeRemote(this.base, this.document, remote);
    this.document = result.document;
    if (result.conflicts.length) {
      this.conflict = { remote, ids: result.conflicts };
      this.status("Conflict");
    } else {
      this.base = remote;
      this.status("Synced");
    }
    this.changed(this.document);
    this.persist(this.serialize());
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    this.running = this.push();
    try {
      return await this.running;
    } finally {
      this.running = null;
    }
  }
  async push() {
    if (this.conflict) return;
    for (let i = 0; i < 8; i++) {
      if (!this.flight) {
        const patch = makePatch(this.base, this.document);
        if (!patch) {
          this.status("Synced");
          return;
        }
        this.flight = { patch, sent: structuredClone(this.document) };
        await this.persist(this.serialize(), true);
      }
      this.status("Syncing");
      try {
        const remote = await this.request(`/api/whiteboards/${this.id}`, {
          method: "POST",
          body: JSON.stringify(this.flight.patch),
        });
        this.document = acknowledge(this.flight.sent, this.document, remote);
        this.base = remote;
        this.flight = null;
        this.changed(this.document);
        await this.persist(this.serialize(), true);
      } catch (e) {
        if (e.status === 409 && e.data?.state) {
          this.flight = null;
          this.document = mergeRemote(
            this.base,
            this.document,
            e.data.state,
          ).document;
          this.changed(this.document);
          this.conflict = {
            remote: e.data.state,
            ids: e.data.conflictIds || [],
          };
          this.status("Conflict");
          this.persist(this.serialize());
        } else this.status(e.status === 401 ? "Access denied" : "Offline");
        return;
      }
    }
    this.timer = setTimeout(
      () => void this.flush().catch(() => this.status("Save failed")),
      0,
    );
  }
  resolve(keepMine) {
    if (!this.conflict) return;
    const remote = this.conflict.remote;
    if (keepMine) {
      this.base = remote;
    } else {
      const ids = new Set(this.conflict.ids),
        changes = differences(this.base.scene, this.document.scene).filter(
          (e) => !ids.has(e.id),
        ),
        target = asDocument(remote),
        map = new Map(target.scene.elements.map((e) => [e.id, e]));
      for (const e of changes) map.set(e.id, e);
      target.scene.elements = [...map.values()];
      if (
        !ids.has("$settings") &&
        (this.base.title !== this.document.title ||
          !same(this.base.scene.settings, this.document.scene.settings))
      ) {
        target.title = this.document.title;
        target.scene.settings = this.document.scene.settings;
      }
      this.document = target;
      this.base = remote;
    }
    this.flight = null;
    this.conflict = null;
    this.changed(this.document);
    this.persist(this.serialize());
    void this.flush().catch(() => this.status("Save failed"));
  }
}
