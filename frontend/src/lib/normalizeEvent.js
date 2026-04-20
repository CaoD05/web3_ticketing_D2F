const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80";

function formatDate(value) {
  if (!value) {
    return "Sắp diễn ra";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sắp diễn ra";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function normalizeEvent(event) {
  if (!event) {
    return {
      id: null,
      title: "Untitled Event",
      description: "",
      date: "Sắp diễn ra",
      image: FALLBACK_EVENT_IMAGE,
      price: null,
      category: "Other",
    };
  }

  return {
    ...event,
    id: event.id ?? event.EventID ?? null,
    title: event.title ?? event.EventName ?? "Untitled Event",
    description: event.description ?? event.Description ?? "",
    date: event.date ?? formatDate(event.EventDate),
    image: event.image ?? FALLBACK_EVENT_IMAGE,
    category: event.category ?? event.type ?? "Other",
    // Current Events table has no price column; keep null to show fallback in UI.
    price: event.price ?? null,
  };
}
