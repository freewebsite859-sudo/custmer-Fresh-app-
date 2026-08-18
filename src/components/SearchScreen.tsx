import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Salon } from '../types';
import { SalonCardSkeleton } from './Skeleton';
import { SmartSearchFilterBar } from './SmartSearchFilterBar';
import { SERVICE_CATEGORIES, salonMatchesCategory, isSalonOpenNow } from '../lib/salonCategories';

interface SearchScreenProps {
  salons: Salon[];
  salonsLoading?: boolean;
  favorites: string[];
  userCity?: string;
  /** Pre-selected service category, e.g. from tapping "Hair" on Home. */
  initialCategory?: string;
  onToggleFavorite: (salonId: string) => void;
  onSelectSalon: (salon: Salon) => void;
  onBack: () => void;
}

const QUICK_FILTER_CHIPS = [
  { id: 'open-now', label: 'Open Now', icon: 'schedule' },
  { id: 'available-today', label: 'Available Today', icon: 'event_available' },
  { id: 'top-rated', label: 'Top Rated', icon: 'star' },
  { id: 'nearest', label: 'Nearest', icon: 'near_me' },
  { id: 'offers', label: 'Offers', icon: 'sell' },
  { id: 'at-home', label: 'At Home', icon: 'home' },
] as const;

