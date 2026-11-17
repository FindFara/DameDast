import { holidayData } from "./holiday-data.js";
export { holidayData };
export function dayHoliday(date, prefs) {
  const weekDay = new Date(date + "T12:00:00Z").getUTCDay();
  const weekend =
    prefs.weekend === "saturday-sunday"
      ? [0, 6]
      : prefs.weekend === "thursday-friday"
        ? [4, 5]
        : [5];
  return {
    weekend: weekend.includes(weekDay),
    events: prefs.holidays
      ? holidayData.events.filter((e) => e.date === date)
      : [],
  };
}
