import { useEffect, useState } from "react";
import axios from "axios";
import Hero from "../components/Hero";
import EventCard from "../components/EventCard";

export default function Home() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        axios.get("https://localhost:5001/api/events")
            .then(res => setEvents(res.data));
    }, []);

    return (
        <div className="bg-gray-100 min-h-screen">

            <Hero />

            <div className="px-10 py-8">
                <h2 className="text-2xl font-bold mb-6">
                    Sự kiện nổi bật
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {events.map(e => (
                        <EventCard key={e.id} e={e} />
                    ))}
                </div>
            </div>
        </div>
    );
}