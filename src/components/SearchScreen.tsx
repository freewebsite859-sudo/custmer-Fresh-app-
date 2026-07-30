import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Salon } from '../types';
import { SalonCardSkeleton } from './Skeleton';
import { SmartSearchFilterBar } from './SmartSearchFilterBar';

interface SearchScreenProps {
  salons: Salon[];
  salonsLoading?: boolean;
  favorites: string[];
  userCity?: string;
  onToggleFavorite: (salonId: string) => void;
  onSelectSalon: (salon: Salon) => void;
  onBack: () => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  salons,
  salonsLoading = false,
  favorites,
  userCity = 'Jaipur',
  onToggleFavorite,
  onSelectSalon,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [smartFilter, setSmartFilter] = useState<'all' | 'top-rated-city' | 'top-nexora'>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('All');
  const [selectedMinPrice, setSelectedMinPrice] = useState<number>(0);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(5000);
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0);
  const [selectedDistance, setSelectedDistance] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showMapView, setShowMapView] = useState<boolean>(false);
  const [activeSalonOnMap, setActiveSalonOnMap] = useState<Salon | null>(null);

  useEffect(() => {
    // Smooth transition without flashing empty skeletons on filter toggle
    if (searchQuery) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const filteredSalons = React.useMemo(() => {
    return salons
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          q === '' ||
          s.name.toLowerCase().includes(q) ||
          s.area.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.services.some((ser) => ser.name.toLowerCase().includes(q));

        const matchesGender =
          selectedGenderFilter === 'All' ||
          !s.genderCategory ||
          s.genderCategory === selectedGenderFilter;

        const matchesPrice = s.startingPrice >= selectedMinPrice && s.startingPrice <= selectedMaxPrice;
        
        const matchesRating = s.rating === 0 || s.rating >= selectedMinRating; // unrated ("New") salons are not hidden by rating filters

        const matchesDistance = s.distanceKm <= selectedDistance;

        return matchesSearch && matchesGender && matchesPrice && matchesRating && matchesDistance;
      })
      .sort((a, b) => {
        if (smartFilter === 'top-rated-city') {
          // Sort by Rating DESC -> Review Count DESC
          if (b.rating !== a.rating) return b.rating - a.rating;
          const aRev = a.verifiedReviewsCount || a.reviewCount || 0;
          const bRev = b.verifiedReviewsCount || b.reviewCount || 0;
          return bRev - aRev;
        }
        if (smartFilter === 'top-nexora') {
          // Sort by Completed Bookings DESC -> Rating DESC
          const aBookings = a.completedBookings || Math.floor(a.rating * 80);
          const bBookings = b.completedBookings || Math.floor(b.rating * 80);
          if (bBookings !== aBookings) return bBookings - aBookings;
          return b.rating - a.rating;
        }
        return b.rating - a.rating;
      });
  }, [salons, searchQuery, smartFilter, selectedGenderFilter, selectedMinPrice, selectedMaxPrice, selectedMinRating, selectedDistance]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-32 pt-2">
      {/* Search Input Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5a3f47]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search salons, services..."
            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-[#fce2e7] text-[#26181c] text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#e6007e]/30 transition-all placeholder:text-[#5a3f47]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-[#5a3f47] hover:text-[#e6007e]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Permanent Smart Search Filters */}
        <SmartSearchFilterBar
          activeFilter={smartFilter}
          userCity={userCity}
          onSelectFilter={setSmartFilter}
        />

        {/* Simple Filter Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-1.5 flex-1 h-10 rounded-xl font-bold text-[13px] transition-all ${
              showFilters ? 'bg-[#26181c] text-white' : 'bg-white border border-[#e8e8e8] text-[#26181c]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-[#e8e8e8] rounded-2xl p-4 flex flex-col gap-4">
                <div>
                  <p className="text-[12px] font-bold text-[#5a3f47] mb-2">Gender</p>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Women Only', 'Men Only', 'Unisex'].map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGenderFilter(g)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                          selectedGenderFilter === g ? 'bg-[#e6007e] text-white' : 'bg-[#f6dce2] text-[#5a3f47]'
                        }`}
                      >
                        {g === 'Women Only' ? 'Women' : g === 'Men Only' ? 'Men' : g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-bold text-[#5a3f47]">Price Range</p>
                    <p className="text-[12px] font-bold text-[#e6007e]">₹{selectedMinPrice} - ₹{selectedMaxPrice}</p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] text-[#8c7077] mb-1">Minimum Price</p>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={selectedMinPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedMinPrice(val);
                          if (val > selectedMaxPrice) setSelectedMaxPrice(val);
                        }}
                        className="w-full h-1.5 bg-[#f6dce2] rounded-lg appearance-none cursor-pointer accent-[#e6007e]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8c7077] mb-1">Maximum Price</p>
                      <input
                        type="range"
                        min="500"
                        max="10000"
                        step="500"
                        value={selectedMaxPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedMaxPrice(val);
                          if (val < selectedMinPrice) setSelectedMinPrice(val);
                        }}
                        className="w-full h-1.5 bg-[#f6dce2] rounded-lg appearance-none cursor-pointer accent-[#e6007e]"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      {[
                        { label: 'Budget', min: 0, max: 1000 },
                        { label: 'Mid-Range', min: 1000, max: 3000 },
                        { label: 'Luxury', min: 3000, max: 10000 },
                      ].map((tier) => (
                        <button
                          key={tier.label}
                          onClick={() => {
                            setSelectedMinPrice(tier.min);
                            setSelectedMaxPrice(tier.max);
                          }}
                          className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                            selectedMinPrice === tier.min && selectedMaxPrice === tier.max
                              ? 'bg-[#26181c] text-white border-[#26181c]'
                              : 'bg-white text-[#5a3f47] border-[#e8e8e8]'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-[#5a3f47] mb-2">Rating</p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 4.0, 4.5].map(r => (
                        <button
                          key={r}
                          onClick={() => setSelectedMinRating(r)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1 ${
                            selectedMinRating === r ? 'bg-[#e6007e] text-white' : 'bg-[#f6dce2] text-[#5a3f47]'
                          }`}
                        >
                          {r === 0 ? 'Any' : `${r}+`}
                          {r > 0 && <span className="material-symbols-outlined text-[12px]">star</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-[#5a3f47] mb-2">Distance</p>
                    <div className="flex flex-wrap gap-2">
                      {[2, 5, 10].map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedDistance(d)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                            selectedDistance === d ? 'bg-[#e6007e] text-white' : 'bg-[#f6dce2] text-[#5a3f47]'
                          }`}
                        >
                          &lt; {d} km
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedGenderFilter('All');
                    setSelectedMinPrice(0);
                    setSelectedMaxPrice(5000);
                    setSelectedMinRating(0);
                    setSelectedDistance(10);
                    setSmartFilter('all');
                  }}
                  className="mt-2 w-full h-10 bg-[#fde7f3] text-[#e6007e] rounded-xl font-bold text-[13px] active:scale-95 transition-all"
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mt-1">
        <h2 className="text-[18px] font-bold text-[#26181c]">
          {filteredSalons.length} Results {searchQuery ? `for "${searchQuery}"` : ''}
        </h2>
        <span className="text-[13px] font-semibold text-[#5a3f47]">Bandra West</span>
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-5">
        {isLoading || salonsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SalonCardSkeleton key={i} />)
        ) : filteredSalons.length > 0 ? (
          filteredSalons.map((salon) => {
            const isFav = favorites.includes(salon.id);
            return (
              <div
                key={salon.id}
                className="flex flex-col bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden border border-[#e8e8e8]"
              >
                <div
                  className="relative h-44 w-full bg-[#f6dce2] cursor-pointer"
                  onClick={() => onSelectSalon(salon)}
                >
                  <img
                    src={salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover"
                  />
                  {salon.rating > 0 ? (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[14px] text-[#e6007e]">
                        star
                      </span>
                      <span className="text-[13px] font-bold text-[#26181c]">{salon.rating}</span>
                      <span className="text-[11px] font-medium text-[#5a3f47]">({salon.reviewCount ?? salon.reviewsCount})</span>
                    </div>
                  ) : salon.isNew ? (
                    <div className="absolute top-3 right-3 bg-emerald-500/95 px-2.5 py-1 rounded-full flex items-center shadow-sm">
                      <span className="text-[11px] font-bold text-white">New</span>
                    </div>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(salon.id);
                    }}
                    className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-[#8c7077] shadow-sm hover:text-[#e6007e]"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isFav ? 'text-[#e6007e] fill-current' : ''}`}>
                      favorite
                    </span>
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3
                        onClick={() => onSelectSalon(salon)}
                        className="text-[18px] font-bold text-[#26181c] cursor-pointer hover:text-[#e6007e]"
                      >
                        {salon.name}
                      </h3>
                      <p className="text-[14px] text-[#5a3f47] font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{salon.area}{salon.distanceKm > 0 ? ` • ${salon.distanceKm} km` : ''}</span>
                        <span className="text-[#e0bec6]">•</span>
                        {salon.rating > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[#26181c] font-semibold text-[13px]">
                            <span className="material-symbols-outlined text-[15px] text-amber-500 fill-current">star</span>
                            {salon.rating}
                            <span className="text-[12px] font-normal text-[#5a3f47]">({salon.reviewCount ?? salon.reviewsCount} reviews)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-600 font-semibold text-[13px]">New</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[#5a3f47] font-medium">Starting from</p>
                      <p className="text-[18px] font-bold text-[#e6007e]">₹{salon.startingPrice}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {salon.genderCategory && (
                      <span className="px-2.5 py-0.5 rounded-md bg-[#fde7f3] text-[#e6007e] text-[11px] font-semibold">
                        {salon.genderCategory}
                      </span>
                    )}
                    {salon.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-[#f6dce2] text-[#5a3f47] text-[11px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => onSelectSalon(salon)}
                    className="mt-1 w-full h-11 bg-[#8e004b] text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-[#e6007e] transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Book Now
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl p-6 border border-[#e8e8e8]">
            <span className="material-symbols-outlined text-[48px] text-[#e0bec6] mb-3">search_off</span>
            <p className="font-bold text-[#26181c] text-[16px]">No salons found</p>
            <p className="text-[#5a3f47] text-[13px] mt-1 mb-4">Try adjusting your filters to find what you're looking for.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenderFilter('All');
                setSelectedMinPrice(0);
                setSelectedMaxPrice(5000);
                setSelectedMinRating(0);
                setSelectedDistance(10);
              }}
              className="h-10 px-6 bg-[#e6007e] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Floating Map View Button */}
      <motion.button
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={() => {
          setShowMapView(true);
          setActiveSalonOnMap(filteredSalons[0] || salons[0]);
        }}
        className="fixed bottom-32 mb-safe left-1/2 -translate-x-1/2 h-12 px-6 bg-[#3c2c31] text-white rounded-full shadow-2xl flex items-center gap-2 text-[14px] font-bold z-40 cursor-pointer select-none"
      >
        <span className="material-symbols-outlined text-[20px]">map</span>
        Map View
      </motion.button>

      {/* Map View Interactive Overlay */}
      <AnimatePresence>
        {showMapView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-[#3c2c31]/60 backdrop-blur-sm flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full h-full bg-[#f6f3f2] flex flex-col"
            >
              {/* Top Map Bar */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[#e6007e]">location_on</span>
                  <span className="text-xs font-bold text-[#26181c]">Bandra West, Mumbai</span>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => setShowMapView(false)}
                  className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#26181c] font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </motion.button>
              </div>

              {/* Stylized Map View Graphic */}
              <div className="relative flex-1 bg-[#eae6e5] overflow-hidden flex items-center justify-center">
                {/* Map Grid Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#8e004b_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Animated Map Pins for Salons */}
                {salons.map((s, idx) => {
                  const isSelected = activeSalonOnMap?.id === s.id;
                  // Pin offset coordinates for visual positioning
                  const topOffsets = ['30%', '50%', '40%', '65%'];
                  const leftOffsets = ['25%', '60%', '75%', '35%'];

                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, scale: 0, y: -15 }}
                      animate={{
                        opacity: 1,
                        scale: isSelected ? 1.25 : 1,
                        y: 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 24,
                        delay: 0.1 + idx * 0.06,
                      }}
                      whileHover={{ scale: isSelected ? 1.3 : 1.12 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveSalonOnMap(s)}
                      style={{ top: topOffsets[idx % 4], left: leftOffsets[idx % 4] }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer select-none ${
                        isSelected ? 'z-30' : 'z-10'
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1 transition-colors ${
                          isSelected
                            ? 'bg-[#e6007e] text-white ring-4 ring-[#e6007e]/30'
                            : 'bg-white text-[#26181c]'
                        }`}
                      >
                        <span>₹{s.startingPrice}</span>
                        <span className="text-[10px]">★{s.rating}</span>
                      </div>
                      <div
                        className={`w-3 h-3 rotate-45 -mt-1.5 transition-colors ${
                          isSelected ? 'bg-[#e6007e]' : 'bg-white'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>

              {/* Bottom Salon Preview Card */}
              <AnimatePresence mode="wait">
                {activeSalonOnMap && (
                  <motion.div
                    key={activeSalonOnMap.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="p-4 bg-white rounded-t-3xl shadow-2xl z-20"
                  >
                    <div className="flex gap-4 items-center">
                      <img
                        src={activeSalonOnMap.image}
                        alt={activeSalonOnMap.name}
                        className="w-20 h-20 rounded-2xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-[#e6007e] uppercase tracking-wider">
                          {activeSalonOnMap.distanceKm} km away
                        </span>
                        <h4 className="text-base font-bold text-[#26181c] truncate">
                          {activeSalonOnMap.name}
                        </h4>
                        <p className="text-xs text-[#5a3f47] truncate">{activeSalonOnMap.address}</p>
                        <p className="text-xs font-bold text-[#8e004b] mt-1">
                          From ₹{activeSalonOnMap.startingPrice}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowMapView(false);
                        onSelectSalon(activeSalonOnMap);
                      }}
                      className="w-full mt-3 h-11 bg-[#e6007e] text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
                    >
                      Book Appointment
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
