import { stopwatchElapsed, countdownRemaining, clockText } from "./exercise.js";
import { getLanguage } from "./i18n.js";
const initial = () => ({
  watch: { running: false, since: 0, elapsed: 0, laps: [] },
  timer: {
    running: false,
    duration: 600000,
    remaining: 600000,
    deadline: 0,
    finished: false,
  },
});
export class ExerciseClock {
  constructor(error) {
    this.error = error;
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-clock-action]");
      if (b) {
        try {
          this.action(b.dataset.clockAction);
        } catch (error) {
          this.error(error);
        }
      }
    });
    document.addEventListener("input", (e) => {
      if (
        e.target.matches("[data-clock-minutes],[data-clock-seconds]") &&
        !this.state.timer.running
      )
        this.setDuration();
    });
    document.addEventListener("visibilitychange", () => this.update());
    this.interval = setInterval(() => this.update(), 250);
  }
  attach(space) {
    const key = `damedast-exercise-clock:${encodeURIComponent(space)}`;
    if (key !== this.key) {
      this.key = key;
      this.state = initial();
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (
          value &&
          typeof value.watch?.running === "boolean" &&
          typeof value.timer?.running === "boolean" &&
          typeof value.timer.finished === "boolean" &&
          [
            value.watch.since,
            value.watch.elapsed,
            value.timer.deadline,
            value.timer.remaining,
            value.timer.duration,
          ].every((n) => Number.isFinite(n) && n >= 0 && n < 1e15) &&
          value.timer.duration <= 86400000 &&
          value.timer.remaining <= 86400000 &&
          Array.isArray(value.watch.laps) &&
          value.watch.laps.length <= 30 &&
          value.watch.laps.every((n) => Number.isFinite(n) && n >= 0)
        )
          this.state = value;
      } catch {}
    }
    this.root = document.querySelector("[data-exercise-clock]");
    if (this.root) {
      this.root.querySelector("[data-clock-minutes]").value = Math.floor(
        this.state.timer.duration / 60000,
      );
      this.root.querySelector("[data-clock-seconds]").value =
        Math.floor(this.state.timer.duration / 1000) % 60;
    }
    this.update();
  }
  persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.state));
    } catch (error) {
      this.error(error);
    }
  }
  setDuration() {
    if (!this.root) return false;
    const minutes = Number(
        this.root.querySelector("[data-clock-minutes]").value,
      ),
      seconds = Number(this.root.querySelector("[data-clock-seconds]").value);
    if (
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds) ||
      minutes < 0 ||
      minutes > 1439 ||
      seconds < 0 ||
      seconds > 59 ||
      minutes * 60 + seconds < 1
    )
      return false;
    Object.assign(this.state.timer, {
      duration: (minutes * 60 + seconds) * 1000,
      remaining: (minutes * 60 + seconds) * 1000,
      finished: false,
    });
    this.persist();
    this.update();
    return true;
  }
  action(action) {
    const now = Date.now(),
      { watch, timer } = this.state;
    if (action === "watch-start" && !watch.running)
      Object.assign(watch, { running: true, since: now });
    if (action === "watch-pause" && watch.running)
      Object.assign(watch, {
        elapsed: stopwatchElapsed(watch, now),
        running: false,
      });
    if (action === "watch-reset") this.state.watch = initial().watch;
    if (action === "watch-lap" && watch.running && watch.laps.length < 30)
      watch.laps.push(stopwatchElapsed(watch, now));
    if (action === "timer-start" && !timer.running) {
      const minutes = Number(
          this.root.querySelector("[data-clock-minutes]").value,
        ),
        seconds = Number(this.root.querySelector("[data-clock-seconds]").value);
      if (
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds) ||
        minutes < 0 ||
        minutes > 1439 ||
        seconds < 0 ||
        seconds > 59 ||
        minutes * 60 + seconds < 1
      )
        throw Error("Enter a timer from 1 second to 24 hours.");
      if (timer.finished) {
        timer.remaining = timer.duration;
      }
      Object.assign(timer, {
        running: true,
        deadline: now + timer.remaining,
        finished: false,
      });
    }
    if (action === "timer-pause" && timer.running)
      Object.assign(timer, {
        remaining: countdownRemaining(timer, now),
        running: false,
      });
    if (action === "timer-reset")
      Object.assign(timer, {
        remaining: timer.duration,
        running: false,
        finished: false,
      });
    this.persist();
    this.update();
  }
  update() {
    if (!this.state) return;
    const { watch, timer } = this.state,
      remaining = countdownRemaining(timer);
    if (timer.running && remaining === 0) {
      Object.assign(timer, { running: false, remaining: 0, finished: true });
      this.persist();
    }
    if (!this.root?.isConnected) return;
    this.root.querySelector("[data-stopwatch]").textContent = clockText(
      stopwatchElapsed(watch),
    );
    this.root.querySelector("[data-countdown]").textContent =
      clockText(remaining);
    this.root.querySelector("[data-clock-status]").textContent = timer.finished
      ? getLanguage() === "fa"
        ? "زمان تمام شد"
        : "Time is up"
      : "";
    this.root.querySelector('[data-clock-action="watch-start"]').disabled =
      watch.running;
    this.root.querySelector('[data-clock-action="watch-pause"]').disabled =
      !watch.running;
    this.root.querySelector('[data-clock-action="watch-lap"]').disabled =
      !watch.running || watch.laps.length >= 30;
    this.root.querySelector('[data-clock-action="timer-start"]').disabled =
      timer.running;
    this.root.querySelector('[data-clock-action="timer-pause"]').disabled =
      !timer.running;
    for (const input of this.root.querySelectorAll("input"))
      input.disabled = timer.running;
    const laps = watch.laps
      .map(
        (ms, i) =>
          `<li><span>${i + 1}</span><bdi dir="ltr">${clockText(ms)}</bdi></li>`,
      )
      .join("");
    if (
      this.laps !== laps ||
      !this.root.querySelector("[data-clock-laps]").innerHTML
    ) {
      this.root.querySelector("[data-clock-laps]").innerHTML = laps;
      this.laps = laps;
    }
  }
}
