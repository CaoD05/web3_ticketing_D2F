import { cidToGatewayUrl } from "./ipfs";

const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80";

function toEthDisplay(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric >= 1) {
    return numeric.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  return numeric.toFixed(6).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

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
      metaURL: "",
      date: "Sắp diễn ra",
      image: FALLBACK_EVENT_IMAGE,
      price: null,
      priceWei: null,
      priceEth: null,
      category: "Other",
    };
  }

  const normalizedPriceWei =
    event.priceWei ??
    (event.Price != null && typeof event.Price.toString === "function" ? event.Price.toString() : null) ??
    null;

  const normalizedPriceEth = event.priceEth ?? toEthDisplay(event.PriceEth);
  const normalizedImageFromDb = cidToGatewayUrl(event.ImageURL ?? event.imageURL ?? null);

  return {
    ...event,
    id: event.id ?? event.EventID ?? null,
    title: event.title ?? event.EventName ?? "Untitled Event",
    description: event.description ?? event.Description ?? event.MetaURL ?? "",
    metaURL: event.metaURL ?? event.MetaURL ?? "",
    date: event.date ?? formatDate(event.EventDate),
    image: event.image ?? normalizedImageFromDb ?? FALLBACK_EVENT_IMAGE,
    category: event.category ?? event.type ?? "Other",
    price: event.price ?? normalizedPriceEth,
    priceWei: normalizedPriceWei,
    priceEth: normalizedPriceEth,
  };
}
