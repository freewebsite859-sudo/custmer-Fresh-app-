import React, { useState, useEffect, useMemo } from 'react';
import { Booking, LoyaltyTier } from '../types';
import { supabase } from '../lib/supabaseClient';
import type { CustomerProfile } from '../lib/profileRepository';

interface RewardsScreenProps {
  profile: CustomerProfile | null;
  bookings?: Booking[];
  customerName?: string;
}

export const TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze Tier',
    minBookings: 0,
    maxBookings: 2,
    multiplier: '1x Points',
    icon: 'workspace_premium',
    gradient: 'from-[#5e3219] via-[#854522] to-[#b8632e]',
    badgeBg: 'bg-amber-950/40 border border-amber-500/30',
    badgeText: 'text-amber-200',
    accentColor: '#b8632e',
    perks: [
      'Earn 1x Glow Points per ₹100 spent',
      'Access to active promo coupons',
      'Special birthday month offer',
    ],
  },
  {
    id: 'silver',
    name: 'Silver Tier',
    minBookings: 3,
    maxBookings: 5,
    multiplier: '1.5x Points',
    icon: 'military_tech',
    gradient: 'from-[#334155] via-[#475569] to-[#64748b]',
    badgeBg: 'bg-slate-800/50 border border-slate-300/40',
    badgeText: 'text-slate-100',
    accentColor: '#64748b',
    perks: [
      'Earn 1.5x Glow Points on every booking',
      '10% off salon product add-ons',
      'Priority weekend slot booking',
      'Free hair & scalp health checkup',
    ],
  },
  {
    id: 'gold',
    name: 'Gold Tier',
    minBookings: 6,
    maxBookings: 9,
    multiplier: '2x Points',
    icon: 'stars',
    gradient: 'from-[#8e004b] via-[#b80663] to-[#e6007e]',
    badgeBg: 'bg-white/20 border border-white/30',
    badgeText: 'text-amber-200',
    accentColor: '#e6007e',
    perks: [
      'Earn 2x Glow Points on every booking',
      'Free Scalp & Hair Therapy Session',
      'Zero cancellation charge policy',
      'VIP Senior Stylist selection',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum Tier',
    minBookings: 10,
    maxBookings: null,
    multiplier: '2.5x Points',
    icon: 'diamond',
    gradient: 'from-[#3b0764] via-[#581c87] to-[#8b5cf6]',
    badgeBg: 'bg-purple-900/50 border border-purple-300/40',
    badgeText: 'text-purple-200',
    accentColor: '#8b5cf6',
    perks: [
      'Earn 2.5x Glow Points on every booking',
      'Complimentary Express Hair Styling',
      'Dedicated VIP Concierge Hotline',
      'Free Birthday Deluxe Facial voucher',
    ],
  },
];

interface ReferralItem {
  id: string;
  name: string;
  status: 'Completed' | 'Pending First Booking';
  pointsEarned: number;
  date: string;
}

