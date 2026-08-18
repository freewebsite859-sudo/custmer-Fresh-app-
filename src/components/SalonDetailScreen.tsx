import React, { useState, useEffect, useMemo } from 'react';
import { Salon, Service, Staff, ServiceReview, Booking } from '../types';
import { ServiceReviewModal } from './ServiceReviewModal';
import { Skeleton } from './Skeleton';

interface SalonDetailScreenProps {
  salon: Salon;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  onToggleService: (service: Service) => void;
  onSelectStaff: (staff: Staff | null) => void;
  onProceedToCheckout: () => void;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  bookings: Booking[];
  customerName?: string;
  /** Server/session-backed reviews for this salon (never localStorage). */
  serviceReviews?: ServiceReview[];
  onSubmitReview?: (newRev: Omit<ServiceReview, 'id' | 'date'>) => void;
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
  customerName = '',
  serviceReviews = [],
  onSubmitReview,
}) => {
  const availableStaff = salon.staff || [];

  const [isLoadingPage, setIsLoadingPage] = useState(true);

  // Service Review States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewModalServiceId, setReviewModalServiceId] = useState<string | undefined>(undefined);
  const [initialReviewRating, setInitialReviewRating] = useState<number | undefined>(undefined);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');

  // Service Category Filter (used on the combined Services section)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // "Things to Know" FAQ accordion
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

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
    const timer = setTimeout(() => setIsLoadingPage(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Reviews come from app session state (shared with the bookings flow),
  // never from localStorage — business data lives on the server/shared ops.
  const handleAddReview = (newRev: Omit<ServiceReview, 'id' | 'date'>) => {
    onSubmitReview?.(newRev);
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
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Group services by category
  const categories: string[] = Array.from(new Set(salon.services.map((s) => s.category)));

  const visibleServices = selectedCategoryFilter === 'all'
    ? salon.services
    : salon.services.filter((s) => s.category === selectedCategoryFilter);

  // Filtered reviews list
  const filteredReviews = selectedServiceFilter === 'all'
    ? serviceReviews
    : serviceReviews.filter((r) => r.serviceName === selectedServiceFilter);

  // Overall rating breakdown (5★..1★ share of real reviews only)
  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 => 5 stars ... index 4 => 1 star
    serviceReviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[5 - idx] += 1;
    });
    const total = serviceReviews.length || 1;
    return [5, 4, 3, 2, 1].map((star, i) => ({
      star,
      pct: Math.round((counts[i] / total) * 100),
    }));
  }, [serviceReviews]);

  const faqs = [
    { q: 'Can I select my professional?', a: 'Yes — pick "Any Professional" for the fastest slot, or choose a specific stylist from the Professionals list above.' },
    { q: 'Can I reschedule?', a: 'You can reschedule or cancel from My Bookings up until the cancellation window shown at checkout.' },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto relative pb-32">
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
        authorName={customerName || 'Customer'}
        onSubmitReview={handleAddReview}
      />

      {/* Top Header Back Bar */}
      <div className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-2xl border-b border-outline-subtle/50 pt-safe max-w-md mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 -ml-1 flex items-center justify-center text-on-surface hover:text-nexora-pink transition-colors shrink-0 cursor-pointer"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <div className="flex flex-col min-w-0">
              <span className="font-card-title text-[16px] text-on-surface leading-tight truncate">{salon.name}</span>
              <div className="flex items-center gap-0.5 mt-0.5 min-w-0">
                <span className="material-symbols-outlined text-nexora-pink text-[14px] shrink-0">location_on</span>
                <span className="font-metadata text-metadata text-on-surface-variant truncate">
                  {salon.area}{salon.city ? `, ${salon.city}` : ''}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onToggleFavorite}
            className="w-9 h-9 flex items-center justify-center text-nexora-pink shrink-0 cursor-pointer"
            aria-label="Favorite"
          >
            <span className={`material-symbols-outlined text-[22px] ${isFavorite ? 'fill-1' : ''}`}>favorite</span>
          </button>
        </div>
      </div>

      <div className="pt-16">
        {isLoadingPage ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[180px] w-full rounded-none" />
            <div className="px-page-margin flex flex-col gap-4">
              <Skeleton className="h-6 w-2/3" />
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
            {/* Hero Heading */}
            <section className="px-page-margin pt-6 pb-4">
              <h1 className="font-page-heading text-page-heading text-on-surface mb-1">
                {salon.name}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {salon.tags.slice(0, 3).join(' · ') || 'Salon & Spa'}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {salon.rating > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg text-[13px] font-bold text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-warning-amber fill-1">star</span>
                    {salon.rating}
                    <span className="text-on-surface-variant font-medium">({salon.reviewCount ?? salon.reviewsCount})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 bg-success-emerald/10 text-success-emerald rounded-lg text-[13px] font-bold">New</span>
                )}
                {salon.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg text-[12px] font-semibold text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                    Verified
                  </span>
                )}
                {salon.distanceKm > 0 && (
                  <span className="text-[12px] text-on-surface-variant">{salon.distanceKm} km away</span>
                )}
              </div>

              {/* Special Offers Banner */}
              {salon.offers && salon.offers.length > 0 && (
                <div className="mt-3 bg-gradient-to-r from-warning-amber/10 via-nexora-pink/10 to-purple-500/10 p-3 rounded-2xl border border-warning-amber/40 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-warning-amber text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                      🏷️
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-on-surface truncate">{salon.offers[0].title}</h4>
                      <p className="text-[10px] text-on-surface-variant font-semibold truncate">
                        Code: <span className="text-nexora-pink font-extrabold uppercase bg-white px-1.5 py-0.5 rounded border border-outline-variant">{salon.offers[0].code}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleBookNowClick}
                    className="px-3 py-1.5 bg-nexora-pink text-white text-[11px] font-bold rounded-xl shadow-2xs hover:bg-primary transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                  >
                    Claim ↗
                  </button>
                </div>
              )}
            </section>

            {/* Services Section */}
            <section className="px-page-margin mb-6">
              <div className="mb-4">
                <h2 className="font-section-heading text-section-heading text-on-surface">Services</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Choose the service(s) you want to book</p>
              </div>

              {/* Category Filter Pills */}
              {categories.length > 1 && (
                <div className="-mx-page-margin overflow-x-auto no-scrollbar flex gap-2 px-page-margin mb-4">
                  <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-6 py-2 rounded-full font-button-text text-[14px] whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-nexora-pink text-white shadow-sm'
                        : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-nexora-pink hover:text-nexora-pink'
                    }`}
                  >
                    All ({salon.services.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-6 py-2 rounded-full font-button-text text-[14px] whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-nexora-pink text-white shadow-sm'
                          : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-nexora-pink hover:text-nexora-pink'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {visibleServices.length === 0 && (
                  <p className="text-body-md text-on-surface-variant text-center py-6">No services listed yet.</p>
                )}
                {visibleServices.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  const stats = getServiceStats(service.name);
                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-xl border-2 shadow-sm flex justify-between items-center gap-3 transition-colors ${
                        isSelected ? 'bg-surface-container-low border-nexora-pink' : 'bg-surface-off-white border-outline-variant'
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <h4 className="font-card-title text-on-surface truncate">{service.name}</h4>
                        <p className="text-metadata text-on-surface-variant truncate">
                          {service.description || 'Custom treatment'}
                        </p>
                        <div className="flex items-center gap-3 text-metadata text-on-surface-variant flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {service.durationMinutes} min
                          </span>
                          <span className="font-bold text-nexora-pink">₹{service.price}</span>
                          {stats.count > 0 ? (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-warning-amber fill-1">star</span>
                              {stats.rating} ({stats.count})
                            </span>
                          ) : (
                            <span className="text-success-emerald font-semibold">No reviews yet</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleService(service)}
                        className={`px-4 py-2 rounded-lg font-button-text text-[14px] shadow-sm whitespace-nowrap transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-nexora-pink text-white'
                            : 'bg-surface-container text-nexora-pink border border-nexora-pink hover:bg-nexora-pink hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Professionals Section */}
            <section className="px-page-margin mb-6">
              <h2 className="font-section-heading text-section-heading text-on-surface mb-4">Professionals</h2>
              <div className="-mx-page-margin overflow-x-auto no-scrollbar flex gap-3 px-page-margin">
                <button
                  onClick={() => onSelectStaff(null)}
                  className="flex-shrink-0 w-32 flex flex-col items-center gap-2 cursor-pointer"
                >
                  <div
                    className={`w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center border-2 transition-colors ${
                      !selectedStaff ? 'border-nexora-pink' : 'border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-nexora-pink text-[32px]">person_add</span>
                  </div>
                  <div className="text-center">
                    <p className="font-card-title text-[14px] text-on-surface">Any Professional</p>
                    <p className="text-metadata text-nexora-pink">Fastest</p>
                  </div>
                </button>

                {availableStaff.map((member) => {
                  const isChosen = selectedStaff?.id === member.id;
                  return (
                    <button
                      key={member.id}
                      onClick={() => onSelectStaff(member)}
                      className="flex-shrink-0 w-32 flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div className={`w-20 h-20 rounded-full overflow-hidden border-2 transition-colors ${isChosen ? 'border-nexora-pink' : 'border-outline-variant'}`}>
                        <img src={member.avatar} alt={member.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center">
                        <p className="font-card-title text-[14px] text-on-surface truncate w-full">{member.name}</p>
                        <p className="text-metadata text-on-surface-variant truncate w-full">{member.role}</p>
                        {member.reviewsCount > 0 && (
                          <div className="flex items-center justify-center gap-0.5 text-warning-amber mt-0.5">
                            <span className="material-symbols-outlined text-[12px] fill-1">star</span>
                            <span className="text-metadata font-bold text-on-surface">{member.rating}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {availableStaff.length === 0 && (
                  <p className="text-metadata text-on-surface-variant py-4">No individual stylist profiles listed — book with "Any Professional".</p>
                )}
              </div>
            </section>

            {/* About */}
            <section className="px-page-margin mb-6">
              <h2 className="font-section-heading text-section-heading text-on-surface mb-2">About</h2>
              <p className="font-body-md text-on-surface-variant mb-4">
                {salon.description || `${salon.name} offers professional grooming and beauty services with a focus on customer comfort.`}
              </p>
              {salon.amenities && salon.amenities.length > 0 && (
                <div className="-mx-page-margin overflow-x-auto no-scrollbar flex gap-2 px-page-margin">
                  {salon.amenities.map((amenity, idx) => (
                    <span key={idx} className="px-3 py-1 bg-surface-container rounded-full text-metadata text-on-surface-variant flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
              {salon.gallery && salon.gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {salon.gallery.slice(0, 6).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewImage(imgUrl)}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-outline-variant relative group"
                    >
                      <img src={imgUrl} alt={`Gallery ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reviews & Ratings */}
            <section className="px-page-margin mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-section-heading text-section-heading text-on-surface">Reviews & Ratings</h2>
                <button
                  onClick={() => openReviewForService()}
                  className="px-3 py-1.5 bg-nexora-pink hover:bg-primary text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  Write Review
                </button>
              </div>

              {serviceReviews.length > 0 ? (
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[32px] font-bold text-on-surface">{salon.rating || '—'}</span>
                    <div className="flex text-warning-amber">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`material-symbols-outlined text-[18px] ${salon.rating >= i ? 'fill-1' : ''}`}>star</span>
                      ))}
                    </div>
                    <span className="text-metadata text-on-surface-variant mt-1">{serviceReviews.length} reviews</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    {ratingBreakdown.map((row) => (
                      <div key={row.star} className="flex items-center gap-2">
                        <span className="text-metadata w-2">{row.star}</span>
                        <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="bg-warning-amber h-full" style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant text-center">
                  <p className="text-metadata font-semibold text-on-surface-variant">No reviews yet — be the first to rate {salon.name}!</p>
                </div>
              )}

              {/* Service Filter Pills */}
              {serviceReviews.length > 0 && (
                <div className="-mx-page-margin overflow-x-auto no-scrollbar flex gap-2 px-page-margin mb-4">
                  <button
                    onClick={() => setSelectedServiceFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedServiceFilter === 'all' ? 'bg-on-surface text-white shadow-xs' : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
                    }`}
                  >
                    All Services ({serviceReviews.length})
                  </button>
                  {salon.services.map((svc) => {
                    const count = serviceReviews.filter((r) => r.serviceName === svc.name).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedServiceFilter(svc.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                          selectedServiceFilter === svc.name ? 'bg-nexora-pink text-white shadow-xs' : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {svc.name}
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-extrabold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reviews List */}
              {filteredReviews.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {filteredReviews.map((rev) => (
                    <div key={rev.id} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                      <div className="flex justify-between mb-1">
                        <span className="font-card-title text-[14px] text-on-surface">{rev.author}</span>
                        <span className="text-metadata text-on-surface-variant">{rev.date}</span>
                      </div>
                      <div className="flex text-warning-amber mb-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`material-symbols-outlined text-[14px] ${rev.rating >= i ? 'fill-1' : ''}`}>star</span>
                        ))}
                      </div>
                      <p className="text-body-md text-on-surface-variant">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              ) : serviceReviews.length > 0 ? (
                <p className="text-metadata text-on-surface-variant text-center py-4">No reviews yet for "{selectedServiceFilter}".</p>
              ) : null}
            </section>

            {/* Opening Hours */}
            <section className="px-page-margin mb-6">
              <h2 className="font-section-heading text-section-heading text-on-surface mb-3">Opening Hours</h2>
              <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <div className="flex flex-col">
                  <span className="font-body-md text-on-surface">Today: {salon.hours || 'Hours not listed'}</span>
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="px-page-margin mb-6">
              <h2 className="font-section-heading text-section-heading text-on-surface mb-3">Location</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-nexora-pink">location_on</span>
                  <div>
                    <p className="font-body-md text-on-surface">{salon.address || `${salon.area}, ${salon.city}`}</p>
                    {salon.distanceKm > 0 && (
                      <p className="text-metadata text-on-surface-variant">{salon.distanceKm} km away</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address || salon.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 border border-nexora-pink text-nexora-pink rounded-lg font-button-text flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">directions</span>
                    Directions
                  </a>
                  {salon.phone && (
                    <a
                      href={`tel:${salon.phone}`}
                      className="flex-1 h-10 border border-nexora-pink text-nexora-pink rounded-lg font-button-text flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">call</span>
                      Call
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Things to Know */}
            <section className="px-page-margin mb-6">
              <h2 className="font-section-heading text-section-heading text-on-surface mb-3">Things to Know</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant">event_busy</span>
                  <span className="text-body-md text-on-surface">Free cancellation up to 24 hours before your appointment</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
                  <span className="text-body-md text-on-surface">Arrive 10 mins before your slot</span>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border-b border-outline-variant">
                    <button
                      onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-3 cursor-pointer"
                    >
                      <span className="text-body-md text-on-surface text-left">{faq.q}</span>
                      <span className="material-symbols-outlined transition-transform">
                        {openFaqIdx === idx ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {openFaqIdx === idx && (
                      <p className="px-3 pb-3 text-metadata text-on-surface-variant">{faq.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Sticky Selection / Continue Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)] max-w-md mx-auto">
        <div className="px-page-margin py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <span className="font-card-title text-[14px] text-on-surface truncate">
              {selectedServices.length > 0
                ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                : 'No service selected'}
            </span>
            <span className="text-metadata text-on-surface-variant">
              {selectedServices.length > 0 ? `${totalDuration} min total · ₹${totalPrice}` : 'Pick a service above to continue'}
            </span>
          </div>
          {salon.bookingUrl ? (
            <button
              onClick={handleBookNowClick}
              className="flex-1 max-w-[180px] h-12 bg-nexora-pink text-white rounded-xl font-button-text text-[16px] shadow-lg active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1.5"
            >
              Book Now
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </button>
          ) : (
            <button
              onClick={onProceedToCheckout}
              disabled={selectedServices.length === 0}
              aria-label="Continue to booking"
              className={`flex-1 max-w-[180px] h-12 rounded-xl font-button-text text-[16px] shadow-lg transition-transform cursor-pointer ${
                selectedServices.length === 0
                  ? 'bg-nexora-pink text-white opacity-50 cursor-not-allowed'
                  : 'bg-nexora-pink text-white active:scale-95'
              }`}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* External Redirect Confirmation Modal */}
      {isRedirectModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-outline-subtle flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-container border border-outline-variant text-nexora-pink flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[30px]">open_in_new</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-on-surface">Opening Official Website</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                You are being transferred to the official booking website for <strong className="text-on-surface">{salon.name}</strong> to complete your appointment securely.
              </p>
              {salon.bookingUrl && (
                <p className="text-[11px] text-outline font-mono mt-1 break-all bg-surface-container-low p-2.5 rounded-xl border border-outline-variant">
                  {salon.bookingUrl}
                </p>
              )}
            </div>
            <div className="flex flex-col w-full gap-2 mt-2">
              <button
                onClick={() => {
                  if (salon.bookingUrl) window.open(salon.bookingUrl, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-3 bg-nexora-pink hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                Proceed to Official Site ↗
              </button>
              <button
                onClick={() => setIsRedirectModalOpen(false)}
                className="w-full py-2.5 bg-surface-container-highest hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Return to App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Booking Unavailable Modal */}
      {isUnavailableModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-outline-subtle flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-warning-amber/10 border border-warning-amber/40 text-warning-amber flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[30px]">event_busy</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-on-surface">Online Booking Unavailable</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Online booking is currently unavailable for <strong className="text-on-surface">{salon.name}</strong>.
              </p>
              <p className="text-xs text-outline mt-1">
                Please call or visit the salon directly to schedule your appointment.
              </p>
            </div>
            <div className="flex flex-col w-full gap-2 mt-2">
              {salon.phone && (
                <a
                  href={`tel:${salon.phone}`}
                  className="w-full py-3 bg-on-surface text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call Salon ({salon.phone})
                </a>
              )}
              <button
                onClick={() => setIsUnavailableModalOpen(false)}
                className="w-full py-2.5 bg-surface-container-highest hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
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
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-md w-full max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain bg-black" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
