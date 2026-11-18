import { drawVoxelPet } from "./desk-pet-renderer.js";
import { t } from "./i18n.js";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function petBounds(rect, viewportHeight, size) {
  const minX = 4, maxX = Math.max(minX, rect.width - size - 4);
  const minY = Math.max(4, 8 - rect.top), maxY = Math.min(rect.height - size - 4, viewportHeight - rect.top - size - 12);
  return { minX, maxX, minY, maxY: Math.max(minY, maxY), visible: rect.bottom > size && rect.top < viewportHeight - size };
}
export function advancePet(state, bounds, seconds, random = Math.random) {
  const next = { ...state, x: clamp(state.x, bounds.minX, bounds.maxX), y: clamp(state.y, bounds.minY, bounds.maxY) };
  next.phase += seconds * 8;
  if (next.wait > 0) { next.wait = Math.max(0, next.wait - seconds); next.walking = false; return next; }
  if (next.targetX == null || Math.hypot(next.targetX - next.x, next.targetY - next.y) < 3) {
    next.targetX = bounds.minX + random() * (bounds.maxX - bounds.minX);
    next.targetY = bounds.minY + random() * (bounds.maxY - bounds.minY);
    next.wait = .8 + random() * 2.2; next.walking = false; return next;
  }
  next.targetX = clamp(next.targetX, bounds.minX, bounds.maxX); next.targetY = clamp(next.targetY, bounds.minY, bounds.maxY);
  const dx = next.targetX - next.x, dy = next.targetY - next.y, distance = Math.hypot(dx, dy);
  const travel = Math.min(distance, seconds * 30);
  next.walking = distance > 2;
  if (distance > 0) { next.x += dx / distance * travel; next.y += dy / distance * travel; }
  const heading = Math.atan2(dx, dy / .43), turn = Math.atan2(Math.sin(heading - next.yaw), Math.cos(heading - next.yaw));
  next.yaw += clamp(turn, -seconds * 5, seconds * 5);
  return next;
}

export class DeskPetController {
  constructor() {
    this.states = new Map(); this.items = []; this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.motion.addEventListener("change", () => { this.controls(); this.schedule(); });
    document.addEventListener("visibilitychange", () => this.schedule());
  }
  detach() {
    cancelAnimationFrame(this.frame); this.frame = null; this.lastTime = null;
    this.resizeObserver?.disconnect(); this.intersectionObserver?.disconnect(); this.events?.abort(); this.items = [];
  }
  attach(root, scope) {
    this.detach(); this.root = root;
    if (this.scope !== scope) { this.states.clear(); this.scope = scope; }
    if (!root) return;
    root.querySelectorAll(".desk-pet-preview canvas").forEach(canvas => drawVoxelPet(canvas, { style: canvas.dataset.voxelPet }));
    this.layer = root.querySelector("[data-desk-pet-layer]");
    if (!this.layer) return;
    const ids = new Set();
    this.items = [...this.layer.querySelectorAll("[data-roaming-pet]")].map((element, index) => {
      const id = element.dataset.roamingPet; ids.add(id);
      const state = this.states.get(id) || { x: 0, y: 0, yaw: .6, phase: index, wait: .6, initialized: false, paused: false };
      this.states.set(id, state);
      return { id, element, canvas: element.querySelector("canvas"), style: element.dataset.petStyle };
    });
    for (const id of this.states.keys()) if (!ids.has(id)) this.states.delete(id);
    this.events = new AbortController();
    const signal = this.events.signal;
    root.addEventListener("click", event => {
      const button = event.target.closest("[data-desk-pet-toggle]");
      if (!button || this.motion.matches) return;
      const state = this.states.get(button.dataset.deskPetToggle);
      if (state) { state.paused = !state.paused; this.controls(); this.schedule(); }
    }, { signal });
    window.addEventListener("scroll", () => this.measure(), { signal, passive: true, capture: true });
    this.resizeObserver = new ResizeObserver(() => this.measure()); this.resizeObserver.observe(this.layer);
    this.intersectionObserver = new IntersectionObserver(entries => { this.inView = entries.some(entry => entry.isIntersecting); this.schedule(); });
    this.intersectionObserver.observe(this.layer);
    this.inView = false; this.measure(); this.controls(); this.draw();
  }
  measure() {
    if (!this.layer?.isConnected) return;
    this.bounds = petBounds(this.layer.getBoundingClientRect(), innerHeight, this.items[0]?.element.offsetWidth || 112);
    for (let index = 0; index < this.items.length; index++) {
      const state = this.states.get(this.items[index].id), b = this.bounds;
      if (!state.initialized) { state.x = b.minX + (b.maxX - b.minX) * (.45 + index % 3 * .12); state.y = b.minY + (b.maxY - b.minY) * .55; state.initialized = true; }
      state.x = clamp(state.x, b.minX, b.maxX); state.y = clamp(state.y, b.minY, b.maxY);
    }
    this.draw(); this.schedule();
  }
  controls() {
    for (const button of this.root?.querySelectorAll("[data-desk-pet-toggle]") || []) {
      const stopped = this.motion.matches || !!this.states.get(button.dataset.deskPetToggle)?.paused;
      button.setAttribute("aria-pressed", String(stopped)); button.disabled = this.motion.matches;
      button.querySelector("[data-pet-toggle-label]").textContent = t(this.motion.matches ? "Resting" : stopped ? "Resume walking" : "Pause walking");
    }
  }
  active() { return this.root?.isConnected && this.inView && this.bounds?.visible && !document.hidden && !this.motion.matches && this.items.some(item => !this.states.get(item.id)?.paused); }
  schedule() {
    cancelAnimationFrame(this.frame); this.frame = null; this.lastTime = null;
    if (this.active()) this.frame = requestAnimationFrame(time => this.tick(time));
    else this.draw();
  }
  tick(time) {
    this.frame = null;
    if (!this.active()) return;
    if (this.lastTime == null) this.lastTime = time;
    const elapsed = (time - this.lastTime) / 1000;
    // Draw at most 20 fps; a background tab or delayed frame never makes a pet jump.
    if (elapsed >= .05) {
      for (const item of this.items) {
        const state = this.states.get(item.id);
        if (!state.paused) this.states.set(item.id, advancePet(state, this.bounds, Math.min(elapsed, .15)));
      }
      this.lastTime = time; this.draw();
    }
    this.frame = requestAnimationFrame(next => this.tick(next));
  }
  draw() {
    for (const item of this.items) {
      const state = this.states.get(item.id);
      item.element.style.transform = `translate3d(${Math.round(state.x)}px,${Math.round(state.y)}px,0)`;
      item.element.dataset.petState = this.motion.matches || state.paused ? "resting" : state.walking ? "walking" : "idle";
      drawVoxelPet(item.canvas, { style: item.style, yaw: state.yaw, phase: state.phase, walking: !!state.walking && !state.paused && !this.motion.matches, blink: state.phase % 51 > 49 });
    }
  }
}
