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
        if (!event?.metaURL) {
            setIpfsData(null);
            return;
        }

        setIpfsLoading(true);
        setIpfsError(null);

        (async () => {
            try {
                const metadata = await fetchIPFSMetadata(event.metaURL);
                if (metadata) {
                    const parsed = parseEventMetadata(metadata);
                    setIpfsData(parsed);
                } else {
                    setIpfsError("Không thể tải dữ liệu từ IPFS");
                }
            } catch (err) {
                console.error("IPFS fetch error:", err);
                setIpfsError("Lỗi khi tải dữ liệu từ IPFS");
            } finally {
                setIpfsLoading(false);
            }
        })();
    }, [event?.metaURL]);

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
                    src={displayImage}
                    alt={displayTitle || "Event image"}
                    className="w-1/2 rounded-xl object-cover"
                />

                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{displayTitle}</h1>

                    {/* IPFS Metadata loading indicator */}
                    {ipfsLoading && (
                        <p className="text-sm text-gray-400 mt-2">Đang tải thông tin từ IPFS...</p>
                    )}

                    {ipfsError && (
                        <p className="text-sm text-red-500 mt-2">{ipfsError}</p>
                    )}

                    {/* {ipfsData && !ipfsLoading && (
                        <p className="text-xs text-green-600 mt-2">✓ Thông tin từ IPFS</p>
                    )} */}

                    {displayDescription && (
                        <p className="text-gray-500 mt-4">{displayDescription}</p>
                    )}

                    {/* Additional IPFS metadata fields */}
                    {ipfsData?.organizer && (
                        <p className="text-sm text-gray-600 mt-3">
                            <strong>Tổ chức:</strong> {ipfsData.organizer}
                        </p>
                    )}

                    {ipfsData?.location && (
                        <p className="text-sm text-gray-600 mt-2">
                            <strong>Địa điểm:</strong> {ipfsData.location}
                        </p>
                    )}

                    {ipfsData?.eventDate && (
                        <p className="text-sm text-gray-600 mt-2">
                            <strong>Ngày:</strong> {ipfsData.eventDate}
                        </p>
                    )}

                    {ipfsData?.category && (
                        <p className="text-sm text-gray-600 mt-2">
                            <strong>Thể loại:</strong> {ipfsData.category}
                        </p>
                    )}

                    {ipfsData?.tags && ipfsData.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {ipfsData.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {ipfsData?.website && (
                        <p className="mt-3 text-sm">
                            <a
                                href={ipfsData.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline"
                            >
                                Trang web sự kiện
                            </a>
                        </p>
                    )}

                    <p className="text-sm text-gray-600 mt-4">{event.date}</p>

                    <p className="text-red-500 text-xl mt-4 font-bold">
                        {displayPriceEth ? `${displayPriceEth} TEST` : "Giá sẽ cập nhật sớm"}
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