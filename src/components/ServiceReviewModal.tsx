import React, { useState, useEffect } from 'react';
import { Salon, Service, ServiceReview } from '../types';

interface ServiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon;
  preselectedServiceId?: string;
  initialRating?: number;
  onSubmitReview: (newReview: Omit<ServiceReview, 'id' | 'date'>) => void;
}

export const ServiceReviewModal: React.FC<ServiceReviewModalProps> = ({
  isOpen,
  onClose,
  salon,
  preselectedServiceId,
  initialRating,
  onSubmitReview,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [author, setAuthor] = useState<string>(() => localStorage.getItem('profile_name') || 'Customer');
  const [comment, setComment] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
    } else if (salon.services.length > 0) {
      setSelectedServiceId(salon.services[0].id);
    }
  }, [preselectedServiceId, salon]);

  // Seed the star rating whenever the modal is opened (inline quick-rate passes initialRating)
  useEffect(() => {
    if (isOpen) {
      const seeded =
        typeof initialRating === 'number' && initialRating >= 1 && initialRating <= 5
          ? Math.round(initialRating)
          : 5;
      setRating(seeded);
      setHoverRating(0);
    }
  }, [isOpen, initialRating]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please write a brief comment describing your service experience.');
      return;
    }

    const matchedService = salon.services.find((s) => s.id === selectedServiceId) || salon.services[0];

    onSubmitReview({
      salonId: salon.id,
      serviceId: matchedService.id,
      serviceName: matchedService.name,
      author: author.trim() || 'Verified Client',
      rating,
      comment: comment.trim(),
      verifiedBooking: true,
    });

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setComment('');
      setErrorMsg('');
      onClose();
    }, 1200);
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5:
        return '5.0 • Outstanding Treatment!';
      case 4:
        return '4.0 • Great Experience';
      case 3:
        return '3.0 • Satisfactory';
      case 2:
        return '2.0 • Needs Improvement';
      case 1:
        return '1.0 • Unsatisfactory';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl border border-[#f0d8e2] overflow-hidden animate-in slide-in-from-bottom duration-300 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f3e1e8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
              <span className="material-symbols-outlined text-[20px]">rate_review</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#26181c]">Write Service Review</h3>
              <p className="text-[11px] text-[#5a3f47]">{salon.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {submittedSuccess ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h4 className="text-[18px] font-bold text-[#26181c]">Review Published!</h4>
            <p className="text-xs text-[#5a3f47] max-w-[260px]">
              Thank you for sharing your feedback. Your review helps other clients discover quality salon treatments!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {/* Service Selection */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1.5">
                Select Service
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full p-2.5 bg-[#fff8fa] border border-[#f3d3e2] rounded-xl text-xs font-semibold text-[#26181c] focus:outline-none focus:ring-2 focus:ring-[#e6007e]/50 cursor-pointer"
              >
                {salon.services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} (₹{svc.price})
                  </option>
                ))}
              </select>
            </div>

            {/* Star Rating Picker */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1">
                Service Rating
              </label>
              <div className="flex items-center justify-between bg-[#fff0f3] p-3 rounded-2xl border border-[#fcd5e8]">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform active:scale-125 focus:outline-none cursor-pointer"
                        aria-label={`Rate ${star} stars`}
                      >
                        <span
                          className={`material-symbols-outlined text-[26px] transition-colors ${
                            active ? 'text-amber-500 fill-current' : 'text-slate-300'
                          }`}
                        >
                          star
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-extrabold text-[#e6007e]">
                  {getRatingLabel(hoverRating || rating)}
                </span>
              </div>
            </div>

            {/* Client Name */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your display name"
                className="w-full p-2.5 bg-white border border-[#f3d3e2] rounded-xl text-xs text-[#26181c] focus:outline-none focus:ring-2 focus:ring-[#e6007e]/50"
              />
            </div>

            {/* Written Review Feedback */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1">
                Service Experience & Feedback
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Share details about the technique, comfort, duration, and final results..."
                className="w-full p-2.5 bg-white border border-[#f3d3e2] rounded-xl text-xs text-[#26181c] focus:outline-none focus:ring-2 focus:ring-[#e6007e]/50 resize-none"
              />
              {errorMsg && <p className="text-[11px] text-rose-600 font-semibold mt-1">{errorMsg}</p>}
            </div>

            {/* Verified Badge info */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#5a3f47] bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">verified</span>
              <span>This review will be marked as a <strong>Verified Client Experience</strong>.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#f3e1e8]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#e6007e] hover:bg-[#c9006e] text-white text-xs font-bold rounded-xl transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
