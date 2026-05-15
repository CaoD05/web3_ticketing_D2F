import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";
import EventCard from "../components/EventCard";

const categories = [
    "All",
    "Live Music",
    "Fan Meeting",
    "Merchandise",
    "Stage & Art",
    "Sports",
    "Conferences & Community",
    "Courses",
    "Nightlife",
    "Livestream",
    "Travel & Tours",
];

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All");
    
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const searchTerm = queryParams.get("search") || "";

    useEffect(() => {
        setLoading(true);
        api
            .get("/events")
            .then((res) => {
                const normalized = (res.data.data || []).map(normalizeEvent);
                setEvents(normalized);
            })
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    const filteredEvents = useMemo(() => {
        let result = events;

        // Filter by category
        if (selectedCategory !== "All") {
            result = result.filter((event) => {
                const category = event.category || event.type || "Other";
                return category.toLowerCase() === selectedCategory.toLowerCase();
            });
        }

        // Filter by search term
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter((event) => 
                (event.title || "").toLowerCase().includes(lowSearch) ||
                (event.location || "").toLowerCase().includes(lowSearch) ||
                (event.description || "").toLowerCase().includes(lowSearch)
            );
        }

        return result;
    }, [events, selectedCategory, searchTerm]);

    return (
        <div className="bg-gray-100 min-h-screen">
            <div className="px-6 py-8 max-w-[1400px] mx-auto">
                <div className="flex flex-col gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold">
                            {searchTerm ? `Kết quả cho "${searchTerm}"` : "Sự kiện"}
                        </h1>
                        <p className="text-gray-600 mt-2 max-w-2xl">
                            {searchTerm 
                                ? `Tìm thấy ${filteredEvents.length} sự kiện phù hợp với yêu cầu của bạn.`
                                : "Khám phá các sự kiện nổi bật và đặt vé nhanh chóng. Lọc theo thể loại để tìm sự kiện phù hợp với bạn."
                            }
                        </p>
                    </div>

                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-3 min-w-[720px]">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${selectedCategory === category
                                            ? "border-black bg-black text-white"
                                            : "border-gray-200 bg-white text-gray-700 hover:border-black"
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {loading
                            ? Array.from({ length: 8 }).map((_, idx) => (
                                <EventCard key={idx} loading />
                            ))
                            : filteredEvents.length > 0
                                ? filteredEvents.map((event) => <EventCard key={event.id ?? event.title} e={event} />)
                                : (
                                    <div className="col-span-full text-center text-gray-500 py-20 rounded-3xl bg-white shadow-sm">
                                        Không có sự kiện phù hợp với lựa chọn của bạn.
                                    </div>
                                )}
                    </div>
                </div>
            </div>
        </div>
    );
}
