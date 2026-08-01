import React, { useState, useEffect, useMemo } from 'react';
import { Booking, LoyaltyTier, ReferralFriend } from '../types';
import { supabase } from '../lib/supabaseClient';
import type { CustomerProfile } from '../lib/profileRepository';

interface RewardsScreenProps {
  profile: CustomerProfile | null;
  bookings?: Booking[];
  customerName?: string;
  /** Session-scoped referral state owned by App (never localStorage). */
  referralCode?: string | null;
  invitedFriends?: ReferralFriend[];
  onReferralCodeChange?: (code: string | null) => void;
  onInvitedFriendsChange?: (friends: ReferralFriend[]) => void;
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

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  profile,
  bookings = [],
  customerName = '',
  referralCode = null,
  invitedFriends = [],
  onReferralCodeChange,
  onInvitedFriendsChange,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTierTab, setSelectedTierTab] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemedDiscount, setRedeemedDiscount] = useState<number | null>(null);

  // Referral & Invited Friends State (session-scoped in App — no localStorage)
  const [inviteFriendName, setInviteFriendName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Use generated code if available, fallback to a deterministic code derived
  // from the shared profile row (server data), or GLOW-GUEST for guests.
  const userReferralCode = referralCode || (profile?.id ? `NEX-${profile.id.slice(0, 4).toUpperCase()}` : 'GLOW-GUEST');

  // Loyalty points and wallet balance from the shared profiles row (server truth)
  const loyaltyPoints = profile?.loyalty_points ?? 0;
  const walletBalance = (profile?.wallet_balance_paise ?? 0) / 100;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Total active/confirmed bookings count
  const validBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalBookingsCount = validBookings.length;

  const referralLink = referralCode ? `${window.location.origin}/signup?ref=${userReferralCode}` : "";

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

  const handleGenerateReferral = () => {
    if (!profile?.id) {
      triggerToast('Please log in to generate your unique referral link.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const namePart = profile.full_name
        ? profile.full_name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
        : 'GLOW';
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const newCode = "NEX-" + (namePart || "GLOW") + "-" + randomPart;

      onReferralCodeChange?.(newCode);
      setIsGenerating(false);
      triggerToast('Unique referral link generated successfully! ✨');
    }, 1200);
  };

  const handleCopyReferralLink = () => {
    if (!referralLink) return;
    if (navigator.clipboard) navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    triggerToast('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSimulateInviteFriend = () => {
    if (!profile?.id) {
      triggerToast('Please log in to invite friends.');
      return;
    }
    if (!inviteFriendName.trim()) {
      triggerToast("Please enter a friend's name.");
      return;
    }

    const newFriend: ReferralFriend = {
      id: "sim-" + Date.now(),
      name: inviteFriendName.trim(),
      status: 'Pending First Booking',
      pointsEarned: 0,
      date: 'Just now'
    };

    const updated = [newFriend, ...invitedFriends];
    onInvitedFriendsChange?.(updated);
    setInviteFriendName('');
    triggerToast("Simulated signup for " + newFriend.name + "! 🚀");
  };

  const handleSimulateFirstBooking = async (friendId: string) => {
    if (!profile?.id) return;

    const friendIndex = invitedFriends.findIndex(f => f.id === friendId);
    if (friendIndex === -1) return;

    const friend = invitedFriends[friendIndex];
    if (friend.status === 'Completed') return;

    const updatedFriends = [...invitedFriends];
    updatedFriends[friendIndex] = {
      ...friend,
      status: 'Completed',
      pointsEarned: 250,
      date: 'Today'
    };

    onInvitedFriendsChange?.(updatedFriends);

    if (supabase) {
      // Read the CURRENT server points first so rapid clicks never clobber a
      // freshly credited balance (realtime pushes the new row back to the UI).
      let currentPoints = profile.loyalty_points ?? 0;
      try {
        const { data: freshRow } = await supabase
          .from('profiles')
          .select('loyalty_points')
          .eq('id', profile.id)
          .maybeSingle();
        if (freshRow && typeof (freshRow as any).loyalty_points === 'number') {
          currentPoints = (freshRow as any).loyalty_points as number;
        }
      } catch (e) {
        console.warn('Loyalty points read notice:', e);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ loyalty_points: currentPoints + 250 })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating loyalty points:', error);
        triggerToast("Completed booking for " + friend.name + "! (Points credit pending)");
      } else {
        triggerToast("Booking completed! You earned +250 Glow Points! 🎉");
      }
    } else {
      triggerToast("Booking completed! (Demo points cached)");
    }
  };

  const handleRedeem = async (opt: { pts: number; discount: number; label: string }) => {
    if (!supabase || !profile) return;

    // Read CURRENT server values first (same shared profiles row) so rapid
    // actions never overwrite a newer balance with stale render-time numbers.
    let currentPoints = profile.loyalty_points ?? 0;
    let currentWalletPaise = profile.wallet_balance_paise ?? 0;
    try {
      const { data: freshRow } = await supabase
        .from('profiles')
        .select('loyalty_points, wallet_balance_paise')
        .eq('id', profile.id)
        .maybeSingle();
      if (freshRow) {
        const row = freshRow as Record<string, unknown>;
        if (typeof row.loyalty_points === 'number') currentPoints = row.loyalty_points;
        if (typeof row.wallet_balance_paise === 'number') currentWalletPaise = row.wallet_balance_paise;
      }
    } catch (e) {
      console.warn('Rewards balance read notice:', e);
    }

    if (currentPoints < opt.pts) {
      triggerToast('Not enough Glow Points for this voucher yet.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        loyalty_points: currentPoints - opt.pts,
        wallet_balance_paise: currentWalletPaise + opt.discount * 100,
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Error redeeming rewards:', error);
      triggerToast('Reward could not be redeemed. Please try again.');
      return;
    }

    setRedeemedDiscount(opt.discount);
    setShowRedeemModal(false);
    triggerToast(`Redeemed ${opt.label}!`);
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
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#e6007e] to-[#8e004b] flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">diversity_3</span>
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#26181c]">Refer a Friend</h3>
            <p className="text-[12px] text-[#5a3f47]">Invite friends & track your bonus points live!</p>
          </div>
        </div>

        {!referralCode ? (
          <div className="bg-white rounded-2xl p-5 border border-[#f3d3e2] shadow-xs flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[#e6007e] text-[40px] animate-bounce">celebration</span>
            <div className="flex flex-col gap-1">
              <h4 className="text-[15px] font-bold text-[#26181c]">Unlock Referral Rewards</h4>
              <p className="text-xs text-[#5a3f47] leading-relaxed">
                Earn <span className="font-bold text-[#e6007e]">250 bonus Glow Points</span> for every friend who joins & books their first salon session. Your friend also receives a discount!
              </p>
            </div>
            <button
              onClick={handleGenerateReferral}
              disabled={isGenerating}
              className="w-full h-11 bg-gradient-to-r from-[#e6007e] to-[#8e004b] hover:from-[#b90064] hover:to-[#8e004b] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Generating Link...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">magic_button</span>
                  <span>Generate Unique Referral Link</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#f3d3e2] shadow-xs flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e004b]">Your Unique Referral Link</span>
              <div className="flex items-center gap-2 bg-[#f8eff3] p-2.5 rounded-xl border border-[#ebd2de]">
                <span className="material-symbols-outlined text-[#e6007e] text-[18px] shrink-0">link</span>
                <input type="text" readOnly value={referralLink} className="bg-transparent text-xs font-semibold flex-1 outline-none truncate" />
                <button onClick={handleCopyReferralLink} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-[#e6007e] text-white'}`}>
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Invited Friends Subsection */}
            <div className="bg-white rounded-2xl p-4 border border-[#f3d3e2] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#26181c] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#e6007e]">group</span>
                  Your Invited Friends ({invitedFriends.length})
                </span>
                <span className="text-[10px] bg-[#fde7f3] text-[#e6007e] px-2 py-0.5 rounded-full font-bold">
                  +250 pts / invite
                </span>
              </div>

              {invitedFriends.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#8c7077] font-medium">
                  No friends invited yet. Share your link above to get started!
                </div>
              ) : (
                <div className="divide-y divide-[#fcf1f5] max-h-60 overflow-y-auto pr-1">
                  {invitedFriends.map((friend) => (
                    <div key={friend.id} className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#fde7f3] text-[#e6007e] font-bold text-xs flex items-center justify-center shrink-0">
                          {friend.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#26181c] truncate">{friend.name}</p>
                          <p className="text-[10px] text-[#8c7077]">{friend.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {friend.status === 'Completed' ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>
                            +250 pts
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px]">schedule</span>
                              Pending
                            </span>
                            <button
                              onClick={() => handleSimulateFirstBooking(friend.id)}
                              className="text-[9px] font-extrabold text-[#e6007e] bg-[#fde7f3] hover:bg-[#ebd2de] px-2 py-1 rounded-lg cursor-pointer transition-colors"
                            >
                              Simulate Booked
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Simulation Box to invite a new friend */}
              <div className="pt-3 border-t border-dashed border-[#ebd2de] flex gap-2">
                <input
                  type="text"
                  value={inviteFriendName}
                  onChange={(e) => setInviteFriendName(e.target.value)}
                  placeholder="Invite friend (demo name)..."
                  className="bg-[#fcf9f8] text-xs font-medium px-3 py-2 rounded-xl border border-[#ebd2de] flex-1 outline-none focus:border-[#e6007e]"
                />
                <button
                  onClick={handleSimulateInviteFriend}
                  className="bg-[#e6007e] text-white hover:bg-[#b90064] text-xs font-bold px-3 py-2 rounded-xl shrink-0 cursor-pointer transition-colors"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        )}
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
                return (<button key={opt.pts} disabled={!canAfford} onClick={() => void handleRedeem(opt)} className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${canAfford ? 'border-[#e6007e]/30 bg-[#fff5f8] hover:bg-[#fde7f3] cursor-pointer' : 'border-slate-200 bg-slate-50 opacity-60'}`}><div><div className="text-xs font-bold text-[#26181c]">{opt.label}</div><div className="text-[10px] text-[#5a3f47]">{opt.pts} points required</div></div><span className="text-xs font-bold text-[#e6007e] bg-white px-2.5 py-1 rounded-xl shadow-xs">Redeem</span></button>);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
