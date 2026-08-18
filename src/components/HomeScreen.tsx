import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Salon, Screen, Booking } from '../types';
import { BANNER_URL } from '../data/mockData';
import { SalonCardSkeleton } from './Skeleton';
import { OfflineDashboardCard } from './OfflineDashboardCard';
import { SmartSearchFilterBar } from './SmartSearchFilterBar';
import { TopRatedSection } from './TopRatedSection';
import { NexoraLeaderboardSection } from './NexoraLeaderboardSection';
import { useGpsLocation } from '../hooks/useGpsLocation';
import { filterSalons, FilterResult } from '../services/salonFilter';
import { RadiusOption } from '../services/location/locationTypes';
import { LocationSelectionModal } from './LocationSelectionModal';
import { SERVICE_CATEGORIES, isSalonOpenNow, salonMatchesCategory } from '../lib/salonCategories';

interface HomeScreenProps {
  salons: Salon[];
  salonsLoading?: boolean;
  favorites: string[];
  favoriteServicesCount?: number;
  favoriteProfessionalsCount?: number;
  recentlyViewed?: string[];
  bookings?: Booking[];
  customerName?: string;
  onToggleFavorite: (salonId: string) => void;
  onSelectSalon: (salon: Salon) => void;
  onNavigate: (screen: Screen) => void;
  onOpenLocationSelector?: () => void;
  isAppointmentDismissed?: boolean;
  onDismissAppointment?: () => void;
  /** Opens the results/search screen pre-filtered to this service category. */
  onExploreCategory?: (categoryId: string) => void;
}

