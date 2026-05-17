import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";

const FALLBACK_SLIDES = [
  {
    id: "f1",
    bannerImage: "https://res.cloudinary.com/du6xqz29n/image/upload/f_auto,q_auto/cover_-_5760_x_1728_px_1800x540_xkebfd",
  },
  {
    id: "f2",
    bannerImage: "https://res.cloudinary.com/du6xqz29n/image/upload/q_auto/f_auto/v1775157910/0305_CoverPC_xqahmg.webp",
  },
  {
    id: "f3",
    bannerImage: "https://res.cloudinary.com/du6xqz29n/image/upload/q_auto/f_auto/v1775157910/dd1a67e10723887dd132_1_1800x557_knf7jy.webp",
  }
];

export default function Hero() {
  const [events, setEvents] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/events")
      .then(res => {
        const allEvents = (res.data?.data || []).map(normalizeEvent);
        const publicEvents = allEvents.filter(e => !e.IsHidden && !e.IsCancelled);
        
        // Shuffle and take up to 5
        const shuffled = [...publicEvents].sort(() => 0.5 - Math.random()).slice(0, 5);
        setEvents(shuffled);
      })
      .catch(err => {
        console.error("Hero: Failed to fetch events", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSlides = useMemo(() => {
    return events.length > 0 ? events : FALLBACK_SLIDES;
  }, [events]);

  // Reset timer logic
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [current, activeSlides.length]); // Added 'current' to dependencies to reset timer on change

  const nextSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrent((prev) => (prev + 1) % activeSlides.length);
  };

  const prevSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrent((prev) =>
      prev === 0 ? activeSlides.length - 1 : prev - 1
    );
  };

  const handleSlideClick = (slide) => {
    if (slide.id && !slide.id.toString().startsWith('f')) {
      navigate(`/event/${slide.id}`);
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="mt-4 px-4 max-w-[1400px] mx-auto">
        <div className="aspect-[1800/540] bg-zinc-200 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

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
            {activeSlides.map((slide) => (
              <div
                key={slide.id}
                onClick={() => handleSlideClick(slide)}
                className="w-full flex-shrink-0 h-full cursor-pointer"
              >
                <img
                  src={slide.bannerImage || slide.image}
                  alt={slide.title || ""}
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
            {activeSlides.map((_, index) => (
              <div
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrent(index); }}
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
