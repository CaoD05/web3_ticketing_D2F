import { Link } from "react-router-dom";

export default function EventCard({ e, loading = false }) {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow animate-pulse p-4 h-full flex flex-col justify-between">
                <div className="h-48 w-full bg-gray-200 rounded-md" />
                <div className="mt-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden">
            <img
                src={e?.image || "/placeholder-event.jpg"}
                className="h-48 w-full object-cover hover:scale-105 transition"
                alt={e?.title || "Event"}
            />

            <div className="p-4">
                {e?.category && (
                    <div className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 mb-3">
                        {e.category}
                    </div>
                )}

                <h2 className="font-bold text-lg">
                    {e?.title || "Untitled Event"}
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                    {e?.date || "Sắp diễn ra"}
                </p>

                <div className="flex justify-end items-center mt-3">
                    {e?.id != null ? (
                        <Link to={`/event/${e.id}`}>
                            <button className="bg-black text-white px-3 py-1 rounded-lg hover:bg-gray-800">
                                Chi tiết
                            </button>
                        </Link>
                    ) : (
                        <button className="bg-gray-300 text-gray-500 px-3 py-1 rounded-lg" disabled>
                            Đang tải...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}