import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Hero from "../components/Hero";
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

export default function Home() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        axios.get("https://localhost:5001/api/events")
            .then(res => setEvents(res.data))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    const filteredEvents = useMemo(() => {
        if (selectedCategory === "All") return events;
        return events.filter((event) => {
            const category = event.category || event.type || "Other";
            return category.toLowerCase() === selectedCategory.toLowerCase();
        });
    }, [events, selectedCategory]);

    return (
        <div className="bg-gray-100 min-h-screen">

            <Hero />

            <div className="px-10 py-8">
                <h2 className="text-2xl font-bold mb-6">
                    Sự kiện
                </h2>

                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-3 min-w-[720px]">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                                    selectedCategory === category
                                        ? "border-black bg-black text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-black"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {loading
                        ? Array.from({ length: 4 }).map((_, idx) => (
                            <EventCard key={idx} loading />
                        ))
                        : filteredEvents.length > 0
                            ? filteredEvents.map(e => <EventCard key={e.id} e={e} />)
                            : (
                                <div className="col-span-full text-center text-gray-500 py-20">
                                    Không có sự kiện phù hợp với lựa chọn của bạn.
                                </div>
                            )
                    }
                </div>

                <div className="mt-10 text-center">
                    <Link to="/events" className="inline-flex rounded-full bg-black px-6 py-3 text-white font-semibold hover:bg-gray-900">
                        Xem tất cả sự kiện
                    </Link>
                </div>
            </div>
        </div>
    );
}