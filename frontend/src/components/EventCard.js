import { Link } from "react-router-dom";

export default function EventCard({ e }) {
    return (
        <div className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden">
            <img
                src={e.image}
                className="h-48 w-full object-cover hover:scale-105 transition"
            />

            <div className="p-4">
                <h2 className="font-bold text-lg">{e.title}</h2>

                <p className="text-gray-500 text-sm mt-1">
                    {e.date || "Sắp diễn ra"}
                </p>

                <div className="flex justify-between items-center mt-3">
                    <span className="text-red-500 font-bold">
                        {e.price} VND
                    </span>

                    <Link to={`/event/${e.id}`}>
                        <button className="bg-black text-white px-3 py-1 rounded-lg hover:bg-gray-800">
                            Chi tiết
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}