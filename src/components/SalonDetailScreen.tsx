import React, { useState, useEffect } from 'react';
import { Salon, Service, Staff, ServiceReview, Booking } from '../types';
import { ServiceReviewModal } from './ServiceReviewModal';
import { MiniCalendar } from './MiniCalendar';
import { ServiceItemSkeleton, Skeleton } from './Skeleton';

interface SalonDetailScreenProps {
  salon: Salon;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  onToggleService: (service: Service) => void;
  onSelectStaff: (staff: Staff) => void;
  onProceedToCheckout: () => void;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  bookings: Booking[];
}

export const SalonDetailScreen: React.FC<SalonDetailScreenProps> = ({
  salon,
  selectedServices,
  selectedStaff,
  onToggleService,
  onSelectStaff,
  onProceedToCheckout,
  onBack,
  isFavorite,
  onToggleFavorite,
  bookings,
}) => {
  const availableStaff = salon.staff || [];

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const handleGetSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const response = await fetch('/api/suggest-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentHistory: bookings.filter(b => b.salonId === salon.id) })
      });
      const data = await response.json();
      setSuggestion(data.suggestions);
    } catch (error) {
      console.error('Error getting suggestion', error);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'services' | 'slots' | 'staff' | 'about' | 'reviews'>('services');
  const [activeGalleryIdx, setActiveGalleryIdx] = useState<number>(0);

  // Service Review States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewModalServiceId, setReviewModalServiceId] = useState<string | undefined>(undefined);
  const [initialReviewRating, setInitialReviewRating] = useState<number | undefined>(undefined);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');


  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    // Default to today
    return today;
  });


  // Service Category Filter & Accordion States
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // External Booking & Lightbox Modals
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleBookNowClick = () => {
    if (salon.bookingUrl) {
      window.open(salon.bookingUrl, '_blank', 'noopener,noreferrer');
      setIsRedirectModalOpen(true);
    } else {
      setIsUnavailableModalOpen(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'services') {
      setIsLoadingServices(true);
      const timer = setTimeout(() => setIsLoadingServices(false), 400);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedCategoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingPage(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const currentSlotDateStr = selectedDate.toLocaleString('default', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const timeSlotsWithAvailability = [
    { time: '09:00 AM', isAvailable: false, period: 'Morning' },
    { time: '09:30 AM', isAvailable: false, period: 'Morning' },
    { time: '10:00 AM', isAvailable: true, period: 'Morning' },
    { time: '10:30 AM', isAvailable: true, period: 'Morning' },
    { time: '11:00 AM', isAvailable: true, period: 'Morning' },
    { time: '12:00 PM', isAvailable: true, period: 'Afternoon' },
    { time: '01:00 PM', isAvailable: true, period: 'Afternoon' },
    { time: '03:00 PM', isAvailable: false, period: 'Afternoon' },
    { time: '04:30 PM', isAvailable: true, period: 'Afternoon' },
    { time: '06:00 PM', isAvailable: true, period: 'Evening' },
    { time: '06:30 PM', isAvailable: false, period: 'Evening' },
  ];


  const [serviceReviews, setServiceReviews] = useState<ServiceReview[]>(() => {
    const saved = localStorage.getItem(`nexora_service_reviews_${salon.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved reviews', e);
      }
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem(`nexora_service_reviews_${salon.id}`, JSON.stringify(serviceReviews));
  }, [serviceReviews, salon.id]);

  const handleAddReview = (newRev: Omit<ServiceReview, 'id' | 'date'>) => {
    const created: ServiceReview = {
      ...newRev,
      id: `sr-${Date.now()}`,
      date: 'Just now',
    };
    setServiceReviews((prev) => [created, ...prev]);
  };

  const openReviewForService = (serviceId?: string, preselectedRating?: number) => {
    setReviewModalServiceId(serviceId);
    setInitialReviewRating(preselectedRating);
    setIsReviewModalOpen(true);
  };

  // Helper to compute specific service stats
  const getServiceStats = (serviceName: string) => {
    const matching = serviceReviews.filter((r) => r.serviceName.toLowerCase() === serviceName.toLowerCase());
    if (matching.length === 0) {
      return { rating: 0, count: 0 }; // no real reviews yet — UI shows "No reviews yet"
    }
    const sum = matching.reduce((acc, r) => acc + r.rating, 0);
    const avg = (sum / matching.length).toFixed(1);
    return { rating: parseFloat(avg), count: matching.length };
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Group services by category
  const categories: string[] = Array.from(new Set(salon.services.map((s) => s.category)));

  // Filtered reviews list
  const filteredReviews = selectedServiceFilter === 'all'
    ? serviceReviews
    : serviceReviews.filter((r) => r.serviceName === selectedServiceFilter);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto relative pb-48">
      {/* Service Review Modal */}
      <ServiceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setInitialReviewRating(undefined);
        }}
        salon={salon}
        preselectedServiceId={reviewModalServiceId}
        initialRating={initialReviewRating}
        onSubmitReview={handleAddReview}
      />

      {/* Top Header Back Bar */}

      <div className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-[#e8e8e8]/50 pt-safe max-w-md mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center text-[#26181c] hover:text-[#e6007e] transition-colors shrink-0"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
            </button>
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-[#26181c] truncate">{salon.name}</h1>
          </div>
        </div>
      </div>

      <div className="pt-20">
        {isLoadingPage ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[280px] w-full rounded-none" />
            <div className="px-5 flex flex-col gap-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full mt-4" />
            </div>
          </div>
        ) : (
          <>
            {/* Hero Gallery */}
            <div className="relative w-full h-[280px] shrink-0 bg-[#e5e2e1] overflow-hidden">
          <img
            src={salon.gallery[activeGalleryIdx] || salon.image}
            alt={salon.name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Gallery Indicators & Sound + Favorite Action */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-between items-center px-5 z-20">
            <div className="flex gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
              {salon.gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGalleryIdx(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeGalleryIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleFavorite}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#e6007e] shadow-md transition-transform active:scale-90"
                aria-label="Favorite"
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isFavorite ? 'fill-current' : ''
                  }`}
                >
                  favorite
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Header Info */}
        <div className="flex flex-col px-5 pt-4 pb-2 gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[24px] font-bold text-[#26181c] tracking-tight">{salon.name}</h2>
                {salon.verified && (
                  <span
                    className="material-symbols-outlined text-[18px] text-[#0353db]"
                    title="Verified Studio"
                  >
                    verified
                  </span>
                )}
              </div>
              <p className="text-[14px] text-[#5a3f47] flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#e6007e]">location_on</span>
                {salon.distanceKm > 0 ? `${salon.distanceKm} km away • ` : ''}{salon.area}
              </p>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {salon.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fff0f3] text-[#e6007e] rounded-xl text-xs font-bold border border-[#fcd5e8] hover:bg-[#e6007e] hover:text-white transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    {salon.phone}
                  </a>
                )}
                {salon.bookingUrl ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Official Booking Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    In-Person & Phone Scheduling
                  </span>
                )}
              </div>
            </div>

            {/* Rating Badge — only real ratings; live salons without reviews show "New" */}
            {salon.rating > 0 ? (
              <div className="flex flex-col items-center bg-[#fce2e7] rounded-2xl p-2.5 shrink-0 min-w-[60px] border border-[#fde7f3]">
                <div className="flex items-center gap-1 text-[#26181c]">
                  <span className="text-[18px] font-bold">{salon.rating}</span>
                  <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
                </div>
                <span className="text-[10px] font-medium text-[#5a3f47]">({salon.reviewCount ?? salon.reviewsCount} reviews)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-2xl p-2.5 shrink-0 min-w-[60px] border border-emerald-200">
                <span className="text-[13px] font-bold text-emerald-600">New</span>
                <span className="text-[9px] font-medium text-[#5a3f47] mt-0.5">salon</span>
              </div>
            )}
          </div>

          {/* Special Offers Banner */}
          {salon.offers && salon.offers.length > 0 && (
            <div className="mt-2 bg-gradient-to-r from-amber-500/10 via-[#e6007e]/10 to-purple-500/10 p-3 rounded-2xl border border-amber-300/60 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                  🏷️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#26181c]">{salon.offers[0].title}</h4>
                  <p className="text-[10px] text-[#5a3f47] font-semibold">
                    Use promo code: <span className="text-[#e6007e] font-extrabold uppercase bg-white px-1.5 py-0.5 rounded border border-[#fcd5e8]">{salon.offers[0].code}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleBookNowClick}
                className="px-3 py-1.5 bg-[#e6007e] text-white text-[11px] font-bold rounded-xl shadow-2xs hover:bg-[#c9006e] transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                Claim Offer ↗
              </button>
            </div>
          )}
        </div>

        {/* Sticky Custom Segment Tabs */}
        <div className="sticky top-[64px] z-40 bg-[#fff8f8]/95 backdrop-blur-xl px-5 py-3 border-b border-[#fce2e7]">
          <div className="flex bg-[#ffe8ed] rounded-full p-1 relative w-full h-[44px]">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 text-[12px] sm:text-[13px] font-semibold rounded-full transition-all duration-300 py-2 ${
                activeTab === 'services'
                  ? 'bg-white text-[#26181c] shadow-sm font-bold'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`flex-1 text-[12px] sm:text-[13px] font-semibold rounded-full transition-all duration-300 py-2 relative ${
                activeTab === 'slots'
                  ? 'bg-white text-[#e6007e] shadow-sm font-bold'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              Slots
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 text-[12px] sm:text-[13px] font-semibold rounded-full transition-all duration-300 py-2 ${
                activeTab === 'staff'
                  ? 'bg-white text-[#26181c] shadow-sm font-bold'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 text-[12px] sm:text-[13px] font-semibold rounded-full transition-all duration-300 py-2 ${
                activeTab === 'about'
                  ? 'bg-white text-[#26181c] shadow-sm font-bold'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 text-[12px] sm:text-[13px] font-semibold rounded-full transition-all duration-300 py-2 ${
                activeTab === 'reviews'
                  ? 'bg-white text-[#26181c] shadow-sm font-bold'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              Reviews
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="px-5 pt-4 flex-1">
          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              {/* Category Filter Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none sticky top-[124px] bg-[#fff8f8]/95 backdrop-blur-xl z-30 py-2 -mx-5 px-5 border-b border-[#fce2e7]/50">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-[#e6007e] text-white shadow-sm ring-2 ring-[#e6007e]/30'
                      : 'bg-white text-[#5a3f47] border border-[#fcd5e8] hover:bg-[#fff0f3]'
                  }`}
                >
                  <span>All Services</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#fde7f3] text-[#e6007e]'}`}>
                    {salon.services.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const count = salon.services.filter((s) => s.category === cat).length;
                  const isSel = selectedCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#e6007e] text-white shadow-sm ring-2 ring-[#e6007e]/30'
                          : 'bg-white text-[#5a3f47] border border-[#fcd5e8] hover:bg-[#fff0f3]'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-[#fde7f3] text-[#e6007e]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Category Accordion Sections */}
              <div className="flex flex-col gap-4">
                {categories
                  .filter((cat) => selectedCategoryFilter === 'all' || selectedCategoryFilter === cat)
                  .map((cat) => {
                    const catServices = salon.services.filter((s) => s.category === cat);
                    const isCollapsed = collapsedCategories[cat] || false;

                    return (
                      <div
                        key={cat}
                        className="bg-white rounded-2xl border border-[#fcd5e8]/60 shadow-xs overflow-hidden transition-all"
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleCategoryCollapse(cat)}
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fff8f8] to-[#fff0f3] hover:from-[#fff0f3] hover:to-[#ffe8ed] transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-[#fde7f3] text-[#e6007e] flex items-center justify-center font-bold text-sm shadow-2xs">
                              {cat.charAt(0)}
                            </span>
                            <div>
                              <h3 className="text-[16px] font-bold text-[#26181c]">{cat}</h3>
                              <p className="text-[11px] text-[#5a3f47] font-medium">
                                {catServices.length} {catServices.length === 1 ? 'service' : 'services'} available
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#e6007e] bg-white px-2.5 py-1 rounded-full border border-[#fcd5e8]">
                              {isCollapsed ? 'Show Services' : 'Collapse'}
                            </span>
                            <span className="material-symbols-outlined text-[#5a3f47] text-[20px] transition-transform duration-300">
                              {isCollapsed ? 'expand_more' : 'expand_less'}
                            </span>
                          </div>
                        </button>

                        {/* Accordion Body / Services List */}
                        {!isCollapsed && (
                          <div className="p-4 pt-2 flex flex-col gap-3 border-t border-[#fce2e7]/40 bg-white">
                            {isLoadingServices ? (
                              Array.from({ length: catServices.length || 2 }).map((_, i) => <ServiceItemSkeleton key={i} />)
                            ) : (
                              catServices.map((service) => {
                                const isSelected = selectedServices.some((s) => s.id === service.id);
                                const stats = getServiceStats(service.name);
                                return (
                                  <div
                                    key={service.id}
                                    className={`flex flex-col p-4 rounded-2xl border transition-all ${
                                    isSelected
                                      ? 'border-[#e6007e] bg-[#fff0f2] shadow-xs'
                                      : 'border-slate-100 hover:border-[#fcd5e8] bg-slate-50/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1.5 max-w-[65%]">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[15px] font-semibold text-[#26181c]">
                                          {service.name}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fff8f8] border border-[#fce2e7] text-[#e6007e] text-[11px] font-bold shrink-0 shadow-sm transition-transform hover:scale-105">
                                          <span className="material-symbols-outlined text-[14px]">timer</span>
                                          {service.durationMinutes} min
                                        </span>
                                      </div>
                                      <span className="text-[12px] text-[#5a3f47] font-medium">
                                        {service.description || 'Custom treatment'}
                                      </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                      <span className="text-[18px] font-bold text-[#e6007e]">
                                        ₹{service.price}
                                      </span>
                                      <button
                                        onClick={() => onToggleService(service)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#e6007e] text-white shadow-xs'
                                            : 'bg-[#fde7f3] text-[#e6007e] hover:bg-[#e6007e] hover:text-white'
                                        }`}
                                        aria-label={isSelected ? 'Remove service' : 'Add service'}
                                      >
                                        <span className="material-symbols-outlined text-[20px]">
                                          {isSelected ? 'check' : 'add'}
                                        </span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Service Rating & Review Action Bar */}
                                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                    {stats.count > 0 ? (
                                      <div className="flex items-center gap-1.5 bg-[#fff0f3] px-2.5 py-1 rounded-lg border border-[#fcd5e8]">
                                        <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                                        <span className="font-extrabold text-[#26181c]">{stats.rating}</span>
                                        <span className="text-[#8c7077] font-medium">({stats.count} reviews)</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        <span className="text-[11px] font-semibold text-emerald-600">No reviews yet</span>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => openReviewForService(service.id)}
                                      className="text-[#e6007e] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">rate_review</span>
                                      Review Service
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Slots Tab */}
          {activeTab === 'slots' && (
            <div className="flex flex-col gap-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-[#26181c]">Appointment Time Slots</h3>
                  <p className="text-[11px] text-[#5a3f47]">Select an available slot</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Live Slots
                </span>
              </div>
              
              {/* AI Suggestion Button */}
              <button 
                onClick={handleGetSuggestion}
                disabled={loadingSuggestion}
                className="w-full py-3 bg-[#26181c] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-[#402a30] active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                {loadingSuggestion ? 'Analyzing...' : 'Get AI Time Suggestions'}
              </button>
              {suggestion && (
                <div className="bg-[#fde7f3] text-[#26181c] p-4 rounded-2xl text-xs font-medium border border-[#fcd5e8]">
                   <p className="font-bold mb-1">AI Recommendation:</p>
                   {suggestion}
                </div>
              )}

              {/* Date Selector Mini Calendar */}
              <MiniCalendar 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />

              {/* Time Slots Grid */}
              <div className="space-y-4">
                {['Morning', 'Afternoon', 'Evening'].map((period) => {
                  const slotsInPeriod = timeSlotsWithAvailability.filter((s) => s.period === period);
                  return (
                    <div key={period} className="bg-white p-4 rounded-2xl border border-[#f0d8e2] shadow-xs">
                      <h4 className="text-xs font-extrabold text-[#5a3f47] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">
                          {period === 'Morning' ? 'light_mode' : period === 'Afternoon' ? 'wb_sunny' : 'bedtime'}
                        </span>
                        {period} Slots
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {slotsInPeriod.map((slot) => {
                          if (slot.isAvailable) {
                            return (
                              <button
                                key={slot.time}
                                onClick={onProceedToCheckout}
                                className="p-2.5 rounded-xl bg-[#fff0f3] hover:bg-[#e6007e] hover:text-white border border-[#fcd5e8] text-[#26181c] transition-all cursor-pointer flex flex-col items-center justify-center group active:scale-95"
                              >
                                <span className="text-xs font-bold">{slot.time}</span>
                                <span className="text-[9px] text-[#e6007e] group-hover:text-white font-extrabold">Available</span>
                              </button>
                            );
                          }

                          // FULLY BOOKED SLOT - JOIN WAITLIST BUTTON
                          return (
                            <div
                              key={slot.time}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 relative overflow-hidden"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-400 line-through">{slot.time}</span>
                                <span className="text-[9px] font-extrabold bg-slate-200 text-slate-700 px-1 rounded">No slots available</span>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[18px] font-bold text-[#26181c]">Select Preferred Stylist</h3>
                  <p className="text-[12px] text-[#5a3f47] font-medium">
                    Choose a specialist for your service or request any available team member
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fde7f3] text-[#e6007e] text-[11px] font-bold border border-[#fcd5e8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e6007e]" />
                  3 Stylists Available
                </span>
              </div>

              {/* Side-by-side 3-column grid layout across all screen sizes */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full">
                {availableStaff.map((member) => {
                  const isChosen = selectedStaff?.id === member.id || selectedStaff?.name === member.name;
                  return (
                    <div
                      key={member.id}
                      onClick={() => onSelectStaff(member)}
                      className={`flex flex-col items-center justify-between p-3 sm:p-4 bg-white rounded-2xl shadow-xs border cursor-pointer transition-all active:scale-95 text-center relative min-w-0 ${
                        isChosen
                          ? 'border-[#e6007e] ring-2 ring-[#e6007e]/30 bg-[#fff0f2] shadow-sm'
                          : 'border-[#f0d8e2] hover:border-[#fcd5e8] hover:bg-[#fff8f8]'
                      }`}
                    >
                      {isChosen && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#e6007e] text-white flex items-center justify-center shadow-2xs">
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        </div>
                      )}

                      <div className="flex flex-col items-center w-full">
                        <div className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-xs mb-2 mt-1 border-2 transition-transform ${
                          isChosen ? 'border-[#e6007e] scale-105' : 'border-[#fcd5e8]'
                        }`}>
                          <img
                            src={member.avatar}
                            alt={member.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[13px] sm:text-[15px] font-bold text-[#26181c] truncate w-full leading-tight">
                          {member.name}
                        </span>
                        <span className="text-[10px] sm:text-[12px] font-semibold text-[#e6007e] truncate w-full mt-0.5">
                          {member.role}
                        </span>
                      </div>

                      {member.reviewsCount > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-2.5 bg-[#fde7f3]/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-[#fcd5e8]/50 w-full">
                          <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-amber-500 fill-current">star</span>
                          <span className="text-[10px] sm:text-[11px] text-[#26181c] font-bold">
                            {member.rating}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-[#8c7077]">
                            ({member.reviewsCount})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div className="flex flex-col gap-2">
                <h3 className="text-[18px] font-bold text-[#26181c]">About {salon.name}</h3>
                <p className="text-[15px] text-[#5a3f47] leading-relaxed font-normal">
                  {salon.description}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[18px] font-bold text-[#26181c]">Location & Hours</h3>
                <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-4 border border-[#e8e8e8]">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-full bg-[#fde7f3] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#e6007e] text-[20px]">location_on</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-medium text-[#26181c]">{salon.address}</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(salon.name + ' ' + salon.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-[#e6007e] font-semibold mt-1 hover:underline flex items-center gap-1"
                      >
                        Get Directions
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    </div>
                  </div>

                  <div className="w-full h-px bg-[#fce2e7]" />

                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-full bg-[#fde7f3] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#e6007e] text-[20px]">schedule</span>
                    </div>
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between w-full">
                        <span className="text-[14px] text-[#26181c] font-medium">Mon - Sat</span>
                        <span className="text-[14px] text-[#5a3f47] font-semibold">{salon.hours}</span>
                      </div>
                      <div className="flex justify-between w-full mt-1">
                        <span className="text-[14px] text-rose-600 font-medium">Sunday</span>
                        <span className="text-[14px] text-[#5a3f47] font-semibold">11:00 AM - 6:00 PM</span>
                      </div>
                    </div>
                  </div>

                  {salon.phone && (
                    <>
                      <div className="w-full h-px bg-[#fce2e7]" />
                      <div className="flex gap-3 items-center justify-between">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-full bg-[#fde7f3] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#e6007e] text-[20px]">call</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12px] text-[#8c7077] font-medium">Contact Number</span>
                            <span className="text-[14px] text-[#26181c] font-bold">{salon.phone}</span>
                          </div>
                        </div>
                        <a
                          href={`tel:${salon.phone}`}
                          className="px-3.5 py-1.5 bg-[#e6007e] text-white rounded-xl text-xs font-bold hover:bg-[#c9006e] transition-all cursor-pointer shadow-2xs"
                        >
                          Call Studio
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Amenities Section */}
              {salon.amenities && salon.amenities.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-[18px] font-bold text-[#26181c]">Amenities & Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {salon.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#26181c] text-xs font-semibold border border-[#e8e8e8] shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#e6007e]">check_circle</span>
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Gallery Grid */}
              {salon.gallery && salon.gallery.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-[18px] font-bold text-[#26181c]">Salon Photos & Studio Gallery</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {salon.gallery.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewImage(imgUrl)}
                        className="aspect-square rounded-2xl overflow-hidden cursor-pointer border border-slate-200 hover:opacity-90 transition-all relative group shadow-2xs"
                      >
                        <img src={imgUrl} alt={`Gallery ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[22px]">zoom_in</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Map Card */}
              <div className="flex flex-col gap-2.5">
                <h3 className="text-[18px] font-bold text-[#26181c]">Location Map</h3>
                <div className="relative w-full h-44 bg-gradient-to-br from-[#fff0f3] to-[#fde7f3] rounded-2xl overflow-hidden border border-[#fcd5e8] flex flex-col items-center justify-center p-4 text-center group shadow-xs">
                  <div className="absolute inset-0 bg-[radial-gradient(#e6007e_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-25" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-full bg-[#e6007e] text-white flex items-center justify-center shadow-md animate-bounce">
                      <span className="material-symbols-outlined text-[24px]">location_on</span>
                    </div>
                    <p className="text-xs font-bold text-[#26181c]">{salon.name}</p>
                    <p className="text-[11px] text-[#5a3f47] max-w-[260px]">{salon.address}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(salon.name + ' ' + salon.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 px-4 py-2 bg-white text-[#e6007e] rounded-xl text-xs font-bold border border-[#fcd5e8] shadow-xs hover:bg-[#e6007e] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Open in Google Maps
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="flex flex-col gap-5 animate-in fade-in">
              {/* Header Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-bold text-[#26181c]">Service Reviews & Feedback</h3>
                  <p className="text-[11px] text-[#5a3f47]">Rated by verified clients after appointment completion</p>
                </div>
                <button
                  onClick={() => openReviewForService()}
                  className="px-3.5 py-2 bg-[#e6007e] hover:bg-[#c9006e] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  Write Review
                </button>
              </div>

              {/* Inline Quick Star Rating */}
              <div className="bg-white rounded-2xl border border-[#fcd5e8] shadow-xs p-4 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-[#26181c] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#e6007e] text-[16px]">star_rate</span>
                    Rate this salon
                  </span>
                  <span className="text-[10px] text-[#8c7077]">Tap a star to start your review</span>
                </div>
                <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Quick star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => openReviewForService(undefined, star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-125 focus:outline-none cursor-pointer group"
                      aria-label={`Quick rate ${star} stars`}
                    >
                      <span className="material-symbols-outlined text-[28px] text-[#e0bec6] transition-colors group-hover:text-amber-500 group-hover:fill-current">
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Ratings Breakdown Card */}
              <div className="bg-gradient-to-br from-[#fff0f3] to-white rounded-2xl p-4 border border-[#fcd5e8] shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#fce2e7] pb-2">
                  <span className="text-xs font-bold text-[#26181c] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#e6007e] text-[16px]">stars</span>
                    Service Rating Breakdown
                  </span>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    Verified Reviews ({serviceReviews.length})
                  </span>
                </div>

                {/* Progress bars for services */}
                <div className="space-y-2">
                  {salon.services.slice(0, 4).map((svc) => {
                    const stats = getServiceStats(svc.name);
                    const percentage = Math.round((stats.rating / 5) * 100);
                    return (
                      <div key={svc.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-[#26181c] font-semibold text-[11px] truncate max-w-[140px]">
                          {svc.name}
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-[#e6007e] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-[11px]">
                          <span className="font-extrabold text-[#26181c]">{stats.rating}</span>
                          <span className="material-symbols-outlined text-[12px] text-amber-500">star</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedServiceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedServiceFilter === 'all'
                      ? 'bg-[#26181c] text-white shadow-xs'
                      : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
                  }`}
                >
                  All Services ({serviceReviews.length})
                </button>
                {salon.services.map((svc) => {
                  const count = serviceReviews.filter((r) => r.serviceName === svc.name).length;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedServiceFilter(svc.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        selectedServiceFilter === svc.name
                          ? 'bg-[#e6007e] text-white shadow-xs'
                          : 'bg-white text-[#5a3f47] border border-[#f0d8e2] hover:bg-[#fff0f3]'
                      }`}
                    >
                      <span>{svc.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-extrabold">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Service Reviews List */}
              {filteredReviews.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-white rounded-2xl shadow-sm border border-[#e8e8e8] flex flex-col gap-2 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-[#26181c]">{rev.author}</span>
                            {rev.verifiedBooking && (
                              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                Verified Client
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#fde7f3] text-[#e6007e] border border-[#fcd5e8]">
                              🏷️ {rev.serviceName}
                            </span>
                            <span className="text-[11px] text-[#8c7077]">• {rev.date}</span>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                          <span className="text-xs font-extrabold">{rev.rating}</span>
                          <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                        </div>
                      </div>

                      <p className="text-[14px] text-[#5a3f47] mt-1 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-slate-300">rate_review</span>
                  <p className="text-xs font-bold text-[#26181c]">No reviews yet for "{selectedServiceFilter}"</p>
                  <p className="text-[11px] text-[#5a3f47]">Be the first client to leave a rating and written feedback!</p>
                  <button
                    onClick={() => {
                      const matchedSvc = salon.services.find((s) => s.name === selectedServiceFilter);
                      openReviewForService(matchedSvc?.id);
                    }}
                    className="mt-1 px-3.5 py-1.5 bg-[#e6007e] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Write First Review
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 pt-4 pb-6 p-5 bg-white/95 backdrop-blur-3xl border-t border-[#e8e8e8] pb-safe z-50 max-w-md mx-auto shadow-[0_-8px_30px_rgba(0,0,0,0.08)] mb-safe">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] text-[#5a3f47] font-medium">Starting from</span>
              {selectedServices.length > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#fff0f3] text-[#e6007e] text-[9px] font-bold border border-[#fcd5e8]">
                  <span className="material-symbols-outlined text-[12px]">timer</span>
                  {selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)} min
                </div>
              )}
            </div>
            <span className="text-[20px] font-bold text-[#8e004b]">
              ₹{totalPrice > 0 ? totalPrice : salon.startingPrice}
            </span>
          </div>
          
          <div className="text-right">
            <span className="text-[11px] font-medium text-[#5a3f47]">Booking Method</span>
            <p className="text-[12px] font-bold text-[#e6007e] flex items-center justify-end gap-1">
              <span className="material-symbols-outlined text-[14px]">public</span>
              {salon.bookingUrl ? 'Official Site' : 'Direct Call'}
            </p>
          </div>
        </div>

        <button
          onClick={handleBookNowClick}
          className="w-full h-[52px] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer bg-[#e6007e] text-white hover:bg-[#b80663] shadow-[#e6007e]/30"
        >
          <span>{salon.bookingUrl ? 'Book Now on Official Site' : 'Book Now'}</span>
          <span className="material-symbols-outlined text-[18px]">
            {salon.bookingUrl ? 'open_in_new' : 'arrow_forward'}
          </span>
        </button>
      </div>

      {/* External Redirect Confirmation Modal */}
      {isRedirectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#fff0f3] border border-[#fcd5e8] text-[#e6007e] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[30px]">open_in_new</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-[#26181c]">Opening Official Website</h3>
              <p className="text-xs text-[#5a3f47] leading-relaxed">
                You are being transferred to the official booking website for <strong className="text-[#26181c]">{salon.name}</strong> to complete your appointment securely.
              </p>
              {salon.bookingUrl && (
                <p className="text-[11px] text-[#8c7077] font-mono mt-1 break-all bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {salon.bookingUrl}
                </p>
              )}
            </div>
            <div className="flex flex-col w-full gap-2 mt-2">
              <button
                onClick={() => {
                  if (salon.bookingUrl) window.open(salon.bookingUrl, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-3 bg-[#e6007e] hover:bg-[#c9006e] text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                Proceed to Official Site ↗
              </button>
              <button
                onClick={() => setIsRedirectModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#26181c] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Return to App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Booking Unavailable Modal */}
      {isUnavailableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[30px]">event_busy</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-[#26181c]">Online Booking Unavailable</h3>
              <p className="text-xs text-[#5a3f47] leading-relaxed">
                Online booking is currently unavailable for <strong className="text-[#26181c]">{salon.name}</strong>.
              </p>
              <p className="text-xs text-[#8c7077] mt-1">
                Please call or visit the salon directly to schedule your appointment.
              </p>
            </div>
            <div className="flex flex-col w-full gap-2 mt-2">
              {salon.phone && (
                <a
                  href={`tel:${salon.phone}`}
                  className="w-full py-3 bg-[#26181c] text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call Salon ({salon.phone})
                </a>
              )}
              <button
                onClick={() => setIsUnavailableModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#26181c] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-md w-full max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain bg-black" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