const QUICK_FILTER_CHIPS = ['All', 'Open Now', 'Top Rated', 'Offers', 'At Home', 'Luxury', 'Budget'] as const;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  salons,
  salonsLoading = false,
  favorites,
  favoriteServicesCount = 0,
  favoriteProfessionalsCount = 0,
  recentlyViewed = [],
  bookings,
  customerName = '',
  onToggleFavorite,
  onSelectSalon,
  onNavigate,
  onOpenLocationSelector,
  isAppointmentDismissed,
  onDismissAppointment,
  onExploreCategory,
}) => {
  const {
    location: gpsState,
    isLoading: isLocationLoading,
    permissionDenied: gpsPermissionDenied,
    needsManual: gpsNeedsManual,
    setManual: gpsSetManual,
    forceRefresh: gpsForceRefresh,
  } = useGpsLocation();

  const [nearbyRadius, setNearbyRadius] = useState<RadiusOption>(10);
  const [gpsFilterResult, setGpsFilterResult] = useState<FilterResult | null>(null);
  const [gpsFilteredSalons, setGpsFilteredSalons] = useState<any[]>([]);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [smartFilter, setSmartFilter] = useState<'all' | 'top-rated-city' | 'top-nexora'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | 'category' | 'top'>('all');
  const [topTab, setTopTab] = useState<'frequent' | 'trending'>('frequent');
  const [isLoading] = useState<boolean>(false);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('Default');
  const [filterArea, setFilterArea] = useState<string>('All');
  const [filterAudience, setFilterAudience] = useState<string>('All');
  const [quickFilterChip, setQuickFilterChip] = useState<string>('All');

  // Recent searches — kept for the current browser session only (sessionStorage),
  // no server round-trip needed for this lightweight UX affordance.
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem('nexora_recent_searches');
      return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  const commitRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        sessionStorage.setItem('nexora_recent_searches', JSON.stringify(next));
      } catch {
        /* sessionStorage unavailable — non-critical */
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      sessionStorage.removeItem('nexora_recent_searches');
    } catch {
      /* sessionStorage unavailable — non-critical */
    }
  };

  const popularAreas = ['All', 'Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Raja Park', 'Mansarovar'];
  const sortOptions = ['Default', 'Price: Low to High', 'Price: High to Low', 'Highest Rated'];
  const audienceOptions = ['All', 'Unisex', 'Male / Men', 'Female / Women', 'Kids / Children'];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Calculate nearby salons sorted by distance using GeoJSON
  const [nearbySalonsList, setNearbySalonsList] = useState<any[]>([]);
  useEffect(() => {
    if (!gpsState?.lat || !gpsState?.lng || salons.length === 0) {
      setNearbySalonsList([]);
      return;
    }
    let cancelled = false;
    filterSalons(salons, gpsState.lat, gpsState.lng, gpsState.area || '', nearbyRadius)
      .then(result => {
        if (!cancelled) setNearbySalonsList(result.salons);
      })
      .catch(() => { if (!cancelled) setNearbySalonsList([]); });
    return () => { cancelled = true; };
  }, [gpsState?.lat, gpsState?.lng, gpsState?.area, salons, nearbyRadius]);

  // Scroll container ref for smooth horizontal carousel scrolling
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const recCarouselRef = React.useRef<HTMLDivElement>(null);
  const categoryRef = React.useRef<HTMLDivElement>(null);

  const handleScrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScrollRecCarousel = (direction: 'left' | 'right') => {
    if (recCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      recCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScrollCategory = (direction: 'left' | 'right') => {
    if (categoryRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const userBookings: Booking[] = useMemo(() => {
    return bookings && bookings.length > 0 ? bookings : [];
  }, [bookings]);

  // Frequent Services from User Booking History
  const frequentServices = useMemo(() => {
    const serviceMap = new Map<
      string,
      {
        serviceName: string;
        category: string;
        count: number;
        avgPrice: number;
        durationMinutes: number;
        lastSalonName: string;
        lastSalonId: string;
        lastBookedDate?: string;
      }
    >();

    userBookings.forEach((booking) => {
      booking.services.forEach((service) => {
        const key = service.name.trim().toLowerCase();
        const existing = serviceMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          serviceMap.set(key, {
            serviceName: service.name,
            category: service.category || 'Beauty',
            count: 1,
            avgPrice: service.price,
            durationMinutes: service.durationMinutes || 45,
            lastSalonName: booking.salonName,
            lastSalonId: booking.salonId,
            lastBookedDate: booking.dateStr,
          });
        }
      });
    });

    return Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);
  }, [userBookings]);

  // "Book Again" — most recently booked distinct salons, newest first, so a
  // customer can one-tap rebook a place they've already visited.
  const bookAgainSalons = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ salon: Salon; lastBooking: Booking }> = [];
    [...userBookings]
      .sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0))
      .forEach((booking) => {
        if (seen.has(booking.salonId)) return;
        const matchedSalon = salons.find((s) => s.id === booking.salonId);
        if (!matchedSalon) return;
        seen.add(booking.salonId);
        out.push({ salon: matchedSalon, lastBooking: booking });
      });
    return out.slice(0, 6);
  }, [userBookings, salons]);

  // "Popular Near You" — the areas with the most listed salons, so the chips
  // reflect real coverage instead of a hardcoded neighbourhood list.
  const popularNearbyAreas = useMemo(() => {
    const counts = new Map<string, number>();
    salons.forEach((s) => {
      const area = (s.area || '').trim();
      if (!area) return;
      counts.set(area, (counts.get(area) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([area]) => area);
  }, [salons]);

  // Trending Treatments across salons
  const trendingTreatments = useMemo(() => {
    const list: Array<{
      serviceName: string;
      category: string;
      price: number;
      durationMinutes: number;
      salon: Salon;
      rating: number;
    }> = [];

    salons.forEach((salon) => {
      salon.services.forEach((service) => {
        const isPopular = salon.rating >= 4.6;
        if (isPopular && list.length < 6) {
          list.push({
            serviceName: service.name,
            category: service.category || salon.tags[0] || 'Beauty',
            price: service.price,
            durationMinutes: service.durationMinutes || 45,
            salon,
            rating: salon.rating,
          });
        }
      });
    });

    return list.sort((a, b) => b.rating - a.rating);
  }, [salons]);

  // Compute user preferred service categories from past bookings
  const preferredCategories = useMemo(() => {
    const catCounts: Record<string, number> = {};
    userBookings.forEach((b) => {
      b.services.forEach((s) => {
        catCounts[s.category] = (catCounts[s.category] || 0) + 1;
      });
    });
    return Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
  }, [userBookings]);

  // Recommendation Engine
  const recommendedSalons = useMemo(() => {
    const scored = salons.map((salon) => {
      let score = 50;
      const reasons: string[] = [];

      // 1. Past Service Category Heuristic
      let hasCategoryMatch = false;
      if (preferredCategories.length > 0) {
        const matchesCategory = salon.services.some((s) =>
          preferredCategories.some((pc) => s.category.toLowerCase().includes(pc.toLowerCase()))
        );
        if (matchesCategory) {
          score += 25;
          hasCategoryMatch = true;
          reasons.push(`💇 Matches your ${preferredCategories[0]} preference`);
        }
      }

      if (!hasCategoryMatch && salon.tags.length > 0) {
        reasons.push(`✨ Popular for ${salon.tags[0]}`);
      }

      // 2. Frequently Viewed Heuristic
      if (recentlyViewed.includes(salon.id)) {
        score += 20;
        reasons.push('👁️ Frequently viewed studio');
      }

      // 3. Rating & Quality Heuristic
      if (salon.rating >= 4.8) {
        score += 20;
        reasons.push(`⭐ Top Rated (${salon.rating}★)`);
      }
      if (salon.verified) {
        score += 10;
      }

      const matchPercentage = Math.min(99, Math.max(86, Math.round((score / 120) * 100)));

      return {
        salon,
        score,
        matchPercentage,
        primaryReason: reasons[0] || '✨ Featured on Nexora',
        secondaryReason: reasons[1] || (salon.reviewCount > 0 ? `⭐ ${salon.rating}★ (${salon.reviewCount}+ reviews)` : '✨ New on Nexora'),
        isCategoryMatch: hasCategoryMatch,
        isTopRated: salon.rating >= 4.8,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    if (recommendationFilter === 'category') {
      return scored.filter((item) => item.isCategoryMatch || item.salon.tags.length > 0);
    }
    if (recommendationFilter === 'top') {
      return scored.filter((item) => item.isTopRated);
    }

    return scored;
  }, [salons, preferredCategories, recommendationFilter, recentlyViewed]);

  const categories = SERVICE_CATEGORIES;

  const filteredSalons = useMemo(() => {
    const recScoresMap = new Map<string, number>();
    recommendedSalons.forEach(item => {
      recScoresMap.set(item.salon.id, item.score);
    });

    return salons.filter((salon) => {
      const matchesCategory = salonMatchesCategory(salon, selectedCategory);

      const matchesSearch =
        searchQuery.trim() === '' ||
        (salon.name && salon.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (salon.area && salon.area.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (salon.tags && salon.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesArea = filterArea === 'All' || 
        salon.area.toLowerCase().includes(filterArea.toLowerCase()) || 
        filterArea.toLowerCase().includes(salon.area.toLowerCase());

      const matchesAudience = filterAudience === 'All' || (() => {
        if (filterAudience === 'Unisex') return salon.genderCategory === 'Unisex';
        if (filterAudience === 'Male / Men') return salon.genderCategory === 'Men Only' || salon.genderCategory === 'Unisex';
        if (filterAudience === 'Female / Women') return salon.genderCategory === 'Women Only' || salon.genderCategory === 'Unisex';
        if (filterAudience === 'Kids / Children') return salon.tags.some(t => t.toLowerCase().includes('kid') || t.toLowerCase().includes('child'));
        return true;
      })();

      const matchesQuickChip = quickFilterChip === 'All' || (() => {
        if (quickFilterChip === 'Open Now') return isSalonOpenNow(salon.hours);
        if (quickFilterChip === 'Top Rated') return salon.rating >= 4.5;
        if (quickFilterChip === 'Offers') return (salon.offers?.length ?? 0) > 0;
        if (quickFilterChip === 'At Home') return salon.tags.some(t => /home/i.test(t)) || /home service/i.test(salon.description || '');
        if (quickFilterChip === 'Luxury') return salon.startingPrice >= 3000;
        if (quickFilterChip === 'Budget') return salon.startingPrice > 0 && salon.startingPrice <= 1000;
        return true;
      })();

      return matchesCategory && matchesSearch && matchesArea && matchesAudience && matchesQuickChip;
    }).sort((a, b) => {
      if (smartFilter === 'top-rated-city') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        const aRev = a.verifiedReviewsCount || a.reviewCount || 0;
        const bRev = b.verifiedReviewsCount || b.reviewCount || 0;
        if (bRev !== aRev) return bRev - aRev;
        return (b.lastActiveTime || 0) - (a.lastActiveTime || 0);
      }
      if (smartFilter === 'top-nexora') {
        const aBookings = a.completedBookings || Math.floor(a.rating * 80);
        const bBookings = b.completedBookings || Math.floor(b.rating * 80);
        if (bBookings !== aBookings) return bBookings - aBookings;
        return b.rating - a.rating;
      }

      if (sortBy === 'Price: Low to High') return a.startingPrice - b.startingPrice;
      if (sortBy === 'Price: High to Low') return b.startingPrice - a.startingPrice;
      if (sortBy === 'Highest Rated') return b.rating - a.rating;

      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aBooked = userBookings.some(bk => bk.salonId === a.id) ? 1 : 0;
      const bBooked = userBookings.some(bk => bk.salonId === b.id) ? 1 : 0;
      if (aBooked !== bBooked) return bBooked - aBooked;

      const aScore = recScoresMap.get(a.id) || 0;
      const bScore = recScoresMap.get(b.id) || 0;
      if (aScore !== bScore) return bScore - aScore;

      return b.rating - a.rating;
    });
  }, [salons, selectedCategory, searchQuery, smartFilter, filterArea, filterAudience, quickFilterChip, sortBy, favorites, userBookings, recommendedSalons]);

  const nextBooking = useMemo(() => {
    return userBookings.find(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  }, [userBookings]);

  const firstName = customerName.trim().split(/\s+/)[0] || '';

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-40 pt-2">
      {/* Greeting */}
      {firstName && (
        <section className="flex flex-col gap-1">
          <h1 className="font-hero-heading-mobile text-hero-heading-mobile text-on-surface">
            Hello, {firstName}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Find your perfect beauty experience
          </p>
        </section>
      )}

      {/* Header Location & Search */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-medium text-outline">Location</span>
            <button
              onClick={() => setIsLocationSelectorOpen(true)}
              className="flex items-center gap-1.5 group text-left transition-colors cursor-pointer max-w-full"
              title="Tap to change or detect location"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-[17px] font-semibold text-on-surface group-hover:text-nexora-pink truncate leading-tight">
                  {(gpsState?.area || "Detecting...")}
                </span>
                {(gpsState?.area ? true : false) && gpsState?.city && gpsState?.area !== gpsState?.city && (
                  <span className="text-[12px] font-medium text-outline truncate leading-tight">
                    {gpsState?.city}
                  </span>
                )}
              </span>
              <span className={`material-symbols-outlined text-[18px] text-nexora-pink transition-transform shrink-0 ${isLocationLoading ? 'animate-spin' : 'group-hover:translate-y-0.5'}`}>
                {isLocationLoading ? 'progress_activity' : gpsState ? 'expand_more' : 'location_searching'}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full shadow-xs rounded-2xl overflow-hidden">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRecentSearch(searchQuery);
            }}
            onBlur={() => commitRecentSearch(searchQuery)}
            placeholder="Search salon, service, or area"
            className="w-full h-14 pl-12 pr-12 bg-white text-[16px] text-on-surface placeholder:text-outline-variant outline-none focus:bg-surface-container-low transition-colors rounded-2xl"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-outline hover:text-nexora-pink"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="absolute inset-y-0 right-2 flex items-center p-2 text-nexora-pink rounded-full hover:bg-primary-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">tune</span>
              {(sortBy !== 'Default' || filterArea !== 'All' || filterAudience !== 'All') && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
          )}
        </div>

        {/* Permanent Smart Search Filters */}
        <SmartSearchFilterBar
          activeFilter={smartFilter}
          userCity={gpsState?.city || ''}
          onSelectFilter={setSmartFilter}
        />
      </section>

      {/* Book Again — 1-tap rebooking for salons the user has visited before */}
      {bookAgainSalons.length > 0 && (
        <section className="-mx-5">
          <div className="flex items-center justify-between mb-component-gap px-5">
            <h2 className="font-section-heading text-section-heading text-on-surface">Book Again</h2>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-4 px-5 pb-2 snap-x">
            {bookAgainSalons.map(({ salon, lastBooking }) => (
              <div
                key={salon.id}
                className="min-w-[280px] snap-center bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-center justify-between shadow-xs"
              >
                <button
                  onClick={() => onSelectSalon(salon)}
                  className="flex items-center gap-3 text-left min-w-0 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                    <img src={salon.image} alt={salon.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-card-title text-body-md text-on-surface mb-0.5 truncate">
                      {lastBooking.services[0]?.name || 'Service'} at {salon.name}
                    </h3>
                    <p className="font-metadata text-metadata text-on-surface-variant truncate">
                      Last booked {lastBooking.dateStr}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => onSelectSalon(salon)}
                  className="px-3 py-1.5 bg-primary-container text-on-primary-container font-button-text text-[12px] rounded-lg hover:bg-nexora-pink hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Searches — session-only, real search terms the user has typed */}
      {recentSearches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-component-gap">
            <h2 className="font-section-heading text-section-heading text-on-surface">Recent Searches</h2>
            <button
              onClick={clearRecentSearches}
              className="font-button-text text-button-text text-nexora-pink cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="h-8 px-4 bg-surface-container rounded-full flex items-center gap-1 hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">history</span>
                <span className="font-metadata text-metadata">{term}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular Near You — real area coverage computed from listed salons */}
      {popularNearbyAreas.length > 0 && (
        <section>
          <h2 className="font-section-heading text-section-heading text-on-surface mb-component-gap">Popular Near You</h2>
          <div className="flex flex-wrap gap-2">
            {popularNearbyAreas.map((area) => (
              <button
                key={area}
                onClick={() => setFilterArea(filterArea === area ? 'All' : area)}
                className={`h-8 px-4 rounded-full flex items-center gap-1 transition-colors cursor-pointer ${
                  filterArea === area
                    ? 'bg-nexora-pink text-white'
                    : 'bg-primary-container text-on-primary-container hover:bg-nexora-pink hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span className="font-metadata text-metadata">{area}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Filter Chips — wired to the same filters used across the screen */}
      <section className="-mx-5">
        <div className="flex overflow-x-auto no-scrollbar gap-2 px-5">
          {QUICK_FILTER_CHIPS.filter((c) => c !== 'All').map((chip) => (
            <button
              key={chip}
              onClick={() => setQuickFilterChip(quickFilterChip === chip ? 'All' : chip)}
              className={`h-8 px-4 rounded-full flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                quickFilterChip === chip
                  ? 'bg-nexora-pink border border-nexora-pink text-white'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="font-metadata text-metadata">{chip}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Saved for Later — real favourites counts, links into the Favourites screen */}
      {(favorites.length > 0 || favoriteServicesCount > 0) && (
        <section className="flex flex-col gap-component-gap">
          <div className="flex items-center justify-between">
            <h2 className="font-section-heading text-section-heading text-on-surface">Saved for Later</h2>
            <button
              onClick={() => onNavigate('favourites')}
              className="font-button-text text-button-text text-nexora-pink text-[14px] cursor-pointer"
            >
              View Saved
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => onNavigate('favourites')}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-center gap-3 text-left cursor-pointer hover:bg-surface-container transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-nexora-pink">
                <span className="material-symbols-outlined text-[20px]">store</span>
              </div>
              <div>
                <h3 className="font-card-title text-[14px] text-on-surface leading-tight">{favorites.length} Saved</h3>
                <p className="font-metadata text-[11px] text-on-surface-variant">Salons</p>
              </div>
            </button>
            <button
              onClick={() => onNavigate('favourites')}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl p-3 flex items-center gap-3 text-left cursor-pointer hover:bg-surface-container transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-nexora-pink">
                <span className="material-symbols-outlined text-[20px]">spa</span>
              </div>
              <div>
                <h3 className="font-card-title text-[14px] text-on-surface leading-tight">{favoriteServicesCount} Saved</h3>
                <p className="font-metadata text-[11px] text-on-surface-variant">Services</p>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* GPS Nearby Salons Section (Calculates distances using Haversine & sorts nearest first) */}
      {gpsState && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-nexora-pink rounded-full" />
              <h2 className="text-[16px] font-bold text-on-surface">Nearby Salons</h2>
              <span className="text-[11px] font-bold text-outline bg-surface-container-low px-2 py-0.5 rounded-full">
                {nearbySalonsList.length} found
              </span>
            </div>

            {/* Radius Filters */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
              {([2, 5, 10, 'all'] as RadiusOption[]).map((r) => (
                <button
                  key={String(r)}
                  onClick={() => setNearbyRadius(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    nearbyRadius === r
                      ? 'bg-nexora-pink text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-nexora-pink'
                  }`}
                >
                  {r === 'all' ? 'All' : `Within ${r} km`}
                </button>
              ))}
            </div>
          </div>

          {/* Current GPS Accuracy Pill — never prints raw coordinates */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-low rounded-xl border border-primary-container text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="font-bold text-emerald-800 truncate">
                📍 {(gpsState?.area ? true : false) ? (gpsState?.area || gpsState?.city) : 'Near you'}
              </span>
            </div>
            <span className="text-outline shrink-0 ml-2">
              Sorted nearest first (Haversine)
            </span>
          </div>

          {/* Nearby Salon Cards */}
          {nearbySalonsList.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {nearbySalonsList.slice(0, 6).map((salon) => {
                const isFav = favorites.includes(salon.id);
                return (
                  <motion.div
                    key={salon.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col bg-white rounded-2xl shadow-xs border border-outline-variant overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div
                      className="relative w-full h-36 cursor-pointer overflow-hidden"
                      onClick={() => onSelectSalon(salon)}
                    >
                      <img
                        src={salon.image}
                        alt={salon.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Distance Badge */}
                      <div className="absolute top-3 left-3 bg-nexora-pink text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">near_me</span>
                        {salon.formattedDistance || `${salon.distanceKm} km`}
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(salon.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-outline hover:text-nexora-pink transition-colors"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isFav ? 'text-nexora-pink fill-current' : ''}`}>
                          favorite
                        </span>
                      </button>
                    </div>

                    <div className="p-3.5 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3
                            onClick={() => onSelectSalon(salon)}
                            className="text-[16px] font-bold text-on-surface cursor-pointer hover:text-nexora-pink transition-colors line-clamp-1"
                          >
                            {salon.name}
                          </h3>
                          <p className="text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px] text-nexora-pink">location_on</span>
                            {salon.area}
                          </p>
                        </div>

                        {salon.rating > 0 && (
                          <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                            <span className="text-[12px] font-bold text-on-surface">{salon.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
                        <span className="text-[12px] font-extrabold text-on-surface">
                          From ₹{salon.startingPrice}
                        </span>
                        <button
                          onClick={() => onSelectSalon(salon)}
                          className="px-4 py-1.5 bg-primary hover:bg-nexora-pink text-white text-[12px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-outline-variant">location_off</span>
              <p className="text-[13px] font-bold text-on-surface">No salons found within {nearbyRadius} km</p>
              <button
                onClick={() => setNearbyRadius('all')}
                className="mt-1 px-4 py-1.5 bg-nexora-pink text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Show All Salons
              </button>
            </div>
          )}
        </section>
      )}

      {/* Offline / Cached Appointment Dashboard Card */}
      <AnimatePresence>
        {nextBooking && !isAppointmentDismissed && (
          <motion.section 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3 px-1 pt-1">
              <h2 className="text-[15px] font-bold text-on-surface flex items-center gap-2">
                <span className="w-1 h-5 bg-nexora-pink rounded-full" />
                Upcoming Appointment
              </h2>
              <button 
                onClick={() => onNavigate('bookings')}
                className="text-[12px] font-bold text-nexora-pink hover:underline"
              >
                View All
              </button>
            </div>
            <OfflineDashboardCard 
              booking={nextBooking} 
              onClose={onDismissAppointment}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Category Grid / Carousel */}
      <section className="-mx-5 px-5 relative group/cat">
        {/* Left Scroll Button */}
        <button
          onClick={() => handleScrollCategory('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md border border-outline-variant shadow-md flex items-center justify-center text-nexora-pink hover:bg-nexora-pink hover:text-white transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/cat:opacity-100"
          aria-label="Scroll categories left"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        {/* Category List */}
        <div
          ref={categoryRef}
          className="flex overflow-x-auto gap-4 pt-3 pb-4 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (cat.id !== 'All') onExploreCategory?.(cat.id);
                }}
                className="flex flex-col items-center gap-2 min-w-[72px] snap-start group/btn transition-transform active:scale-95 shrink-0 cursor-pointer relative"
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm relative z-10 ${
                    isSelected
                      ? 'bg-nexora-pink text-white shadow-md shadow-nexora-pink/20 scale-105'
                      : 'bg-surface-container text-nexora-pink border border-outline-variant group-hover/btn:border-nexora-pink group-hover/btn:scale-105'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeCategoryCircle"
                      className="absolute inset-0 rounded-full border-2 border-nexora-pink z-20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="material-symbols-outlined text-[26px]">{cat.icon}</span>
                </div>
                <span
                  className={`text-[12px] font-medium transition-colors text-center line-clamp-1 max-w-[80px] relative z-10 ${
                    isSelected ? 'text-nexora-pink font-bold' : 'text-on-surface group-hover/btn:text-nexora-pink'
                  }`}
                >
                  {cat.label}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryDot"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-nexora-pink rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );

          })}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => handleScrollCategory('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md border border-outline-variant shadow-md flex items-center justify-center text-nexora-pink hover:bg-nexora-pink hover:text-white transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/cat:opacity-100"
          aria-label="Scroll categories right"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </section>

      {/* 1. ⭐ Top Rated Section */}
      <TopRatedSection
        salons={salons}
        userCity={gpsState?.city || ''}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSelectSalon={onSelectSalon}
      />

      {/* 2. 🏆 Top Salon by Nexora Section */}
      <NexoraLeaderboardSection
        salons={salons}
        userCity={gpsState?.city || ''}
        onSelectSalon={onSelectSalon}
      />

      {/* Frequent Services & Trending Treatments Section */}
      <section className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-[28px] border border-outline-variant shadow-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-container text-nexora-pink flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">
                  {topTab === 'frequent' ? 'history' : 'trending_up'}
                </span>
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-on-surface tracking-tight">
                  {topTab === 'frequent' ? 'Frequent Services' : 'Trending Treatments'}
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  {topTab === 'frequent'
                    ? 'Analyzed from your booking history for 1-click rebooking'
                    : 'Top rated treatments'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-surface-container-low text-nexora-pink border border-outline-variant shrink-0">
              {topTab === 'frequent' ? 'History Insights' : 'Top Rated'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex flex-1 bg-surface-container-low p-1 pr-1 pb-[7px] rounded-2xl gap-1">
              <button
                onClick={() => setTopTab('frequent')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  topTab === 'frequent'
                    ? 'bg-white text-nexora-pink shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">repeat</span>
                Frequent ({frequentServices.length})
              </button>
              <button
                onClick={() => setTopTab('trending')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:border-[var(--color-primary-pink)] focus:border-2 border-transparent transition-all duration-300 ${
                  topTab === 'trending'
                    ? 'bg-white text-nexora-pink shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                Trending ({trendingTreatments.length})
              </button>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleScrollCarousel('left')}
                title="Scroll left"
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-outline-variant text-on-surface flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => handleScrollCarousel('right')}
                title="Scroll right"
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-outline-variant text-on-surface flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Cards Carousel */}
        <AnimatePresence mode="wait">
          {topTab === 'frequent' ? (
            <motion.div
              ref={carouselRef}
              key="frequent-tab"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.04,
                  },
                },
                exit: { opacity: 0, x: -15, transition: { duration: 0.15 } },
              }}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex gap-3 overflow-x-auto pt-2 pb-1 scrollbar-none -mx-4 px-4 sm:-mx-5 sm:px-5 scroll-smooth snap-x snap-mandatory"
            >
              {frequentServices.length === 0 && (
                <div className="w-full shrink-0 flex flex-col items-center justify-center text-center py-8 px-6 gap-2">
                  <span className="material-symbols-outlined text-[28px] text-outline-variant">history</span>
                  <p className="text-[13px] font-semibold text-outline leading-5">
                    Your frequently booked services will appear here after your first appointment.
                  </p>
                </div>
              )}
              {frequentServices.map((item, idx) => {
                const matchedSalon = salons.find((s) => s.id === item.lastSalonId) || salons[0];
                return (
                  <motion.div
                    key={`${item.serviceName}-${idx}`}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.95 },
                      show: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', stiffness: 380, damping: 26 },
                      },
                    }}
                    whileHover={{ y: -4, scale: 1.025, boxShadow: '0 10px 20px -5px rgba(230, 0, 126, 0.12)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => matchedSalon && onSelectSalon(matchedSalon)}
                    className="min-w-[230px] max-w-[240px] bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant flex flex-col justify-between hover:border-outline-variant transition-colors cursor-pointer group shrink-0 select-none snap-start"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase bg-primary-container text-nexora-pink px-2 py-0.5 rounded-full border border-outline-variant">
                          Booked {item.count}x
                        </span>
                        <span className="text-[10px] text-outline font-medium flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {item.durationMinutes} mins
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-on-surface group-hover:text-nexora-pink transition-colors leading-tight mt-1">
                        {item.serviceName}
                      </h3>

                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-nexora-pink">store</span>
                        {item.lastSalonName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-outline-variant">
                      <div>
                        <span className="text-[9px] text-outline block">Avg Price</span>
                        <span className="text-xs font-extrabold text-on-surface">₹{item.avgPrice}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (matchedSalon) onSelectSalon(matchedSalon);
                        }}
                        className="px-3 py-1.5 bg-nexora-pink hover:bg-primary text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">refresh</span>
                        Rebook
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              ref={carouselRef}
              key="trending-tab"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.04,
                  },
                },
                exit: { opacity: 0, x: -15, transition: { duration: 0.15 } },
              }}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex gap-3 overflow-x-auto pt-2 pb-1 scrollbar-none -mx-4 px-4 sm:-mx-5 sm:px-5 scroll-smooth snap-x snap-mandatory"
            >
              {trendingTreatments.length === 0 && (
                <div className="w-full shrink-0 flex flex-col items-center justify-center text-center py-8 px-6 gap-2">
                  <span className="material-symbols-outlined text-[28px] text-outline-variant">trending_up</span>
                  <p className="text-[13px] font-semibold text-outline leading-5">
                    Trending services will appear here once salons gather customer ratings.
                  </p>
                </div>
              )}
              {trendingTreatments.map((item, idx) => (
                <motion.div
                  key={`${item.serviceName}-${idx}`}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.95 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { type: 'spring', stiffness: 380, damping: 26 },
                    },
                  }}
                  whileHover={{ y: -4, scale: 1.025, boxShadow: '0 10px 20px -5px rgba(230, 0, 126, 0.12)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectSalon(item.salon)}
                  className="min-w-[230px] max-w-[240px] bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant flex flex-col justify-between hover:border-outline-variant transition-colors cursor-pointer group shrink-0 select-none snap-start"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        ⭐ {item.rating.toFixed(1)} Rated
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-on-surface group-hover:text-nexora-pink transition-colors leading-tight mt-1">
                      {item.serviceName}
                    </h3>

                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[13px] text-nexora-pink shrink-0">location_on</span>
                      <span className="truncate">{item.salon.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-outline-variant">
                    <div>
                      <span className="text-[9px] text-outline block">Starts at</span>
                      <span className="text-xs font-extrabold text-on-surface">₹{item.price}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSalon(item.salon);
                      }}
                      className="px-3.5 py-1.5 bg-on-surface hover:bg-nexora-pink text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      Explore
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Special Offers Glassmorphic Banner */}
      <section className="relative w-full rounded-[24px] overflow-hidden shadow-md group cursor-pointer" onClick={() => onNavigate('search')}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/90 z-10 mix-blend-multiply transition-opacity group-hover:opacity-90" />
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url('${BANNER_URL}')` }}
        />
        <div className="relative z-20 p-6 flex flex-col items-start gap-3 h-[180px] justify-between bg-black/10">
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 inline-flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-white">local_fire_department</span>
            <span className="text-[12px] text-white font-semibold tracking-wider uppercase">Flash Sale</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-[24px] text-white font-bold leading-tight drop-shadow-sm">
              Flat 30% Off
            </h3>
            <p className="text-[15px] text-white/90 font-medium">On premium facials today</p>
          </div>
        </div>
      </section>

      {/* Recommended For You Section */}
      <section className="flex flex-col gap-3.5 bg-gradient-to-b from-surface-container-low to-white p-4 sm:p-5 rounded-[28px] border border-outline-variant shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-nexora-pink text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div>
                <h2 className="text-[18px] font-extrabold text-on-surface tracking-tight">Recommended For You</h2>
                <p className="text-[11px] text-on-surface-variant">
                  Tailored based on your preferred services & ratings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary-container text-nexora-pink border border-outline-variant hidden sm:inline-block">
                Smart Pick
              </span>

              <button
                onClick={() => handleScrollRecCarousel('left')}
                title="Scroll left"
                className="w-7 h-7 rounded-full bg-white hover:bg-primary-container border border-outline-variant text-on-surface flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                onClick={() => handleScrollRecCarousel('right')}
                title="Scroll right"
                className="w-7 h-7 rounded-full bg-white hover:bg-primary-container border border-outline-variant text-on-surface flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <button
              onClick={() => setRecommendationFilter('all')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'all'
                  ? 'bg-on-surface text-white shadow-xs'
                  : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              ✨ Best Match
            </button>
            <button
              onClick={() => setRecommendationFilter('category')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'category'
                  ? 'bg-nexora-pink text-white shadow-xs'
                  : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              💇 Hair & Care
            </button>
            <button
              onClick={() => setRecommendationFilter('top')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'top'
                  ? 'bg-nexora-pink text-white shadow-xs'
                  : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              ⭐ Top Rated (4.8+)
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            ref={recCarouselRef}
            key={recommendationFilter}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.04,
                },
              },
              exit: { opacity: 0, x: -15, transition: { duration: 0.15 } },
            }}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex gap-4 overflow-x-auto pt-2 pb-2 scrollbar-none -mx-4 px-4 sm:-mx-5 sm:px-5 scroll-smooth snap-x snap-mandatory"
          >
            {recommendedSalons.slice(0, 5).map(({ salon, matchPercentage, primaryReason, secondaryReason }) => {
              const isFav = favorites.includes(salon.id);
              return (
                <motion.div
                  key={salon.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.95 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { type: 'spring', stiffness: 380, damping: 26 },
                    },
                  }}
                  whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 24px -6px rgba(230, 0, 126, 0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectSalon(salon)}
                  className="min-w-[280px] max-w-[290px] bg-white rounded-2xl border border-outline-variant overflow-hidden hover:border-outline-variant transition-colors cursor-pointer group flex flex-col justify-between shrink-0 select-none snap-start"
                >
                  <div>
                    <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                      <img
                        src={salon.image}
                        alt={salon.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      <div className="absolute top-3 left-3 bg-nexora-pink text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        {matchPercentage}% Match
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(salon.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-outline hover:text-nexora-pink transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isFav ? 'text-nexora-pink fill-current' : ''}`}>
                          favorite
                        </span>
                      </button>

                      <div className="absolute bottom-2 left-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-medium truncate flex items-center gap-1">
                        <span>{primaryReason}</span>
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h3 className="text-sm font-bold text-on-surface truncate max-w-[190px] group-hover:text-nexora-pink transition-colors">
                            {salon.name}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px] text-nexora-pink">store</span>
                            {salon.area || salon.city || 'Salon'}
                          </p>
                        </div>

                        {salon.rating > 0 ? (
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                            <span className="material-symbols-outlined text-[13px] text-amber-500">star</span>
                            <span className="text-[11px] font-extrabold text-on-surface">{salon.rating}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                            <span className="text-[11px] font-extrabold text-emerald-600">New</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-outline line-clamp-1 italic">
                        "{secondaryReason}"
                      </p>

                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {salon.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] font-bold bg-surface-container-low text-nexora-pink px-2 py-0.5 rounded-full border border-outline-variant">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between border-t border-outline-variant mt-1">
                    <div>
                      <span className="text-[9px] text-outline block">Starts at</span>
                      <span className="text-xs font-extrabold text-on-surface">₹{salon.startingPrice}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSalon(salon);
                      }}
                      className="px-4 py-1.5 bg-nexora-pink hover:bg-primary text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      View Salon
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Curated For You */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-section-heading text-section-heading text-on-surface tracking-tight">Curated For You</h2>
          <button
            onClick={() => onNavigate('search')}
            className="text-[13px] text-nexora-pink font-semibold hover:text-primary transition-colors"
          >
            See All
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {isLoading || salonsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SalonCardSkeleton key={i} />)
          ) : (
            <AnimatePresence>
              {filteredSalons.length > 0 ? (
                filteredSalons.map((salon) => {
                  const isFav = favorites.includes(salon.id);
                  return (
                    <motion.div
                      key={salon.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 group"
                    >
                      {/* Salon Image Header */}
                      <div
                        className="relative w-full h-[200px] cursor-pointer overflow-hidden"
                        onClick={() => onSelectSalon(salon)}
                      >
                        <img
                          src={salon.image}
                          alt={salon.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-4 left-4 flex gap-2">
                          {salon.verified && (
                            <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                              <span className="material-symbols-outlined text-[14px] text-[#0353db]">verified</span>
                              <span className="text-[12px] text-on-surface font-semibold">Verified</span>
                            </div>
                          )}
                          {salon.isNew && (
                            <div className="bg-nexora-pink/90 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                              <span className="text-[12px] text-white font-semibold">New</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(salon.id);
                          }}
                          className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-outline shadow-sm hover:text-nexora-pink active:scale-90 transition-all cursor-pointer"
                          aria-label="Toggle favorite"
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isFav ? 'text-nexora-pink fill-current' : ''
                            }`}
                          >
                            favorite
                          </span>
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3
                              onClick={() => onSelectSalon(salon)}
                              className="text-[18px] text-on-surface font-semibold line-clamp-1 cursor-pointer hover:text-nexora-pink transition-colors"
                            >
                              {salon.name}
                            </h3>
                            <p className="text-[14px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[16px] text-nexora-pink">location_on</span>
                              <span className="truncate">
                                {salon.area || salon.city || 'Salon'}
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            {salon.rating > 0 ? (
                              <>
                                <div className="flex items-center gap-1 bg-surface-container py-1 px-2 rounded-lg">
                                  <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                                  <span className="text-[13px] text-on-surface font-bold">{salon.rating}</span>
                                </div>
                                <span className="text-[11px] text-outline mt-0.5">({salon.reviewCount ?? salon.reviewsCount}+ reviews)</span>
                              </>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 mt-0.5">New on Nexora</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {salon.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-surface-container-highest text-on-surface text-[12px] font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-surface-container-high w-full">
                          <div className="flex flex-col">
                            <span className="text-[12px] text-outline font-bold">Services from</span>
                            <span className="text-[18px] font-bold text-on-surface">₹{salon.startingPrice}</span>
                          </div>
                          <button
                            onClick={() => onSelectSalon(salon)}
                            className="h-10 px-6 bg-primary text-white text-[13px] font-semibold rounded-xl hover:bg-nexora-pink active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12 bg-white rounded-[28px] p-6 border border-outline-variant shadow-xs col-span-full"
                >
                  <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-[32px] text-nexora-pink">search_off</span>
                  </div>
                  <h3 className="font-bold text-on-surface text-lg">
                    {selectedCategory !== 'All' 
                      ? 'No shops available in this category.'
                      : 'No shops available'}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1 max-w-[280px] mx-auto">
                    {selectedCategory !== 'All' 
                      ? `There are no businesses listed under "${selectedCategory}" right now.`
                      : 'No salons found matching your criteria.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setSmartFilter('all');
                      setSortBy('Default');
                      setFilterArea('All');
                      setFilterAudience('All');
                    }}
                    className="mt-6 px-6 py-2.5 bg-nexora-pink text-white rounded-xl text-sm font-bold cursor-pointer active:scale-95 transition-all shadow-md shadow-nexora-pink/20"
                  >
                    Reset Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* Location Selection Modal — 100+ Jaipur localities */}
      <LocationSelectionModal
        isOpen={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        currentArea={gpsState?.area}
        onDetectGPS={() => {
          gpsForceRefresh();
        }}
        isDetectingGPS={isLocationLoading}
        onSelectLocality={(name, coords) => {
          gpsSetManual(name, "", "");
          setIsLocationSelectorOpen(false);
        }}
      />

      {/* Smart Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          >
            <div className="absolute inset-0 bg-transparent" onClick={() => setIsFilterModalOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl flex flex-col relative max-h-[85vh] overflow-hidden pb-safe"
            >
              <div className="flex items-center justify-between p-4 border-b border-outline-subtle">
                <h3 className="font-section-heading text-section-heading text-on-surface">Smart Search Filters</h3>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-off-white flex items-center justify-center text-outline hover:text-nexora-pink hover:bg-primary-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-5">
                {/* Area Filter */}
                <div>
                  <h4 className="text-[14px] font-bold text-on-surface mb-3">Popular Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {popularAreas.map(area => (
                      <button
                        key={area}
                        onClick={() => setFilterArea(area)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                          filterArea === area
                            ? 'bg-nexora-pink text-white shadow-md'
                            : 'bg-surface-off-white text-on-surface-variant border border-outline-subtle hover:border-nexora-pink/30'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience / Gender */}
                <div>
                  <h4 className="text-[14px] font-bold text-on-surface mb-3">Target Audience</h4>
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map(audience => (
                      <button
                        key={audience}
                        onClick={() => setFilterAudience(audience)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                          filterAudience === audience
                            ? 'bg-nexora-pink text-white shadow-md'
                            : 'bg-surface-off-white text-on-surface-variant border border-outline-subtle hover:border-nexora-pink/30'
                        }`}
                      >
                        {audience}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Filter */}
                <div>
                  <h4 className="text-[14px] font-bold text-on-surface mb-3">Sort By</h4>
                  <div className="flex flex-col gap-2">
                    {sortOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold transition-all cursor-pointer text-left flex justify-between items-center ${
                          sortBy === option
                            ? 'bg-surface-container-low border border-nexora-pink text-nexora-pink'
                            : 'bg-surface-off-white text-on-surface-variant border border-outline-subtle hover:border-nexora-pink/30'
                        }`}
                      >
                        {option}
                        {sortBy === option && <span className="material-symbols-outlined text-[18px]">check</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-outline-subtle flex gap-3 bg-white">
                <button
                  onClick={() => {
                    setSortBy('Default');
                    setFilterArea('All');
                    setFilterAudience('All');
                  }}
                  className="flex-1 py-3 bg-surface-off-white text-on-surface-variant font-bold rounded-xl border border-outline-subtle hover:bg-primary-container hover:text-nexora-pink transition-colors cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 py-3 bg-nexora-pink text-white font-bold rounded-xl shadow-md hover:bg-primary transition-colors cursor-pointer"
                >
                  Show Results ({filteredSalons.length})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
