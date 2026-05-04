import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);

    useEffect(() => {
        axios.get(`http://localhost:5000/api/events/${id}`)
            .then(res => setEvent(res.data.data || res.data));
    }, [id]);

    if (!event) return <div>Loading...</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="bg-white rounded-2xl shadow p-6 flex gap-6">

                <img
                    src={event.ImageUrl || event.image || "/logoUTC.png"}
                    alt={event.EventName || event.title || "Event image"}
                    className="w-1/2 rounded-xl object-cover"
                />

                <div>
                    <h1 className="text-3xl font-bold">{event.EventName || event.title}</h1>
                    <p className="text-gray-500 mt-2">{event.Description || event.description}</p>

                    {event.Location && (
                        <p className="text-gray-600 mt-2">📍 {event.Location}</p>
                    )}

                    {event.EventDate && (
                        <p className="text-gray-600 mt-1">
                            📅 {new Date(event.EventDate).toLocaleDateString("vi-VN")}
                        </p>
                    )}

                    <p className="text-red-500 text-xl mt-4 font-bold">
                        {event.price ? `${event.price} VND` : "Liên hệ"}
                    </p>

                    <button className="mt-6 bg-yellow-400 px-6 py-3 rounded-xl font-bold hover:bg-yellow-300">
                        Mua vé ngay
                    </button>
                </div>

            </div>
        </div>
    );
}