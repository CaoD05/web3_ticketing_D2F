import { useEffect, useState } from "react";

const slides = [
  {
    id: 1,
    image:
      "https://res.cloudinary.com/du6xqz29n/image/upload/f_auto,q_auto/cover_-_5760_x_1728_px_1800x540_xkebfd",
  },
  {
    id: 2,
    image:
      "https://res.cloudinary.com/du6xqz29n/image/upload/q_auto/f_auto/v1775157910/0305_CoverPC_xqahmg.webp",
  },
  {
    id: 3,
    image:
      "https://res.cloudinary.com/du6xqz29n/image/upload/q_auto/f_auto/v1775157910/dd1a67e10723887dd132_1_1800x557_knf7jy.webp",
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrent((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  return (
    <div className="mt-4">
      <div className="max-w-[1400px] mx-auto px-4 relative">

        {/* Slider container */}
        <div className="relative aspect-[1800/540] overflow-hidden rounded-2xl">

          {/* Slides */}
          <div
            className="flex h-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="w-full flex-shrink-0 h-full"
              >
                <img
                  src={slide.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black w-10 h-10 rounded-full shadow"
          >
            ‹
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black w-10 h-10 rounded-full shadow"
          >
            ›
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 w-full flex justify-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2.5 h-2.5 rounded-full cursor-pointer ${
                  current === index
                    ? "bg-white"
                    : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}