import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";
import { fetchIPFSMetadata, parseEventMetadata } from "../lib/ipfs";

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [ipfsData, setIpfsData] = useState(null);
    const [ipfsLoading, setIpfsLoading] = useState(false);
    const [ipfsError, setIpfsError] = useState(null);

    // Fetch event details from backend
    useEffect(() => {
        api.get(`/events/${id}`)
            .then(res => setEvent(normalizeEvent(res.data?.data || null)))
            .catch(() => setEvent(null));
    }, [id]);

    // Fetch IPFS metadata if metaURL exists
    useEffect(() => {
        axios.get(`http://localhost:5000/api/events/${id}`)
            .then(res => setEvent(res.data.data || res.data));
    }, [id]);

    if (!event) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex items-center justify-center">
                <div className="text-gray-600 text-lg">Đang tải sự kiện...</div>
            </div>
        );
    }

    // Use IPFS data if available, otherwise fall back to event data
    const displayTitle = ipfsData?.title || event.title;
    const displayDescription = ipfsData?.description || event.description;
    const displayImage = event.image;
    const displayPriceEth = event.priceEth || null;

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

                    {/* MetaURL reference (debugging/transparency) */}
                    {event.metaURL && (
                        <p className="mt-4 text-xs text-gray-400 break-all">
                            <strong>CID:</strong> {event.metaURL}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}