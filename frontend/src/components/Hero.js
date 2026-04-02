export default function Hero() {
    return (
        <div className="relative h-[400px]">
            <img
                src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4"
                className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/50 flex flex-col justify-center px-10">
                <h1 className="text-4xl font-bold text-white">
                    Ticket – Đặt vé sự kiện nhanh chóng
                </h1>
                <p className="text-gray-300 mt-2">
                    Đặt vé nhanh chóng – đơn giản – tiện lợi
                </p>

                <button className="mt-4 w-40 bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold hover:bg-yellow-300">
                    Mua ngay
                </button>
            </div>
        </div>
    );
}