type QuickFilterId = (typeof QUICK_FILTER_CHIPS)[number]['id'];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  salons,
  salonsLoading = false,
  favorites,
  userCity = 'Jaipur',
  initialCategory = 'All',
  onToggleFavorite,
  onSelectSalon,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [smartFilter, setSmartFilter] = useState<'all' | 'top-rated-city' | 'top-nexora'>('all');
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilterId[]>([]);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-low' | 'price-high' | 'rating'>('recommended');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeSalonOnMap, setActiveSalonOnMap] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setSelectedCategory(initialCategory || 'All');
  }, [initialCategory]);

  useEffect(() => {
    if (searchQuery) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 150);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const toggleQuickFilter = (id: QuickFilterId) => {
    setActiveQuickFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const activeCategoryLabel = useMemo(
    () => SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Services',
    [selectedCategory],
  );

  const filteredSalons = useMemo(() => {
    return salons
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          q === '' ||
          s.name.toLowerCase().includes(q) ||
          s.area.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.services.some((ser) => ser.name.toLowerCase().includes(q));

        const matchesCategory = salonMatchesCategory(s, selectedCategory);

        const matchesQuickFilters = activeQuickFilters.every((f) => {
          if (f === 'open-now') return isSalonOpenNow(s.hours);
          if (f === 'available-today') return isSalonOpenNow(s.hours);
          if (f === 'top-rated') return s.rating >= 4.5;
          if (f === 'nearest') return s.distanceKm > 0 && s.distanceKm <= 5;
          if (f === 'offers') return (s.offers?.length ?? 0) > 0;
          if (f === 'at-home') return s.tags.some((t) => /home/i.test(t)) || /home service/i.test(s.description || '');
          return true;
        });

        return matchesSearch && matchesCategory && matchesQuickFilters;
      })
      .sort((a, b) => {
        if (smartFilter === 'top-rated-city') {
          if (b.rating !== a.rating) return b.rating - a.rating;
          const aRev = a.verifiedReviewsCount || a.reviewCount || 0;
          const bRev = b.verifiedReviewsCount || b.reviewCount || 0;
          return bRev - aRev;
        }
        if (smartFilter === 'top-nexora') {
          const aBookings = a.completedBookings || Math.floor(a.rating * 80);
          const bBookings = b.completedBookings || Math.floor(b.rating * 80);
          if (bBookings !== aBookings) return bBookings - aBookings;
          return b.rating - a.rating;
        }
        if (sortBy === 'price-low') return a.startingPrice - b.startingPrice;
        if (sortBy === 'price-high') return b.startingPrice - a.startingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        // Recommended: favourites first, then distance, then rating.
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        if (a.distanceKm > 0 && b.distanceKm > 0 && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return b.rating - a.rating;
      });
  }, [salons, searchQuery, selectedCategory, activeQuickFilters, smartFilter, sortBy, favorites]);

  const sortOptions: Array<{ id: typeof sortBy; label: string }> = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Highest Rated' },
  ];
  const activeSortLabel = sortOptions.find((o) => o.id === sortBy)?.label || 'Recommended';

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-32 pt-2">
      {/* Hero — reflects the real, currently-matching result count and category */}
      <section className="flex flex-col gap-1">
        <h1 className="font-page-heading text-page-heading text-on-surface">
          {filteredSalons.length} places near you
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Find nearby salons and barbers{selectedCategory !== 'All' ? ` offering ${activeCategoryLabel}` : ''}
        </p>
      </section>

      {/* Category Chips */}
      <section className="-mx-5">
        <div className="overflow-x-auto no-scrollbar flex gap-2 px-5">
          {SERVICE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-full font-button-text text-[14px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-nexora-pink text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-nexora-pink hover:text-nexora-pink'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Search Bar */}
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search in ${activeCategoryLabel}`}
          className="w-full h-12 pl-12 pr-12 rounded-2xl bg-surface-container-highest text-on-surface text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-nexora-pink/30 transition-all placeholder:text-outline"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-nexora-pink cursor-pointer"
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

      {/* Sort + List/Map Toggle */}
      <div className="flex items-center justify-between relative">
        <button
          onClick={() => setIsSortMenuOpen((v) => !v)}
          className="flex items-center gap-1 text-on-surface-variant hover:text-nexora-pink transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">sort</span>
          <span className="font-button-text text-[14px]">Sort: {activeSortLabel}</span>
          <span className="material-symbols-outlined text-[18px]">{isSortMenuOpen ? 'expand_less' : 'expand_more'}</span>
        </button>

        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md font-button-text text-[12px] flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-nexora-pink shadow-sm' : 'text-on-surface-variant hover:text-nexora-pink'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">list</span>
            List
          </button>
          <button
            onClick={() => {
              setViewMode('map');
              setActiveSalonOnMap(filteredSalons[0] || salons[0] || null);
            }}
            className={`px-3 py-1 rounded-md font-button-text text-[12px] flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-nexora-pink shadow-sm' : 'text-on-surface-variant hover:text-nexora-pink'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">map</span>
            Map
          </button>
        </div>

        {isSortMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-outline-variant z-20 overflow-hidden">
            {sortOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSortBy(opt.id);
                  setIsSortMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                  sortBy === opt.id ? 'bg-primary-container text-nexora-pink' : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="-mx-5">
        <div className="overflow-x-auto no-scrollbar flex gap-2 px-5">
          {QUICK_FILTER_CHIPS.map((chip) => {
            const isActive = activeQuickFilters.includes(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleQuickFilter(chip.id)}
                className={`px-4 py-2 rounded-full font-button-text text-[14px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-nexora-pink text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-nexora-pink hover:text-nexora-pink'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{chip.icon}</span>
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-component-gap">
        {isLoading || salonsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SalonCardSkeleton key={i} />)
        ) : filteredSalons.length > 0 ? (
          filteredSalons.map((salon) => {
            const isFav = favorites.includes(salon.id);
            const openNow = isSalonOpenNow(salon.hours);
            return (
              <div
                key={salon.id}
                className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-outline-variant"
              >
                <div className="relative h-48 cursor-pointer" onClick={() => onSelectSalon(salon)}>
                  <img src={salon.image} alt={salon.name} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(salon.id);
                    }}
                    aria-label={isFav ? `Remove ${salon.name} from favorites` : `Add ${salon.name} to favorites`}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-nexora-pink cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isFav ? 'fill-1' : ''}`}>favorite</span>
                  </button>
                  {openNow ? (
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-success-emerald text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      Open
                    </div>
                  ) : salon.isNew ? (
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-warning-amber text-white text-[10px] font-bold rounded uppercase tracking-wider">
                      New
                    </div>
                  ) : null}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      onClick={() => onSelectSalon(salon)}
                      className="font-card-title text-card-title text-on-surface cursor-pointer hover:text-nexora-pink transition-colors"
                    >
                      {salon.name}
                    </h3>
                    {salon.rating > 0 ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-warning-amber text-[16px] fill-1">star</span>
                        <span className="text-metadata font-bold">{salon.rating}</span>
                        <span className="text-metadata text-on-surface-variant">({salon.reviewCount ?? salon.reviewsCount})</span>
                      </div>
                    ) : (
                      <span className="text-metadata font-bold text-success-emerald shrink-0">New</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-on-surface-variant mb-2">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="text-metadata">
                      {salon.area}
                      {salon.distanceKm > 0 ? ` · ${salon.distanceKm} km` : ''}
                    </span>
                  </div>
                  <p className="text-metadata text-on-surface-variant mb-4">
                    {[salon.genderCategory, ...salon.tags.slice(0, 2)].filter(Boolean).join(' · ')}
                  </p>
                  <button
                    onClick={() => onSelectSalon(salon)}
                    className="w-full h-touch-target-min bg-primary text-on-primary font-button-text rounded-lg hover:bg-nexora-pink transition-colors cursor-pointer"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl p-6 border border-outline-variant">
            <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3">search_off</span>
            <p className="font-card-title text-on-surface text-[16px]">No salons found</p>
            <p className="text-on-surface-variant text-[13px] mt-1 mb-4">Try adjusting your filters to find what you're looking for.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setActiveQuickFilters([]);
                setSmartFilter('all');
              }}
              className="h-10 px-6 bg-nexora-pink text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Map View Overlay — stylized pin-drop graphic (no external map SDK) */}
      <AnimatePresence>
        {viewMode === 'map' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full h-full bg-surface-container-low flex flex-col"
            >
              {/* Top Map Bar */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-nexora-pink">location_on</span>
                  <span className="text-xs font-bold text-on-surface">{userCity}</span>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => setViewMode('list')}
                  className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-on-surface font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </motion.button>
              </div>

              {/* Stylized Map Graphic */}
              <div className="relative flex-1 bg-surface-container overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#8e004b_1px,transparent_1px)] [background-size:16px_16px]" />
                {filteredSalons.map((s, idx) => {
                  const isSelected = activeSalonOnMap?.id === s.id;
                  const topOffsets = ['30%', '50%', '40%', '65%'];
                  const leftOffsets = ['25%', '60%', '75%', '35%'];
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, scale: 0, y: -15 }}
                      animate={{ opacity: 1, scale: isSelected ? 1.25 : 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.1 + idx * 0.06 }}
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
                          isSelected ? 'bg-nexora-pink text-white ring-4 ring-nexora-pink/30' : 'bg-white text-on-surface'
                        }`}
                      >
                        <span>₹{s.startingPrice}</span>
                        <span className="text-[10px]">★{s.rating}</span>
                      </div>
                      <div className={`w-3 h-3 rotate-45 -mt-1.5 transition-colors ${isSelected ? 'bg-nexora-pink' : 'bg-white'}`} />
                    </motion.button>
                  );
                })}
              </div>

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
                        {activeSalonOnMap.distanceKm > 0 && (
                          <span className="text-[11px] font-bold text-nexora-pink uppercase tracking-wider">
                            {activeSalonOnMap.distanceKm} km away
                          </span>
                        )}
                        <h4 className="text-base font-bold text-on-surface truncate">{activeSalonOnMap.name}</h4>
                        <p className="text-xs text-on-surface-variant truncate">{activeSalonOnMap.address}</p>
                        <p className="text-xs font-bold text-primary mt-1">From ₹{activeSalonOnMap.startingPrice}</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setViewMode('list');
                        onSelectSalon(activeSalonOnMap);
                      }}
                      className="w-full mt-3 h-11 bg-nexora-pink text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
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