interface LeaderboardMember {
  id: string;
  name: string;
  pointsAllTime: number;
  pointsMonthly: number;
  pointsWeekly: number;
  bookings: number;
  tier: string;
  avatarBg: string;
  isUser?: boolean;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ profile, bookings = [], customerName = '' }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTierTab, setSelectedTierTab] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemedDiscount, setRedeemedDiscount] = useState<number | null>(null);

  // Referral State - synced with DB profile
  const userReferralCode = profile?.id ? `NEX-${profile.id.slice(0, 4).toUpperCase()}` : 'GLOW-GUEST';
  
  // Loyalty points and wallet balance from profile
  const loyaltyPoints = (profile as any)?.loyalty_points || 0;
  const walletBalance = ((profile as any)?.wallet_balance_paise || 0) / 100;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Total active/confirmed bookings count
  const validBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalBookingsCount = validBookings.length;

  const referralLink = `${window.location.origin}/signup?ref=${userReferralCode}`;

  // Leaderboard State
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'all_time' | 'this_month' | 'weekly'>('all_time');

  // Compute Current Tier & Progress
  const getTierDetails = (count: number) => {
    let tierIndex = TIERS.findIndex(
      (t) => count >= t.minBookings && (t.maxBookings === null || count <= t.maxBookings)
    );
    if (tierIndex === -1) { tierIndex = count >= 10 ? 3 : 0; }
    const currentTier = TIERS[tierIndex];
    const nextTier = TIERS[tierIndex + 1] || null;
    let progressPercent = 100;
    let bookingsNeeded = 0;
    if (nextTier) {
      const minCurrent = currentTier.minBookings;
      const minNext = nextTier.minBookings;
      const span = minNext - minCurrent;
      const completedInTier = count - minCurrent;
      progressPercent = Math.min(100, Math.max(0, (completedInTier / span) * 100));
      bookingsNeeded = Math.max(0, minNext - count);
    }
    return { currentTier, nextTier, progressPercent, bookingsNeeded, tierIndex };
  };

  const { currentTier, nextTier, progressPercent, bookingsNeeded } = getTierDetails(totalBookingsCount);

  const currentUserMember: LeaderboardMember = {
    id: profile?.id || 'guest',
    name: `${profile?.full_name || 'Customer'} (You)`,
    pointsAllTime: loyaltyPoints,
    pointsMonthly: Math.floor(loyaltyPoints * 0.7),
    pointsWeekly: Math.floor(loyaltyPoints * 0.4),
    bookings: totalBookingsCount,
    tier: currentTier.name.split(' ')[0],
    avatarBg: 'bg-[#e6007e] text-white border-white',
    isUser: true,
  };

  const allLeaderboardMembers = [currentUserMember];
  const activeLeaderboard = allLeaderboardMembers
    .map((m) => {
      let activePoints = m.pointsAllTime;
      if (leaderboardTimeframe === 'this_month') activePoints = m.pointsMonthly;
      if (leaderboardTimeframe === 'weekly') activePoints = m.pointsWeekly;
      return { ...m, activePoints };
    })
    .sort((a, b) => b.activePoints - a.activePoints);

  const currentUserRankIndex = activeLeaderboard.findIndex((m) => m.isUser);
  const currentUserRank = currentUserRankIndex !== -1 ? currentUserRankIndex + 1 : 1;

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyReferralLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    triggerToast('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-6 pb-40 pt-2 animate-in fade-in relative">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-[#26181c] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 animate-in slide-in-from-top duration-300 max-w-[90vw]">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">auto_awesome</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className={`bg-gradient-to-br ${currentTier.gradient} rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className={`${currentTier.badgeBg} ${currentTier.badgeText} backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1.5`}>
              <span className="material-symbols-outlined text-[16px]">{currentTier.icon}</span>{currentTier.name}
            </span>
            <span className="bg-white/15 px-2.5 py-1 rounded-full text-[10px] font-bold text-white/90">{currentTier.multiplier}</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[12px] text-white/80 font-medium tracking-wide uppercase">Nexora Glow Points</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-[38px] font-extrabold tracking-tight">{loyaltyPoints.toLocaleString()}</h2>
            <span className="text-sm font-semibold text-white/80">pts</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/80 mt-1 font-medium">
             <span>Wallet Balance: ₹{walletBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/20 relative z-10">
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-white/90 flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[15px]">event_available</span>{totalBookingsCount} Bookings Completed</span>
            {nextTier ? <span className="text-white/90 font-bold">Progress toward {nextTier.name} ({bookingsNeeded} more)</span> : <span className="text-amber-200 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">verified</span>Max Tier Unlocked</span>}
          </div>
          <div className="w-full h-3 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20 relative">
            <div className="h-full bg-gradient-to-r from-amber-300 via-amber-200 to-white rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-xs relative z-10">
          <span className="text-white/90 font-medium">{redeemedDiscount ? `₹${redeemedDiscount} Discount Active` : `₹${Math.floor(loyaltyPoints / 20)} discount available`}</span>
          <button onClick={() => setShowRedeemModal(true)} className="font-bold underline cursor-pointer hover:text-amber-200 transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">card_giftcard</span>Use Rewards</button>
        </div>
      </div>

      <section className="bg-white rounded-[24px] p-5 border border-[#f0d8e2] shadow-md flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3e1e8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-[#e6007e] to-purple-600 flex items-center justify-center text-white shadow-sm"><span className="material-symbols-outlined text-[22px]">emoji_events</span></div>
            <h3 className="text-[17px] font-bold text-[#26181c]">Glow Leaderboard</h3>
          </div>
        </div>
        <div className="bg-gradient-to-r from-[#26181c] to-[#421d28] rounded-2xl p-3.5 text-white shadow-sm flex items-center justify-between border border-[#e6007e]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6007e] text-white font-extrabold text-sm flex items-center justify-center border-2 border-amber-300 shrink-0 shadow-sm relative">{currentUserRank === 1 ? '👑' : `#${currentUserRank}`}</div>
            <span className="text-xs font-bold text-white">Your Rank: #{currentUserRank}</span>
          </div>
        </div>
        <p className="text-[12px] text-[#8c7077] font-medium bg-[#fcf9f8] border border-[#f0d8e2] rounded-xl p-3">Community rankings appear as more clients book through Nexora.</p>
      </section>

      <section className="bg-gradient-to-br from-[#fff0f3] via-white to-[#fde7f3] rounded-[24px] p-5 border border-[#fcd5e8] shadow-md flex flex-col gap-4">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#e6007e] to-[#8e004b] flex items-center justify-center text-white shadow-md"><span className="material-symbols-outlined text-[24px]">diversity_3</span></div><div><h3 className="text-[17px] font-bold text-[#26181c]">Refer a Friend</h3><p className="text-[12px] text-[#5a3f47]">Share your code — coming soon!</p></div></div>
        <div className="bg-white rounded-2xl p-4 border border-[#f3d3e2] shadow-xs flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e004b]">Your Referral Link</span>
          <div className="flex items-center gap-2 bg-[#f8eff3] p-2.5 rounded-xl border border-[#ebd2de]"><span className="material-symbols-outlined text-[#e6007e] text-[18px] shrink-0">link</span><input type="text" readOnly value={referralLink} className="bg-transparent text-xs font-semibold flex-1 outline-none truncate" /><button onClick={handleCopyReferralLink} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-[#e6007e] text-white'}`}>{copiedLink ? 'Copied' : 'Copy'}</button></div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[17px] font-bold text-[#26181c]">Loyalty Tiers</h3>
        <div className="grid grid-cols-1 gap-3">
          {TIERS.map((tier) => {
            const isCurrent = currentTier.id === tier.id;
            const isSelected = selectedTierTab === tier.id || (selectedTierTab === null && isCurrent);
            return (
              <div key={tier.id} onClick={() => setSelectedTierTab(tier.id)} className={`rounded-2xl border transition-all cursor-pointer ${isCurrent ? 'border-[#e6007e] bg-[#fff5f8]' : 'border-[#f0d8e2] bg-white'}`}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#e6007e] text-white' : 'bg-[#fde7f3] text-[#e6007e]'}`}><span className="material-symbols-outlined text-[22px]">{tier.icon}</span></div><h4 className="text-[15px] font-bold text-[#26181c]">{tier.name}</h4></div>
                  <span className="material-symbols-outlined text-[20px] text-[#8c7077]">{isSelected ? 'expand_less' : 'expand_more'}</span>
                </div>
                {isSelected && (<div className="px-4 pb-4 pt-1 border-t border-[#f3e1e8] bg-white/60"><ul className="space-y-1.5">{tier.perks.map((perk, idx) => (<li key={idx} className="flex items-start gap-2 text-xs font-medium"><span className="material-symbols-outlined text-[16px] text-[#e6007e]">check_circle</span><span>{perk}</span></li>))}</ul></div>)}
              </div>
            );
          })}
        </div>
      </section>

      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#f0d8e2]">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#e6007e] text-[24px]">stars</span><h3 className="text-[18px] font-bold text-[#26181c]">Use Rewards</h3></div><button onClick={() => setShowRedeemModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-[18px]">close</span></button></div>
            <p className="text-xs text-[#5a3f47] mb-4">You have <span className="font-bold text-[#e6007e]">{loyaltyPoints} pts</span>. Choose a voucher:</p>
            <div className="space-y-2.5 mb-5">
              {[{ pts: 500, discount: 100, label: '₹100 Off Voucher' }, { pts: 1000, discount: 250, label: '₹250 Off Voucher' }].map((opt) => {
                const canAfford = loyaltyPoints >= opt.pts;
                return (<button key={opt.pts} disabled={!canAfford} onClick={async () => { if (!supabase || !profile) return; const { error } = await supabase.from('profiles').update({ loyalty_points: loyaltyPoints - opt.pts, wallet_balance_paise: ((profile as any).wallet_balance_paise || 0) + (opt.discount * 100) }).eq('id', profile.id); if (!error) { setRedeemedDiscount(opt.discount); setShowRedeemModal(false); triggerToast(`Redeemed ${opt.label}!`); } }} className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${canAfford ? 'border-[#e6007e]/30 bg-[#fff5f8] hover:bg-[#fde7f3] cursor-pointer' : 'border-slate-200 bg-slate-50 opacity-60'}`}><div><div className="text-xs font-bold text-[#26181c]">{opt.label}</div><div className="text-[10px] text-[#5a3f47]">{opt.pts} points required</div></div><span className="text-xs font-bold text-[#e6007e] bg-white px-2.5 py-1 rounded-xl shadow-xs">Redeem</span></button>);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
