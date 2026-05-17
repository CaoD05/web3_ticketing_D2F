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
      CreatedBy: null,
      IsHidden: false,
      IsFeatured: false,
    };
  }

  // Handle Price (Wei to Eth)
  const rawPriceWei =
    event.priceWei ??
    (event.Price != null && typeof event.Price.toString === "function" ? event.Price.toString() : null) ??
    null;

  let normalizedPriceEth = event.priceEth;
  if (!normalizedPriceEth && rawPriceWei) {
    try {
        // Use a safe numeric conversion for display
        const ethValue = Number(rawPriceWei) / 1e18;
        normalizedPriceEth = toEthDisplay(ethValue);
    } catch (e) {
        normalizedPriceEth = "0.00";
    }
  }

  const bannerFromDb = cidToGatewayUrl(
    event.BannerURL ?? 
    event.bannerurl ?? 
    event.banner_image ?? 
    event.ImageURL ?? 
    event.imageurl ?? 
    event.image ?? 
    null
  );
  
  const detailFromDb = cidToGatewayUrl(
    event.DetailURL ?? 
    event.detailurl ?? 
    event.detail_image ?? 
    event.ImageURL ?? 
    event.imageurl ?? 
    event.image ?? 
    bannerFromDb ?? 
    null
  );

  return {
    ...event, // Keep raw fields like TicketsSold, TotalTickets, etc.
    id: event.id ?? event.EventID ?? null,
    contractEventId: event.ContractEventID ?? null,
    title: event.title ?? event.EventName ?? "Untitled Event",
    description: event.description ?? event.Description ?? event.MetaURL ?? "",
    metaURL: event.metaURL ?? event.MetaURL ?? "",
    date: event.date ?? formatDate(event.EventDate),
    bannerImage: event.bannerImage ?? bannerFromDb ?? FALLBACK_EVENT_IMAGE,
    detailImage: event.detailImage ?? detailFromDb ?? bannerFromDb ?? FALLBACK_EVENT_IMAGE,
    location: event.location ?? event.Location ?? "",
    category: event.category ?? event.type ?? event.EventType ?? "Other",
    price: event.price ?? normalizedPriceEth,
    priceWei: rawPriceWei,
    priceEth: normalizedPriceEth,
    CreatedBy: event.CreatedBy ?? event.createdby ?? null,
    IsHidden: !!(event.IsHidden ?? event.ishidden ?? false),
    IsFeatured: !!(event.IsFeatured ?? event.isfeatured ?? false),
  };
}
