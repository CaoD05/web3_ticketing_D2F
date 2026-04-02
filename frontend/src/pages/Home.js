import { useEffect, useState } from "react";
import axios from "axios";
import Hero from "../components/Hero";
import EventCard from "../components/EventCard";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get("https://localhost:5001/api/events")
            .then(res => setEvents(res.data))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="bg-gray-100 min-h-screen">

            <Hero />

            <div className="px-10 py-8">
                <h2 className="text-2xl font-bold mb-6">
                    Sự kiện
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {loading
                        ? Array.from({ length: 4 }).map((_, idx) => (
                            <EventCard key={idx} loading />
                        ))
                        : events.length > 0
                            ? events.map(e => <EventCard key={e.id} e={e} />)
                            : (
                                <div className="col-span-full text-center text-gray-500 py-20">
                                    Không có sự kiện để hiển thị.
                                </div>
                            )
                    }
                </div>
            </div>
        </div>
    );
}