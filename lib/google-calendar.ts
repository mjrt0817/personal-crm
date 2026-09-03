type CalendarEventInput = {
  title: string;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
};

function utcStamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function jstDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}${map.month}${map.day}`;
}

function nextJstDate(value: string) {
  const d = new Date(value);
  d.setUTCDate(d.getUTCDate() + 1);
  return jstDate(d.toISOString());
}

export function googleCalendarEventUrl(event: CalendarEventInput) {
  const endAt = event.endAt || new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000).toISOString();
  const dates = event.allDay
    ? `${jstDate(event.startAt)}/${event.endAt ? jstDate(endAt) : nextJstDate(event.startAt)}`
    : `${utcStamp(event.startAt)}/${utcStamp(endAt)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
