import { validIso } from "./calendar.js";
import { today } from "./finance.js";
export const exerciseKinds = ["workoutProgram", "weightEntry", "weightGoal"];
export function validateExercise(
  kind,
  data,
  records = [],
  id = null,
  currentDate = today(),
) {
  if (!exerciseKinds.includes(kind)) return;
  if (kind === "workoutProgram") {
    if (
      !data ||
      typeof data.title !== "string" ||
      !data.title.trim() ||
      data.title.length > 120 ||
      typeof data.body !== "string" ||
      !data.body.trim() ||
      data.body.length > 20000
    )
      throw Error("Enter a program title and notes under 20000 characters.");
    return;
  }
  if (
    !data ||
    !validIso(data.date) ||
    data.date < "2000-01-01" ||
    data.date > "2100-12-31" ||
    !Number.isFinite(data.kg) ||
    data.kg <= 0 ||
    data.kg > 500 ||
    Math.abs(data.kg * 10 - Math.round(data.kg * 10)) > 1e-8
  )
    throw Error("Enter a valid date and weight from 0.1 to 500 kg.");
  if (kind === "weightEntry" && data.date > currentDate)
    throw Error("Future activities cannot be completed yet.");
  if (
    records.some(
      (r) =>
        !r.deleted &&
        r.kind === kind &&
        r.id !== id &&
        (kind === "weightGoal" || r.data.date === data.date),
    )
  )
    throw Error(
      "This date already has a weight entry or goal. Edit it instead.",
    );
}
export const weightHistory = (records) =>
  records
    .filter((r) => !r.deleted && r.kind === "weightEntry")
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
export function stopwatchElapsed(state, now = Date.now()) {
  return state.elapsed + (state.running ? Math.max(0, now - state.since) : 0);
}
export function countdownRemaining(state, now = Date.now()) {
  return state.running ? Math.max(0, state.deadline - now) : state.remaining;
}
export function clockText(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
