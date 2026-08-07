import React from 'react';
import { motion } from 'framer-motion';
import { Salon } from '../types';

interface TopRatedSectionProps {
  salons: Salon[];
  userCity: string;
  favorites: string[];
  onToggleFavorite: (salonId: string) => void;
  onSelectSalon: (salon: Salon) => void;
}

export const TopRatedSection: React.FC<TopRatedSectionProps> = ({
  salons,
  userCity,
  favorites,
  onToggleFavorite,
  onSelectSalon,
}) => {
  // No hardcoded city fallback: when the user's city is unknown we show
  // "your area" labels and consider all salons (distance sorting handles
  // relevance via the Nearby section).
  const city = userCity || 'your area';

  // Filter & Sort Criteria:
  // 1. Salons matching city (or fallback to all if city has < 1 salon / unknown)
  // 2. Minimum review threshold (e.g. verified reviews >= 10)
  // 3. Sorted by: Rating DESC -> Verified Review Count DESC -> Recent Activity DESC
  const topRatedSalons = React.useMemo(() => {
    let citySalons = city && city !== 'your area'
      ? salons.filter(
          (s) => s.city.toLowerCase() === city.toLowerCase() || s.area.toLowerCase().includes(city.toLowerCase())
        )
      : [...salons];

    if (citySalons.length === 0) {
      citySalons = [...salons]; // Fallback to all if no exact city matches
    }

    return citySalons
      .filter((s) => s.rating >= 4.5 && (s.reviewCount >= 5 || (s.verifiedReviewsCount && s.verifiedReviewsCount >= 5)))
      .sort((a, b) => {
        // Priority 1: Rating DESC
        if (b.rating !== a.rating) return b.rating - a.rating;
        // Priority 2: Verified Review Count DESC
        const aReviews = a.verifiedReviewsCount || a.reviewCount || a.reviewsCount || 0;
        const bReviews = b.verifiedReviewsCount || b.reviewCount || b.reviewsCount || 0;
        if (bReviews !== aReviews) return bReviews - aReviews;
        // Priority 3: Recent Activity DESC
        const aActive = a.lastActiveTime || 0;
        const bActive = b.lastActiveTime || 0;
        return bActive - aActive;
      })
      .slice(0, 4);
  }, [salons, city]);

  if (topRatedSalons.length === 0) return null;

  return (
    <section id="top-rated-section" className="flex flex-col gap-3.5 bg-gradient-to-b from-amber-50/70 to-white p-4 sm:p-5 rounded-[28px] border border-amber-200/80 shadow-xs relative overflow-hidden">
      {/* Decorative subtle background icon */}
      <div className="absolute -right-4 -bottom-4 text-amber-500/10 pointer-events-none select-none">
        <span className="material-symbols-outlined text-[140px]">hotel_class</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs text-lg">
            ⭐
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-[#26181c] tracking-tight flex items-center gap-1.5">
              Top Rated in {city}
              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                <span className="material-symbols-outlined text-[12px] text-amber-600">verified</span>
                Verified Reviews
              </span>
            </h2>
            <p className="text-[11px] text-[#5a3f47]">
              Ranked by verified customer appointments & recent activity
            </p>
          </div>
        </div>
      </div>

      {/* Salons Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
        {topRatedSalons.map((salon, index) => {
          const isFav = favorites.includes(salon.id);
          const verifiedCount = salon.verifiedReviewsCount || salon.reviewCount || salon.reviewsCount || 120;

          return (
            <motion.div
              key={salon.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSalon(salon)}
              className="bg-white rounded-2xl p-3.5 border border-amber-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
            >
              {/* Top Badge Overlay */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300">
                  <span className="text-[11px]">⭐</span> #{index + 1} Top Rated in {city}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(salon.id);
                  }}
                  className="w-7 h-7 rounded-full bg-amber-50 hover:bg-amber-100 text-[#8c7077] hover:text-[#e6007e] flex items-center justify-center transition-colors"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isFav ? 'text-[#e6007e] fill-current' : ''}`}>
                    favorite
                  </span>
                </button>
              </div>

              {/* Main Info */}
              <div className="flex gap-3 items-center">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                  <img
                    src={salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {salon.verified && (
                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-2xs flex items-center justify-center" title="Verified Salon">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#26181c] group-hover:text-[#e6007e] transition-colors truncate">
                    {salon.name}
                  </h3>
                  <p className="text-[11px] text-[#5a3f47] truncate">
                    {salon.area} • {salon.distanceKm} km
                  </p>

                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] font-extrabold">
                      <span className="material-symbols-outlined text-[12px] text-amber-600 fill-current">star</span>
                      {salon.rating}
                    </div>
                    <span className="text-[10px] text-[#8c7077] font-medium truncate">
                      ({verifiedCount} verified reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-100">
                <span className="text-[11px] font-semibold text-[#5a3f47]">
                  Starts at <strong className="text-[#26181c] font-extrabold">₹{salon.startingPrice}</strong>
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSalon(salon);
                  }}
                  className="px-3 py-1 bg-[#26181c] hover:bg-[#e6007e] text-white text-[11px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  Book Now
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
