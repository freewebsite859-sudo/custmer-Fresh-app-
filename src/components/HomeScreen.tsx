import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Salon, Screen, UserLocation, Booking } from '../types';
import { BANNER_URL } from '../data/mockData';
import { SalonCardSkeleton } from './Skeleton';
import { OfflineDashboardCard } from './OfflineDashboardCard';
import { SmartSearchFilterBar } from './SmartSearchFilterBar';
import { TopRatedSection } from './TopRatedSection';
import { NexoraLeaderboardSection } from './NexoraLeaderboardSection';

interface HomeScreenProps {
  location: UserLocation;
  salons: Salon[];
  salonsLoading?: boolean;
  favorites: string[];
  recentlyViewed?: string[];
  bookings?: Booking[];
  onToggleFavorite: (salonId: string) => void;
  onSelectSalon: (salon: Salon) => void;
  onNavigate: (screen: Screen) => void;
  onOpenLocationSelector: () => void;
  isAppointmentDismissed?: boolean;
  onDismissAppointment?: () => void;
}

const CATEGORY_MAPPING: Record<string, string[]> = {
  'Hair': ['Hair Salon', 'Hair Stylist', 'Hair Spa', 'Hair Color', 'Hair Cutting'],
  'Skin': ['Facial Clinic', 'Skincare Studio', 'Dermatology', 'Facial Spa'],
  'Nails': ['Nail Salon', 'Nail Art', 'Manicure', 'Pedicure'],
  'Spa': ['Luxury Spa', 'Wellness Spa', 'Steam', 'Sauna', 'Relaxation Center'],
  'Makeup': ['Bridal Makeup', 'Party Makeup', 'Professional Makeup Artist'],
  'Barber Shop': ["Men's Haircut", 'Beard Styling', 'Shaving', 'Grooming'],
  'Beauty': ['Beauty Parlour', 'Beauty Salon', 'Threading', 'Waxing', 'Eyebrows', 'Bleach'],
  'Massage & Wellness': ['Body Massage', 'Deep Tissue Massage', 'Thai Massage', 'Ayurvedic Massage', 'Wellness Center'],
  'Tattoo & Piercing': ['Tattoo Studio', 'Tattoo Artist', 'Piercing Studio', 'Body Art']
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  location,
  salons,
  salonsLoading = false,
  favorites,
  recentlyViewed = [],
  bookings,
  onToggleFavorite,
  onSelectSalon,
  onNavigate,
  onOpenLocationSelector,
  isAppointmentDismissed,
  onDismissAppointment,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [smartFilter, setSmartFilter] = useState<'all' | 'top-rated-city' | 'top-nexora'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | 'near' | 'category' | 'top'>('all');
  const [topTab, setTopTab] = useState<'frequent' | 'trending'>('frequent');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterRadius, setFilterRadius] = useState<number>(30); // Default to max
  const [sortBy, setSortBy] = useState<string>('Default');
  const [filterArea, setFilterArea] = useState<string>('All');
  const [filterAudience, setFilterAudience] = useState<string>('All');
  
  const popularAreas = ['All', 'Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Raja Park', 'Mansarovar'];
  const radiusOptions = [2, 5, 10, 15, 20, 25, 30];
  const sortOptions = ['Default', 'Price: Low to High', 'Price: High to Low', 'Highest Rated'];
  const audienceOptions = ['All', 'Unisex', 'Male / Men', 'Female / Women', 'Kids / Children'];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
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

  // Load user bookings from prop to determine past service preferences
  const userBookings: Booking[] = useMemo(() => {
    return bookings || [];
  }, [bookings]);

  // Analysis Logic Block 1: Frequent Services from User Booking History
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

    const sorted = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);

    return sorted;
  }, [userBookings, salons]);

  // Analysis Logic Block 2: Trending Treatments across local salons
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
    // Return sorted categories by frequency
    return Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
  }, [userBookings]);

  // Recommendation Heuristic Engine
  const recommendedSalons = useMemo(() => {
    const userAreaLower = location.area.toLowerCase();
    const userCityLower = location.city.toLowerCase();

    const scored = salons.map((salon) => {
      let score = 50; // base score
      const reasons: string[] = [];

      // 1. Location match heuristic
      const areaMatch = salon.area.toLowerCase().includes(userAreaLower) || userAreaLower.includes(salon.area.toLowerCase());
      const cityMatch = salon.city.toLowerCase().includes(userCityLower) || userCityLower.includes(salon.city.toLowerCase());

      if (areaMatch) {
        score += 35;
        reasons.push(`📍 Near ${salon.area}`);
      } else if (cityMatch) {
        score += 20;
        reasons.push(`📍 In ${salon.city}`);
      }

      if (salon.distanceKm > 0 && salon.distanceKm <= 1.5) {
        score += 25;
        if (!reasons.some((r) => r.startsWith('📍'))) {
          reasons.push(`📍 Only ${salon.distanceKm} km away`);
        }
      } else if (salon.distanceKm > 0 && salon.distanceKm <= 3.0) {
        score += 15;
      }

      // 2. Past Service Category Heuristic
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

      // Fallback service tags match
      if (!hasCategoryMatch && salon.tags.length > 0) {
        reasons.push(`✨ Popular for ${salon.tags[0]}`);
      }

      // 2.5 Frequently Viewed Heuristic
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

      // Clamp percentage match between 86% and 99%
      const matchPercentage = Math.min(99, Math.max(86, Math.round((score / 150) * 100)));

      return {
        salon,
        score,
        matchPercentage,
        primaryReason: reasons[0] || `📍 ${salon.area}`,
        secondaryReason: reasons[1] || (salon.reviewCount > 0 ? `⭐ ${salon.rating}★ (${salon.reviewCount}+ reviews)` : '✨ New on Nexora'),
        isLocationMatch: areaMatch || (salon.distanceKm > 0 && salon.distanceKm <= 2.0),
        isCategoryMatch: hasCategoryMatch,
        isTopRated: salon.rating >= 4.8,
      };
    });

    // Sort by match score descending
    scored.sort((a, b) => b.score - a.score);

    // Apply secondary user filter if selected
    if (recommendationFilter === 'near') {
      return scored.filter((item) => item.isLocationMatch);
    }
    if (recommendationFilter === 'category') {
      return scored.filter((item) => item.isCategoryMatch || item.salon.tags.length > 0);
    }
    if (recommendationFilter === 'top') {
      return scored.filter((item) => item.isTopRated);
    }

    return scored;
  }, [salons, location, preferredCategories, recommendationFilter, recentlyViewed]);

  const categories = [
    { id: 'All', label: 'All', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=200&q=80' },
    { id: 'Hair', label: 'Hair', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=200&q=80' },
    { id: 'Skin', label: 'Skin', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=200&q=80' },
    { id: 'Nails', label: 'Nails', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=200&q=80' },
    { id: 'Spa', label: 'Spa', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=200&q=80' },
    { id: 'Makeup', label: 'Makeup', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80' },
    { id: 'Barber Shop', label: 'Barber Shop', image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=200&q=80' },
    { id: 'Beauty', label: 'Beauty', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80' },
    { id: 'Massage & Wellness', label: 'Massage & Wellness', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=200&q=80' },
    { id: 'Tattoo & Piercing', label: 'Tattoo & Piercing', image: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=200&q=80' },
  ];

  const filteredSalons = useMemo(() => {
    // Create a map of recommendation scores for quick lookup during sorting
    const recScoresMap = new Map<string, number>();
    recommendedSalons.forEach(item => {
      recScoresMap.set(item.salon.id, item.score);
    });

    return salons.filter((salon) => {
      // 1. Category Filtering Logic
      const matchesCategory =
        selectedCategory === 'All' ||
        (() => {
          // Get keywords for the selected category from mapping
          const keywords = CATEGORY_MAPPING[selectedCategory] || [selectedCategory];
          return keywords.some((keyword) => {
            const k = keyword.toLowerCase();
            return (
              (salon.type && salon.type.toLowerCase().includes(k)) ||
              (salon.category && salon.category.toLowerCase().includes(k)) ||
              (salon.tags && salon.tags.some(t => t.toLowerCase().includes(k))) ||
              (salon.services && salon.services.some(s => s.category.toLowerCase().includes(k))) ||
              (salon.name && salon.name.toLowerCase().includes(k))
            );
          });
        })();

      // 2. Global Search Logic
      const matchesSearch =
        searchQuery.trim() === '' ||
        (salon.name && salon.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (salon.area && salon.area.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (salon.tags && salon.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      // 3. Location Radius Logic
      const matchesRadius = salon.distanceKm <= filterRadius;

      // 4. Specific Area Filter
      const matchesArea = filterArea === 'All' || 
        salon.area.toLowerCase().includes(filterArea.toLowerCase()) || 
        filterArea.toLowerCase().includes(salon.area.toLowerCase());

      // 5. Target Audience Filter
      const matchesAudience = filterAudience === 'All' || (() => {
        if (filterAudience === 'Unisex') return salon.genderCategory === 'Unisex';
        if (filterAudience === 'Male / Men') return salon.genderCategory === 'Men Only' || salon.genderCategory === 'Unisex';
        if (filterAudience === 'Female / Women') return salon.genderCategory === 'Women Only' || salon.genderCategory === 'Unisex';
        if (filterAudience === 'Kids / Children') return salon.tags.some(t => t.toLowerCase().includes('kid') || t.toLowerCase().includes('child'));
        return true;
      })();

      return matchesCategory && matchesSearch && matchesRadius && matchesArea && matchesAudience;
    }).sort((a, b) => {
      // Smart Filter Priority Overrides
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

      // Priority 0: Manual Sort Overrides (If user explicitly chooses a sort method)
      if (sortBy === 'Price: Low to High') return a.startingPrice - b.startingPrice;
      if (sortBy === 'Price: High to Low') return b.startingPrice - a.startingPrice;
      if (sortBy === 'Highest Rated') return b.rating - a.rating;

      // Priority 1: Favorites
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      // Priority 2: Previously Visited / Booked Services
      const aBooked = userBookings.some(bk => bk.salonId === a.id) ? 1 : 0;
      const bBooked = userBookings.some(bk => bk.salonId === b.id) ? 1 : 0;
      if (aBooked !== bBooked) return bBooked - aBooked;

      // Priority 3: Recommended Score (from recommendation engine)
      const aScore = recScoresMap.get(a.id) || 0;
      const bScore = recScoresMap.get(b.id) || 0;
      if (aScore !== bScore) return bScore - aScore;

      // Priority 4: Default fallback (Rating and then Distance)
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });
  }, [salons, selectedCategory, searchQuery, smartFilter, filterRadius, filterArea, filterAudience, sortBy, favorites, userBookings, recommendedSalons]);

  const nextBooking = useMemo(() => {
    return userBookings.find(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  }, [userBookings]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-40 pt-2">
      {/* Header Location & Search */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#8c7077]">Current Location</span>
            <button
              onClick={onOpenLocationSelector}
              className="flex items-center gap-1.5 group text-left transition-colors cursor-pointer"
            >
              <span className="text-[17px] font-semibold text-[#26181c] group-hover:text-[#e6007e]">
                {location.area}
              </span>
              <span className="material-symbols-outlined text-[18px] text-[#e6007e] transition-transform group-hover:translate-y-0.5">
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full shadow-xs rounded-2xl overflow-hidden">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#8c7077]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search salon, service, or area"
            className="w-full h-14 pl-12 pr-12 bg-white text-[16px] text-[#26181c] placeholder:text-[#e0bec6] outline-none focus:bg-[#fff0f2] transition-colors rounded-2xl"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-[#8c7077] hover:text-[#e6007e]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="absolute inset-y-0 right-2 flex items-center p-2 text-[#e6007e] rounded-full hover:bg-[#fde7f3] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">tune</span>
              {(filterRadius < 30 || sortBy !== 'Default' || filterArea !== 'All' || filterAudience !== 'All') && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
              )}
            </button>
          )}
        </div>

        {/* Permanent Smart Search Filters */}
        <SmartSearchFilterBar
          activeFilter={smartFilter}
          userCity={location.city || 'Jaipur'}
          onSelectFilter={setSmartFilter}
        />
      </section>

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
              <h2 className="text-[15px] font-bold text-[#26181c] flex items-center gap-2">
                <span className="w-1 h-5 bg-[#e6007e] rounded-full" />
                Upcoming Appointment
              </h2>
              <button 
                onClick={() => onNavigate('bookings')}
                className="text-[12px] font-bold text-[#e6007e] hover:underline"
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
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md border border-[#f0d8e2] shadow-md flex items-center justify-center text-[#e6007e] hover:bg-[#e6007e] hover:text-white transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/cat:opacity-100"
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
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-2 min-w-[72px] snap-start group/btn transition-transform active:scale-95 shrink-0 cursor-pointer relative"
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden p-0.5 transition-all shadow-sm relative z-10 ${
                    isSelected
                      ? 'shadow-md shadow-[#e6007e]/20 scale-105'
                      : 'border border-[#f0d8e2] group-hover/btn:border-[#e6007e] group-hover/btn:scale-105'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeCategoryCircle"
                      className="absolute inset-0 rounded-full border-2 border-[#e6007e] z-20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <img
                    src={cat.image}
                    alt={cat.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover/btn:scale-110"
                  />
                </div>
                <span
                  className={`text-[12px] font-medium transition-colors text-center line-clamp-1 max-w-[80px] relative z-10 ${
                    isSelected ? 'text-[#e6007e] font-bold' : 'text-[#26181c] group-hover/btn:text-[#e6007e]'
                  }`}
                >
                  {cat.label}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryDot"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-[#e6007e] rounded-full"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md border border-[#f0d8e2] shadow-md flex items-center justify-center text-[#e6007e] hover:bg-[#e6007e] hover:text-white transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/cat:opacity-100"
          aria-label="Scroll categories right"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </section>

      {/* 1. ⭐ Top Rated in [City] Section */}
      <TopRatedSection
        salons={salons}
        userCity={location.city || 'Jaipur'}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSelectSalon={onSelectSalon}
      />

      {/* 2. 🏆 Top Salon by Nexora Section */}
      <NexoraLeaderboardSection
        salons={salons}
        userCity={location.city || 'Jaipur'}
        onSelectSalon={onSelectSalon}
      />

      {/* Frequent Services & Trending Treatments Section (Booking History Analysis) */}
      <section className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-[28px] border border-[#f0d8e2] shadow-xs">
        {/* Section Header & Tab Switcher */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fde7f3] text-[#e6007e] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">
                  {topTab === 'frequent' ? 'history' : 'trending_up'}
                </span>
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#26181c] tracking-tight">
                  {topTab === 'frequent' ? 'Frequent Services' : 'Trending Treatments'}
                </h2>
                <p className="text-[11px] text-[#5a3f47]">
                  {topTab === 'frequent'
                    ? 'Analyzed from your booking history for 1-click rebooking'
                    : 'Top rated treatments near you'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#fff0f3] text-[#e6007e] border border-[#fcd5e8] shrink-0">
              {topTab === 'frequent' ? 'History Insights' : 'Top Rated'}
            </span>
          </div>

          {/* Switcher Pills & Scroll Controls */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex flex-1 bg-[#f8eff3] p-1 pr-1 pb-[7px] rounded-2xl gap-1">
              <button
                onClick={() => setTopTab('frequent')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  topTab === 'frequent'
                    ? 'bg-white text-[#e6007e] shadow-xs'
                    : 'text-[#5a3f47] hover:text-[#26181c]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">repeat</span>
                Frequent ({frequentServices.length})
              </button>
              <button
                onClick={() => setTopTab('trending')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:border-[var(--color-primary-pink)] focus:border-2 border-transparent transition-all duration-300 ${
                  topTab === 'trending'
                    ? 'bg-white text-[#e6007e] shadow-xs'
                    : 'text-[#5a3f47] hover:text-[#26181c]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                Trending ({trendingTreatments.length})
              </button>
            </div>

            {/* Quick Scroll Navigation Arrows */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleScrollCarousel('left')}
                title="Scroll left"
                className="w-8 h-8 rounded-full bg-[#f8eff3] hover:bg-[#f3dbe6] text-[#26181c] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => handleScrollCarousel('right')}
                title="Scroll right"
                className="w-8 h-8 rounded-full bg-[#f8eff3] hover:bg-[#f3dbe6] text-[#26181c] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Cards Carousel with Motion Animation & Staggered Entrance */}
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
                  <span className="material-symbols-outlined text-[28px] text-[#e0bec6]">history</span>
                  <p className="text-[13px] font-semibold text-[#8c7077] leading-5">
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
                    className="min-w-[230px] max-w-[240px] bg-[#fff8f9] rounded-2xl p-3.5 border border-[#f5d0e0] flex flex-col justify-between hover:border-[#f0a8c8] transition-colors cursor-pointer group shrink-0 select-none snap-start"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase bg-[#fde7f3] text-[#e6007e] px-2 py-0.5 rounded-full border border-[#f3c2dc]">
                          Booked {item.count}x
                        </span>
                        <span className="text-[10px] text-[#8c7077] font-medium flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {item.durationMinutes} mins
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#26181c] group-hover:text-[#e6007e] transition-colors leading-tight mt-1">
                        {item.serviceName}
                      </h3>

                      <p className="text-[11px] text-[#5a3f47] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-[#e6007e]">store</span>
                        {item.lastSalonName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f0d8e2]">
                      <div>
                        <span className="text-[9px] text-[#8c7077] block">Avg Price</span>
                        <span className="text-xs font-extrabold text-[#26181c]">₹{item.avgPrice}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (matchedSalon) onSelectSalon(matchedSalon);
                        }}
                        className="px-3 py-1.5 bg-[#e6007e] hover:bg-[#c9006e] text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
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
                  <span className="material-symbols-outlined text-[28px] text-[#e0bec6]">trending_up</span>
                  <p className="text-[13px] font-semibold text-[#8c7077] leading-5">
                    Trending services will appear here once salons near you gather customer ratings.
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
                  className="min-w-[230px] max-w-[240px] bg-[#fff8f9] rounded-2xl p-3.5 border border-[#f5d0e0] flex flex-col justify-between hover:border-[#f0a8c8] transition-colors cursor-pointer group shrink-0 select-none snap-start"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        ⭐ {item.rating.toFixed(1)} Rated
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#26181c] group-hover:text-[#e6007e] transition-colors leading-tight mt-1">
                      {item.serviceName}
                    </h3>

                    <p className="text-[11px] text-[#5a3f47] flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[13px] text-[#e6007e] shrink-0">location_on</span>
                      <span className="truncate">{item.salon.name}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f0d8e2]">
                    <div>
                      <span className="text-[9px] text-[#8c7077] block">Starts at</span>
                      <span className="text-xs font-extrabold text-[#26181c]">₹{item.price}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSalon(item.salon);
                      }}
                      className="px-3.5 py-1.5 bg-[#26181c] hover:bg-[#e6007e] text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#8e004b]/90 to-[#b80663]/90 z-10 mix-blend-multiply transition-opacity group-hover:opacity-90" />
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

      {/* Recommended For You Section (Heuristic AI Personalization) */}
      <section className="flex flex-col gap-3.5 bg-gradient-to-b from-[#fff2f6] to-white p-4 sm:p-5 rounded-[28px] border border-[#f8d3e2] shadow-xs">
        {/* Section Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#e6007e] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div>
                <h2 className="text-[18px] font-extrabold text-[#26181c] tracking-tight">Recommended For You</h2>
                <p className="text-[11px] text-[#5a3f47]">
                  Tailored based on <strong className="text-[#e6007e]">{location.area}</strong> proximity & service history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#fde7f3] text-[#e6007e] border border-[#f3c2dc] hidden sm:inline-block">
                Smart Pick
              </span>

              {/* Scroll Controls */}
              <button
                onClick={() => handleScrollRecCarousel('left')}
                title="Scroll left"
                className="w-7 h-7 rounded-full bg-white hover:bg-[#fde7f3] border border-[#f3c2dc] text-[#26181c] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                onClick={() => handleScrollRecCarousel('right')}
                title="Scroll right"
                className="w-7 h-7 rounded-full bg-white hover:bg-[#fde7f3] border border-[#f3c2dc] text-[#26181c] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Heuristic Filter Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <button
              onClick={() => setRecommendationFilter('all')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'all'
                  ? 'bg-[#26181c] text-white shadow-xs'
                  : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
              }`}
            >
              ✨ Best Match
            </button>
            <button
              onClick={() => setRecommendationFilter('near')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'near'
                  ? 'bg-[#e6007e] text-white shadow-xs'
                  : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
              }`}
            >
              📍 Nearby ({location.area.split(',')[0]})
            </button>
            <button
              onClick={() => setRecommendationFilter('category')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'category'
                  ? 'bg-[#e6007e] text-white shadow-xs'
                  : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
              }`}
            >
              💇 Hair & Care
            </button>
            <button
              onClick={() => setRecommendationFilter('top')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                recommendationFilter === 'top'
                  ? 'bg-[#e6007e] text-white shadow-xs'
                  : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
              }`}
            >
              ⭐ Top Rated (4.8+)
            </button>
          </div>
        </div>

        {/* Recommended Salons Horizontal Scrollable Deck with Motion */}
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
                  className="min-w-[280px] max-w-[290px] bg-white rounded-2xl border border-[#f0d8e2] overflow-hidden hover:border-[#f0a8c8] transition-colors cursor-pointer group flex flex-col justify-between shrink-0 select-none snap-start"
                >
                  <div>
                    {/* Image & Match Badge Header */}
                    <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                      <img
                        src={salon.image}
                        alt={salon.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Match Score Badge */}
                      <div className="absolute top-3 left-3 bg-[#e6007e] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        {matchPercentage}% Match
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(salon.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#8c7077] hover:text-[#e6007e] transition-colors"
                        aria-label="Toggle favorite"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isFav ? 'text-[#e6007e] fill-current' : ''}`}>
                          favorite
                        </span>
                      </button>

                      {/* Reason Tag Pill overlay at bottom of image */}
                      <div className="absolute bottom-2 left-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white font-medium truncate flex items-center gap-1">
                        <span>{primaryReason}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <h3 className="text-sm font-bold text-[#26181c] truncate max-w-[190px] group-hover:text-[#e6007e] transition-colors">
                            {salon.name}
                          </h3>
                          <p className="text-[11px] text-[#5a3f47] flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px] text-[#e6007e]">location_on</span>
                            {salon.area}{salon.distanceKm > 0 ? ` • ${salon.distanceKm} km` : ''}
                          </p>
                        </div>

                        {salon.rating > 0 ? (
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                            <span className="material-symbols-outlined text-[13px] text-amber-500">star</span>
                            <span className="text-[11px] font-extrabold text-[#26181c]">{salon.rating}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                            <span className="text-[11px] font-extrabold text-emerald-600">New</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-[#8c7077] line-clamp-1 italic">
                        "{secondaryReason}"
                      </p>

                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {salon.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] font-bold bg-[#fff0f3] text-[#e6007e] px-2 py-0.5 rounded-full border border-[#fcd5e8]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between border-t border-[#f7e8ef] mt-1">
                    <div>
                      <span className="text-[9px] text-[#8c7077] block">Starts at</span>
                      <span className="text-xs font-extrabold text-[#26181c]">₹{salon.startingPrice}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSalon(salon);
                      }}
                      className="px-4 py-1.5 bg-[#e6007e] hover:bg-[#c9006e] text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
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
          <h2 className="text-[20px] font-bold text-[#26181c] tracking-tight">Curated For You</h2>
          <button
            onClick={() => onNavigate('search')}
            className="text-[13px] text-[#e6007e] font-semibold hover:text-[#b80663] transition-colors"
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
                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex gap-2">
                          {salon.verified && (
                            <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                              <span className="material-symbols-outlined text-[14px] text-[#0353db]">verified</span>
                              <span className="text-[12px] text-[#26181c] font-semibold">Verified</span>
                            </div>
                          )}
                          {salon.isNew && (
                            <div className="bg-[#e6007e]/90 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                              <span className="text-[12px] text-white font-semibold">New</span>
                            </div>
                          )}
                        </div>

                        {/* Favorite Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(salon.id);
                          }}
                          className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#8c7077] shadow-sm hover:text-[#e6007e] active:scale-90 transition-all cursor-pointer"
                          aria-label="Toggle favorite"
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isFav ? 'text-[#e6007e] fill-current' : ''
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
                              className="text-[18px] text-[#26181c] font-semibold line-clamp-1 cursor-pointer hover:text-[#e6007e] transition-colors"
                            >
                              {salon.name}
                            </h3>
                            <p className="text-[14px] text-[#5a3f47] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[16px] text-[#e6007e]">location_on</span>
                              <span className="truncate">
                                {salon.distanceKm > 0 ? `${salon.distanceKm} km • ` : ''}{salon.area}
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            {salon.rating > 0 ? (
                              <>
                                <div className="flex items-center gap-1 bg-[#ffe8ed] py-1 px-2 rounded-lg">
                                  <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                                  <span className="text-[13px] text-[#26181c] font-bold">{salon.rating}</span>
                                </div>
                                <span className="text-[11px] text-[#8c7077] mt-0.5">({salon.reviewCount ?? salon.reviewsCount}+ reviews)</span>
                              </>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 mt-0.5">New on Nexora</span>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {salon.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-[#f6dce2] text-[#26181c] text-[12px] font-medium rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Pricing & Action */}
                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#fce2e7] w-full">
                          <div className="flex flex-col">
                            <span className="text-[12px] text-[#8c7077] font-bold">Services from</span>
                            <span className="text-[18px] font-bold text-[#26181c]">₹{salon.startingPrice}</span>
                          </div>
                          <button
                            onClick={() => onSelectSalon(salon)}
                            className="h-10 px-6 bg-[#8e004b] text-white text-[13px] font-semibold rounded-xl hover:bg-[#e6007e] active:scale-95 transition-all shadow-sm cursor-pointer"
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
                  className="text-center py-12 bg-white rounded-[28px] p-6 border border-[#f0d8e2] shadow-xs col-span-full"
                >
                  <div className="w-16 h-16 bg-[#fdf2f8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-[32px] text-[#e6007e]">search_off</span>
                  </div>
                  <h3 className="font-bold text-[#26181c] text-lg">
                    {selectedCategory !== 'All' 
                      ? 'No shops available in this category.'
                      : 'No shops available'}
                  </h3>
                  <p className="text-sm text-[#5a3f47] mt-1 max-w-[280px] mx-auto">
                    {selectedCategory !== 'All' 
                      ? `There are no businesses listed under "${selectedCategory}" right now.`
                      : 'No salons found matching your criteria.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setSmartFilter('all');
                      setFilterRadius(30);
                      setSortBy('Default');
                      setFilterArea('All');
                      setFilterAudience('All');
                    }}
                    className="mt-6 px-6 py-2.5 bg-[#e6007e] text-white rounded-xl text-sm font-bold cursor-pointer active:scale-95 transition-all shadow-md shadow-[#e6007e]/20"
                  >
                    Reset Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </section>

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
              <div className="flex items-center justify-between p-4 border-b border-[#e8e8e8]">
                <h3 className="text-[18px] font-bold text-[#26181c]">Smart Search Filters</h3>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#fcf9f8] flex items-center justify-center text-[#8c7077] hover:text-[#e6007e] hover:bg-[#fde7f3] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-5">
                {/* Area Filter */}
                <div>
                  <h4 className="text-[14px] font-bold text-[#26181c] mb-3">Popular Areas (Jaipur)</h4>
                  <div className="flex flex-wrap gap-2">
                    {popularAreas.map(area => (
                      <button
                        key={area}
                        onClick={() => setFilterArea(area)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                          filterArea === area
                            ? 'bg-[#e6007e] text-white shadow-md'
                            : 'bg-[#fcf9f8] text-[#5a3f47] border border-[#e8e8e8] hover:border-[#e6007e]/30'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience / Gender */}
                <div>
                  <h4 className="text-[14px] font-bold text-[#26181c] mb-3">Target Audience</h4>
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map(audience => (
                      <button
                        key={audience}
                        onClick={() => setFilterAudience(audience)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                          filterAudience === audience
                            ? 'bg-[#e6007e] text-white shadow-md'
                            : 'bg-[#fcf9f8] text-[#5a3f47] border border-[#e8e8e8] hover:border-[#e6007e]/30'
                        }`}
                      >
                        {audience}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[14px] font-bold text-[#26181c]">Distance Radius</h4>
                    <span className="text-[13px] font-semibold text-[#e6007e]">Up to {filterRadius} km</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {radiusOptions.map(r => (
                      <button
                        key={r}
                        onClick={() => setFilterRadius(r)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                          filterRadius === r
                            ? 'bg-[#e6007e] text-white shadow-md'
                            : 'bg-[#fcf9f8] text-[#5a3f47] border border-[#e8e8e8] hover:border-[#e6007e]/30'
                        }`}
                      >
                        {r} km
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Filter */}
                <div>
                  <h4 className="text-[14px] font-bold text-[#26181c] mb-3">Sort By</h4>
                  <div className="flex flex-col gap-2">
                    {sortOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-semibold transition-all cursor-pointer text-left flex justify-between items-center ${
                          sortBy === option
                            ? 'bg-[#fff0f2] border border-[#e6007e] text-[#e6007e]'
                            : 'bg-[#fcf9f8] text-[#5a3f47] border border-[#e8e8e8] hover:border-[#e6007e]/30'
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
              <div className="p-4 border-t border-[#e8e8e8] flex gap-3 bg-white">
                <button
                  onClick={() => {
                    setFilterRadius(30);
                    setSortBy('Default');
                    setFilterArea('All');
                    setFilterAudience('All');
                  }}
                  className="flex-1 py-3 bg-[#fcf9f8] text-[#5a3f47] font-bold rounded-xl border border-[#e8e8e8] hover:bg-[#fde7f3] hover:text-[#e6007e] transition-colors cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 py-3 bg-[#e6007e] text-white font-bold rounded-xl shadow-md hover:bg-[#c9006e] transition-colors cursor-pointer"
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
