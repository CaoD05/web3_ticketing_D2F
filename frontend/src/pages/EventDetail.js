import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);

    useEffect(() => {
        api.get(`/events/${id}`)
            .then(res => setEvent(normalizeEvent(res.data?.data || null)))
            .catch(() => setEvent(null));
    }, [id]);

    if (!event) return <div>Loading...</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="bg-white rounded-2xl shadow p-6 flex gap-6">

                <img
                    src={event.image}
                    alt={event.title || "Event image"}
                    className="w-1/2 rounded-xl"
                />

                <div>
                    <h1 className="text-3xl font-bold">{event.title}</h1>
                    <p className="text-gray-500 mt-2">{event.description}</p>

                    <p className="text-sm text-gray-600 mt-2">{event.date}</p>

                    <p className="text-red-500 text-xl mt-4 font-bold">
                        {event.price ? `${event.price} VND` : "Giá sẽ cập nhật sớm"}
                    </p>

                    <button className="mt-6 bg-yellow-400 px-6 py-3 rounded-xl font-bold hover:bg-yellow-300">
                        Mua vé ngay
                    </button>
                </div>

            </div>
        </div>
    );
}