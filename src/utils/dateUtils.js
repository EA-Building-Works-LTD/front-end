export function formatTimestamp(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    let minute = date.getMinutes();
    const ampm = hour >= 12 ? "pm" : "am";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    const minuteStr = minute < 10 ? `0${minute}` : minute;
    return `${month} ${day}, ${year} ${hour}:${minuteStr}${ampm}`;
  }
  
  export function formatDayOfWeek(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", { weekday: "long" });
  }
  
  export function formatWithCommas(value) {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return "0";
    return parseInt(digits, 10).toLocaleString("en-GB");
  }
  