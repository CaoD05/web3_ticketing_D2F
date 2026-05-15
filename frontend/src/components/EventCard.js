import { Link } from "react-router-dom";

export default function EventCard({ e, loading = false }) {
    if (loading) {
        return (
            <div className="bg-white rounded-3xl shadow-sm animate-pulse overflow-hidden">
                <div className="aspect-video w-full bg-zinc-200" />
                <div className="p-5 space-y-3">
                    <div className="h-4 bg-zinc-200 rounded w-3/4" />
                    <div className="h-3 bg-zinc-200 rounded w-1/2" />
                    <div className="h-8 bg-zinc-200 rounded w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 h-full flex flex-col">
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={e?.detailImage || "/placeholder-event.jpg"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={e?.title || "Event"}
                    loading="lazy"
                />
                <div className="absolute top-4 left-4">
                    {e?.category && (
                        <div className="backdrop-blur-md bg-black/50 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/20">
                            {e.category}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h2 className="font-bold text-xl text-zinc-900 line-clamp-2 leading-tight group-hover:text-yellow-500 transition-colors">
                        {e?.title || "Untitled Event"}
                    </h2>

                    <div className="flex items-center gap-2 text-zinc-500 text-xs mt-3 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {e?.date || "Sắp diễn ra"}
                    </div>
                </div>

                <div className="mt-6">
                    {e?.id != null ? (
                        <Link 
                            to={`/event/${e.id}`}
                            className="block w-full text-center bg-zinc-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-black transition-colors active:scale-95"
                        >
                            Mua vé ngay
                        </Link>
                    ) : (
                        <button className="w-full bg-zinc-100 text-zinc-400 py-3 rounded-2xl font-bold text-sm" disabled>
                            Đang tải...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
