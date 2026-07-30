import React, { useState, useEffect } from 'react';
import { Booking, LoyaltyTier } from '../types';

interface RewardsScreenProps {
  bookings?: Booking[];
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

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ bookings = [] }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTierTab, setSelectedTierTab] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemedDiscount, setRedeemedDiscount] = useState<number | null>(null);
  const [redeemedPointsSpent, setRedeemedPointsSpent] = useState<number>(0);

  // Expiring Rewards
  const [expiringRewards] = useState([
    { id: 'exp-1', name: '20% off Facials', expiryDate: '2 Days' },
    { id: 'exp-2', name: 'Free Express Hair Styling', expiryDate: '1 Week' },
  ]);

  // Leaderboard State
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'all_time' | 'this_month' | 'weekly'>('all_time');

  // Referral State
  const [userReferralCode, setUserReferralCode] = useState('GLOW-PRIYA-8921');
  const [bonusReferralPoints, setBonusReferralPoints] = useState<number>(1000); // 2 previous successful signups x 500
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([
    {
      id: 'ref-1',
      name: 'Ananya Sharma',
      status: 'Completed',
      pointsEarned: 500,
      date: '20 Jul 2026',
    },
    {
      id: 'ref-2',
      name: 'Rohan Mehta',
      status: 'Completed',
      pointsEarned: 500,
      date: '12 Jul 2026',
    },
  ]);

  const [simulatedFriendName, setSimulatedFriendName] = useState('');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Total active/confirmed bookings count
  const validBookings = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalBookingsCount = validBookings.length;

  // Calculate total points dynamically (Base + Bookings + Referral Bonuses - Spent)
  const basePoints = 1200;
  const bookingPoints = totalBookingsCount * 625;
  const calculatedPoints = Math.max(0, basePoints + bookingPoints + bonusReferralPoints - redeemedPointsSpent);

  const referralLink = `https://nexora.app/invite/${userReferralCode}`;

  // Compute Current Tier & Progress
  const getTierDetails = (count: number) => {
    let tierIndex = TIERS.findIndex(
      (t) => count >= t.minBookings && (t.maxBookings === null || count <= t.maxBookings)
    );

    if (tierIndex === -1) {
      tierIndex = count >= 10 ? 3 : 0;
    }

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

    return {
      currentTier,
      nextTier,
      progressPercent,
      bookingsNeeded,
      tierIndex,
    };
  };

  const { currentTier, nextTier, progressPercent, bookingsNeeded } = getTierDetails(totalBookingsCount);

  // Leaderboard Community Mock Dataset
  const baseCommunityMembers: LeaderboardMember[] = [
    {
      id: 'usr-1',
      name: 'Meera Singhania',
      pointsAllTime: 8450,
      pointsMonthly: 2400,
      pointsWeekly: 1200,
      bookings: 14,
      tier: 'Platinum',
      avatarBg: 'bg-amber-500 text-white border-amber-300',
    },
    {
      id: 'usr-2',
      name: 'Kavya Nair',
      pointsAllTime: 5900,
      pointsMonthly: 1800,
      pointsWeekly: 850,
      bookings: 9,
      tier: 'Gold',
      avatarBg: 'bg-[#e6007e] text-white border-pink-200',
    },
    {
      id: 'usr-3',
      name: 'Tanya Verma',
      pointsAllTime: 4100,
      pointsMonthly: 1250,
      pointsWeekly: 600,
      bookings: 6,
      tier: 'Gold',
      avatarBg: 'bg-purple-600 text-white border-purple-300',
    },
    {
      id: 'usr-4',
      name: 'Rhea Roy',
      pointsAllTime: 2850,
      pointsMonthly: 900,
      pointsWeekly: 450,
      bookings: 4,
      tier: 'Silver',
      avatarBg: 'bg-slate-700 text-white border-slate-300',
    },
    {
      id: 'usr-5',
      name: 'Sanya Malhotra',
      pointsAllTime: 1800,
      pointsMonthly: 550,
      pointsWeekly: 250,
      bookings: 3,
      tier: 'Silver',
      avatarBg: 'bg-emerald-600 text-white border-emerald-300',
    },
    {
      id: 'usr-6',
      name: 'Diya Patel',
      pointsAllTime: 950,
      pointsMonthly: 300,
      pointsWeekly: 150,
      bookings: 1,
      tier: 'Bronze',
      avatarBg: 'bg-amber-800 text-white border-amber-600',
    },
  ];

  // Current Logged-in User Profile in Leaderboard
  const currentUserMember: LeaderboardMember = {
    id: 'priya-current-user',
    name: `${localStorage.getItem('profile_name') || 'Priya Sharma'} (You)`,
    pointsAllTime: calculatedPoints,
    pointsMonthly: Math.floor(calculatedPoints * 0.7),
    pointsWeekly: Math.floor(calculatedPoints * 0.4),
    bookings: totalBookingsCount,
    tier: currentTier.name.split(' ')[0],
    avatarBg: 'bg-[#e6007e] text-white border-white',
    isUser: true,
  };

  const allLeaderboardMembers = [...baseCommunityMembers, currentUserMember];

  // Process & Sort Members by selected timeframe
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
  const userAhead = currentUserRankIndex > 0 ? activeLeaderboard[currentUserRankIndex - 1] : null;
  const pointsToCatchUp = userAhead ? userAhead.activePoints - activeLeaderboard[currentUserRankIndex].activePoints + 1 : 0;

  const top3Members = activeLeaderboard.slice(0, 3);
  const remainingMembers = activeLeaderboard.slice(3);

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyReferralLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
    }
    setCopiedLink(true);
    triggerToast('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSimulateFriendSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const friendName = simulatedFriendName.trim() || 'Aarav Patel';
    const newBonus = 500;

    const newRef: ReferralItem = {
      id: `ref-${Date.now()}`,
      name: friendName,
      status: 'Completed',
      pointsEarned: newBonus,
      date: 'Today',
    };

    setReferralsList((prev) => [newRef, ...prev]);
    setBonusReferralPoints((prev) => prev + newBonus);
    setSimulatedFriendName('');
    setShowSimulateModal(false);
    triggerToast(`🎉 ${friendName} signed up using your link! You both earned +500 Glow Points!`);
  };

  const generateNewCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newCode = `GLOW-PRIYA-${randomNum}`;
    setUserReferralCode(newCode);
    triggerToast(`Generated new referral code: ${newCode}`);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-6 pb-40 pt-2 animate-in fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-[#26181c] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 animate-in slide-in-from-top duration-300 max-w-[90vw]">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">auto_awesome</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loyalty Header Banner */}
      <div
        className={`bg-gradient-to-br ${currentTier.gradient} rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-xl pointer-events-none" />

        {/* Tier Header Badge & Icon */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`${currentTier.badgeBg} ${currentTier.badgeText} backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1.5`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {currentTier.icon}
              </span>
              {currentTier.name}
            </span>
            <span className="bg-white/15 px-2.5 py-1 rounded-full text-[10px] font-bold text-white/90">
              {currentTier.multiplier}
            </span>
          </div>
          <span className="material-symbols-outlined text-[30px] text-amber-300 drop-shadow-md">
            {currentTier.icon}
          </span>
        </div>

        {/* Glow Points Display */}
        <div className="relative z-10">
          <p className="text-[12px] text-white/80 font-medium tracking-wide uppercase">
            Nexora Glow Points
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-[38px] font-extrabold tracking-tight">
              {calculatedPoints.toLocaleString()}
            </h2>
            <span className="text-sm font-semibold text-white/80">pts</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/80 mt-1 font-medium">
            <span>Base & Bookings: {basePoints + bookingPoints} pts</span>
            <span>•</span>
            <span className="text-amber-200 font-bold">Referral Bonus: +{bonusReferralPoints} pts</span>
          </div>
        </div>

        {/* Progress Bar Toward Next Tier */}
        <div className="mt-5 pt-4 border-t border-white/20 relative z-10">
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-white/90 flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[15px]">event_available</span>
              {totalBookingsCount} {totalBookingsCount === 1 ? 'Booking' : 'Bookings'} Completed
            </span>
            {nextTier ? (
              <span className="text-white/90 font-bold">
                Progress toward {nextTier.name.replace('Tier', 'Elite')} ({bookingsNeeded} more)
              </span>
            ) : (
              <span className="text-amber-200 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Max Tier Unlocked
              </span>
            )}
          </div>

          {/* Progress Track */}
          <div className="w-full h-3 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20 relative">
            <div
              className="h-full bg-gradient-to-r from-amber-300 via-amber-200 to-white rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Tier Milestone Markers */}
          <div className="flex justify-between items-center mt-2 text-[10px] text-white/70 font-semibold px-0.5">
            <span className={totalBookingsCount >= 0 ? 'text-amber-200 font-bold' : ''}>
              Bronze (0)
            </span>
            <span className={totalBookingsCount >= 3 ? 'text-amber-200 font-bold' : ''}>
              Silver (3)
            </span>
            <span className={totalBookingsCount >= 6 ? 'text-amber-200 font-bold' : ''}>
              Gold (6)
            </span>
            <span className={totalBookingsCount >= 10 ? 'text-amber-200 font-bold' : ''}>
              Platinum (10+)
            </span>
          </div>
        </div>

        {/* Redeem Action Footer */}
        <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-xs relative z-10">
          <span className="text-white/90 font-medium">
            {redeemedDiscount ? `₹${redeemedDiscount} Discount Active` : `₹${Math.floor(calculatedPoints / 20)} discount available`}
          </span>
          <button
            onClick={() => setShowRedeemModal(true)}
            className="font-bold underline cursor-pointer hover:text-amber-200 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">card_giftcard</span>
            Use Rewards
          </button>
        </div>
      </div>

      {/* Upcoming Expiry Section */}
      <section className="bg-white rounded-[24px] p-5 border border-red-100 shadow-sm flex flex-col gap-3">
        <h3 className="text-[15px] font-bold text-[#26181c] flex items-center gap-2">
           <span className="material-symbols-outlined text-red-500 text-[18px]">alarm</span>
           Upcoming Expiry
        </h3>
        {expiringRewards.map(reward => (
          <div key={reward.id} className="flex justify-between items-center text-xs p-3 bg-red-50/50 rounded-xl border border-red-100">
             <span className="font-semibold text-red-900">{reward.name}</span>
             <span className="font-bold text-red-600">Expires in {reward.expiryDate}</span>
          </div>
        ))}
      </section>

      {/* GLOW CHAMPIONS LEADERBOARD SECTION */}
      <section className="bg-white rounded-[24px] p-5 border border-[#f0d8e2] shadow-md flex flex-col gap-4">
        {/* Header Title & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3e1e8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-[#e6007e] to-purple-600 flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px]">emoji_events</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[#26181c]">Glow Leaderboard</h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                  Live Ranks
                </span>
              </div>
              <p className="text-[11px] text-[#5a3f47]">Compete with salon members & unlock VIP perks!</p>
            </div>
          </div>

          {/* Timeframe Filter Tabs */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-[#f8eff3] p-1 rounded-xl border border-[#ebd2de] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setLeaderboardTimeframe('all_time')}
              className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                leaderboardTimeframe === 'all_time'
                  ? 'bg-[#e6007e] text-white shadow-2xs'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setLeaderboardTimeframe('this_month')}
              className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                leaderboardTimeframe === 'this_month'
                  ? 'bg-[#e6007e] text-white shadow-2xs'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setLeaderboardTimeframe('weekly')}
              className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                leaderboardTimeframe === 'weekly'
                  ? 'bg-[#e6007e] text-white shadow-2xs'
                  : 'text-[#5a3f47] hover:text-[#26181c]'
              }`}
            >
              Weekly Sprint
            </button>
          </div>
        </div>

        {/* Current User Rank Status Banner */}
        <div className="bg-gradient-to-r from-[#26181c] to-[#421d28] rounded-2xl p-3.5 text-white shadow-sm flex items-center justify-between border border-[#e6007e]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6007e] text-white font-extrabold text-sm flex items-center justify-center border-2 border-amber-300 shrink-0 shadow-sm relative">
              {currentUserRank === 1 ? '👑' : `#${currentUserRank}`}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Your Rank: #{currentUserRank} of {activeLeaderboard.length}</span>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full font-bold uppercase">
                  {currentUserMember.tier}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 font-medium mt-0.5">
                {currentUserRank === 1
                  ? '🏆 You are in 1st Place! Champion of Nexora Salon!'
                  : userAhead
                  ? `Only ${pointsToCatchUp} points behind #${currentUserRank - 1} ${userAhead.name.split(' ')[0]}!`
                  : 'Earn points by booking & referring friends!'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#26181c] rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Climb Board
          </button>
        </div>

        {/* TOP 3 PODIUM DISPLAY */}
        {top3Members.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
            {/* Rank 2 - Silver (Left) */}
            <div className="flex flex-col items-center bg-slate-50/90 rounded-2xl p-3 border border-slate-200 relative shadow-xs">
              <div className="absolute -top-3 bg-slate-200 border border-slate-400 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5">
                🥈 #2 Silver
              </div>
              <div className={`w-11 h-11 rounded-full ${top3Members[1].avatarBg} font-bold text-sm flex items-center justify-center border-2 border-slate-300 mt-2 shadow-xs`}>
                {top3Members[1].name.charAt(0)}
              </div>
              <h4 className="text-[12px] font-bold text-[#26181c] mt-1.5 text-center truncate w-full">
                {top3Members[1].name.split(' ')[0]} {top3Members[1].isUser ? '(You)' : ''}
              </h4>
              <span className="text-[10px] font-bold text-[#e6007e] bg-[#fde7f3] px-2 py-0.5 rounded-full mt-1">
                {top3Members[1].activePoints.toLocaleString()} pts
              </span>
              <span className="text-[9px] text-[#5a3f47] font-medium mt-0.5">
                {top3Members[1].bookings} Bookings
              </span>
            </div>

            {/* Rank 1 - Gold Champion (Center - Tallest) */}
            <div className="flex flex-col items-center bg-gradient-to-b from-amber-50 to-amber-100/60 rounded-2xl p-3.5 border-2 border-amber-300 relative shadow-md scale-105 z-10">
              <div className="absolute -top-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-amber-200">
                <span>👑</span>
                <span>#1 Champion</span>
              </div>
              <div className={`w-13 h-13 rounded-full ${top3Members[0].avatarBg} font-extrabold text-base flex items-center justify-center border-2 border-amber-400 mt-2 shadow-md relative`}>
                {top3Members[0].name.charAt(0)}
                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#26181c] rounded-full p-0.5 text-[10px] material-symbols-outlined font-extrabold">
                  stars
                </span>
              </div>
              <h4 className="text-[13px] font-extrabold text-[#26181c] mt-1.5 text-center truncate w-full">
                {top3Members[0].name.split(' ')[0]} {top3Members[0].isUser ? '(You)' : ''}
              </h4>
              <span className="text-[11px] font-extrabold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full mt-1 border border-amber-300">
                {top3Members[0].activePoints.toLocaleString()} pts
              </span>
              <span className="text-[9px] text-amber-800 font-bold mt-0.5">
                {top3Members[0].bookings} Bookings
              </span>
            </div>

            {/* Rank 3 - Bronze (Right) */}
            <div className="flex flex-col items-center bg-amber-900/5 rounded-2xl p-3 border border-amber-800/20 relative shadow-xs">
              <div className="absolute -top-3 bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-0.5">
                🥉 #3 Bronze
              </div>
              <div className={`w-11 h-11 rounded-full ${top3Members[2].avatarBg} font-bold text-sm flex items-center justify-center border-2 border-amber-600 mt-2 shadow-xs`}>
                {top3Members[2].name.charAt(0)}
              </div>
              <h4 className="text-[12px] font-bold text-[#26181c] mt-1.5 text-center truncate w-full">
                {top3Members[2].name.split(' ')[0]} {top3Members[2].isUser ? '(You)' : ''}
              </h4>
              <span className="text-[10px] font-bold text-[#e6007e] bg-[#fde7f3] px-2 py-0.5 rounded-full mt-1">
                {top3Members[2].activePoints.toLocaleString()} pts
              </span>
              <span className="text-[9px] text-[#5a3f47] font-medium mt-0.5">
                {top3Members[2].bookings} Bookings
              </span>
            </div>
          </div>
        )}

        {/* FULL LEADERBOARD LIST (#4 AND BEYOND) */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="text-[12px] font-bold text-[#26181c] flex items-center justify-between px-1">
            <span>Other Contenders</span>
            <span className="text-[10px] text-[#5a3f47] font-medium">Sorted by Total Loyalty Points</span>
          </div>

          <div className="space-y-2">
            {remainingMembers.map((member, idx) => {
              const rankNum = idx + 4;
              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    member.isUser
                      ? 'bg-gradient-to-r from-[#fff0f3] to-[#fde7f3] border-[#e6007e] shadow-xs ring-1 ring-[#e6007e]/30'
                      : 'bg-white border-[#f0d8e2] hover:border-[#e6007e]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-extrabold text-[#8e004b] w-5 text-center shrink-0">
                      #{rankNum}
                    </span>

                    <div className={`w-9 h-9 rounded-full ${member.avatarBg} font-bold text-xs flex items-center justify-center border shrink-0`}>
                      {member.name.charAt(0)}
                    </div>

                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#26181c] truncate">
                          {member.name}
                        </h4>
                        {member.isUser && (
                          <span className="bg-[#e6007e] text-white text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded-md shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5a3f47] font-medium truncate">
                        {member.tier} Tier • {member.bookings} Salon {member.bookings === 1 ? 'Visit' : 'Visits'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-[#e6007e] block">
                      {member.activePoints.toLocaleString()} pts
                    </span>
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">trending_up</span>
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* REFER A FRIEND FEATURE MODULE */}
      <section className="bg-gradient-to-br from-[#fff0f3] via-white to-[#fde7f3] rounded-[24px] p-5 border border-[#fcd5e8] shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#e6007e] to-[#8e004b] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[24px]">diversity_3</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[#26181c]">Refer a Friend</h3>
                <span className="bg-[#e6007e] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  +500 Pts
                </span>
              </div>
              <p className="text-[12px] text-[#5a3f47]">
                You <span className="font-bold text-[#e6007e]">both get 500 points</span> when they book their first appointment!
              </p>
            </div>
          </div>
        </div>

        {/* Referral Link & Code Box */}
        <div className="bg-white rounded-2xl p-4 border border-[#f3d3e2] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e004b]">
              Your Unique Referral Link
            </span>
            <button
              onClick={generateNewCode}
              className="text-[11px] text-[#e6007e] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">refresh</span>
              Regenerate Code
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#f8eff3] p-2.5 rounded-xl border border-[#ebd2de]">
            <span className="material-symbols-outlined text-[#e6007e] text-[18px] shrink-0">
              link
            </span>
            <input
              type="text"
              readOnly
              value={referralLink}
              className="bg-transparent text-xs text-[#26181c] font-semibold flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopyReferralLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#e6007e] text-white hover:bg-[#c9006e] shadow-xs'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedLink ? 'check' : 'content_copy'}
              </span>
              {copiedLink ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-[#5a3f47]">
              <span>Code:</span>
              <span className="font-mono font-bold bg-[#f3e1e8] text-[#8e004b] px-2 py-0.5 rounded-md text-[12px]">
                {userReferralCode}
              </span>
            </div>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Nexora Salon Referral',
                    text: `Join me on Nexora Salon using my link ${referralLink} and get ₹300 off your first booking!`,
                    url: referralLink,
                  }).catch(() => {});
                } else {
                  handleCopyReferralLink();
                }
              }}
              className="text-xs font-bold text-[#8e004b] underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">share</span>
              Share Link
            </button>
          </div>
        </div>

        {/* Referral Stats & Friend Sign-up Simulation */}
        <div className="flex items-center justify-between bg-white/80 rounded-2xl p-3.5 border border-[#f3d3e2]">
          <div className="flex items-center gap-3">
            <div className="text-center border-r border-[#f0d0e0] pr-3">
              <div className="text-[18px] font-extrabold text-[#26181c]">
                {referralsList.length}
              </div>
              <div className="text-[10px] text-[#5a3f47] font-medium">Friends Joined</div>
            </div>
            <div>
              <div className="text-[18px] font-extrabold text-[#e6007e]">
                +{bonusReferralPoints} pts
              </div>
              <div className="text-[10px] text-[#5a3f47] font-medium">Earned Bonus</div>
            </div>
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 bg-[#e6007e] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#c9006e] transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Simulate Referral
          </button>
        </div>

        {/* Referrals List */}
        <div>
          <div className="text-[12px] font-bold text-[#26181c] mb-2 flex items-center justify-between">
            <span>Referral Activity ({referralsList.length})</span>
            <span className="text-[10px] text-[#8e004b] font-semibold">500 pts / signup</span>
          </div>

          <div className="space-y-2">
            {referralsList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-3 border border-[#f0d8e2] flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#fde7f3] text-[#e6007e] font-bold text-xs flex items-center justify-center border border-[#fcd5e8]">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#26181c]">{item.name}</div>
                    <div className="text-[10px] text-[#5a3f47]">
                      {item.date} • {item.status}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +{item.pointsEarned} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Comparison & Perks */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#26181c]">Loyalty Tiers & Benefits</h3>
          <span className="text-xs text-[#8e004b] font-bold">
            Current: {currentTier.name}
          </span>
        </div>

        {/* Tier Cards Grid / Accordion */}
        <div className="grid grid-cols-1 gap-3">
          {TIERS.map((tier) => {
            const isCurrent = currentTier.id === tier.id;
            const isUnlocked = totalBookingsCount >= tier.minBookings;
            const isSelected = selectedTierTab === tier.id || (selectedTierTab === null && isCurrent);

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTierTab(tier.id)}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                  isCurrent
                    ? 'border-[#e6007e] bg-[#fff5f8] shadow-md ring-1 ring-[#e6007e]/30'
                    : isUnlocked
                    ? 'border-[#f0d8e2] bg-white hover:border-[#e6007e]/40'
                    : 'border-[#eaeaea] bg-slate-50/70 opacity-90'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-[#e6007e] text-white shadow-sm'
                          : isUnlocked
                          ? 'bg-[#fde7f3] text-[#e6007e]'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {tier.icon}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[15px] font-bold text-[#26181c]">
                          {tier.name}
                        </h4>
                        {isCurrent && (
                          <span className="bg-[#e6007e] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#5a3f47] font-medium mt-0.5">
                        {tier.minBookings === 0
                          ? '0 - 2 Bookings'
                          : tier.maxBookings
                          ? `${tier.minBookings} - ${tier.maxBookings} Bookings`
                          : '10+ Bookings'}
                        {' • '}
                        <span className="font-bold text-[#8e004b]">{tier.multiplier}</span>
                      </p>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[20px] text-[#8c7077]">
                    {isSelected ? 'expand_less' : 'expand_more'}
                  </span>
                </div>

                {/* Expanded Perks */}
                {isSelected && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#f3e1e8] bg-white/60">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#8e004b] mb-2">
                      Tier Benefits & Privileges
                    </div>
                    <ul className="space-y-1.5">
                      {tier.perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#26181c] font-medium">
                          <span
                            className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                              isUnlocked ? 'text-[#e6007e]' : 'text-slate-400'
                            }`}
                          >
                            {isUnlocked ? 'check_circle' : 'lock'}
                          </span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Promo Vouchers & Active Coupons */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[17px] font-bold text-[#26181c]">Active Coupons & Offers</h3>

        <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#fde7f3] flex items-center justify-center text-[#e6007e] shrink-0">
              <span className="material-symbols-outlined text-[22px]">local_offer</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#e6007e] uppercase tracking-wider">
                Flash Sale
              </span>
              <h4 className="text-[14px] font-bold text-[#26181c]">30% Off Facials</h4>
              <p className="text-[11px] text-[#5a3f47]">Code: NEXORA30</p>
            </div>
          </div>
          <button
            onClick={() => handleCopyCode('NEXORA30')}
            className="px-3.5 py-1.5 rounded-xl bg-[#fde7f3] text-[#e6007e] text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            {copiedCode === 'NEXORA30' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#ffe8ed] flex items-center justify-center text-[#8e004b] shrink-0">
              <span className="material-symbols-outlined text-[22px]">card_giftcard</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8e004b] uppercase tracking-wider">
                First Visit
              </span>
              <h4 className="text-[14px] font-bold text-[#26181c]">Flat ₹500 Cashback</h4>
              <p className="text-[11px] text-[#5a3f47]">Code: FIRSTGLOW</p>
            </div>
          </div>
          <button
            onClick={() => handleCopyCode('FIRSTGLOW')}
            className="px-3.5 py-1.5 rounded-xl bg-[#fde7f3] text-[#e6007e] text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            {copiedCode === 'FIRSTGLOW' ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </section>

      {/* SIMULATE REFERRAL SIGNUP MODAL */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#f0d8e2]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e6007e] text-[24px]">person_add</span>
                <h3 className="text-[18px] font-bold text-[#26181c]">Simulate Friend Referral</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#5a3f47] mb-4">
              Test the referral flow! Enter a friend's name who signed up using link{' '}
              <span className="font-mono text-[#8e004b]">{userReferralCode}</span> to simulate a booking. Both of you will get +500 points!
            </p>

            <form onSubmit={handleSimulateFriendSignup} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#26181c] block mb-1">
                  Friend's Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Simrit Kapoor"
                  value={simulatedFriendName}
                  onChange={(e) => setSimulatedFriendName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#26181c] focus:outline-none focus:border-[#e6007e]"
                />
              </div>

              <div className="bg-[#fff0f3] p-3 rounded-xl border border-[#fcd5e8] flex items-center justify-between text-xs">
                <span className="text-[#5a3f47]">Referral Reward:</span>
                <span className="font-extrabold text-[#e6007e]">+500 Glow Points</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#e6007e] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#c9006e]"
                >
                  Complete Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redeem Points Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#f0d8e2]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e6007e] text-[24px]">stars</span>
                <h3 className="text-[18px] font-bold text-[#26181c]">Use Rewards</h3>
              </div>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#5a3f47] mb-4">
              You have <span className="font-bold text-[#e6007e]">{calculatedPoints} pts</span> available in your account. Choose a voucher to redeem instantly:
            </p>

            <div className="space-y-2.5 mb-5">
              {[
                { pts: 500, discount: 100, label: '₹100 Off Voucher' },
                { pts: 1000, discount: 250, label: '₹250 Off Voucher' },
                { pts: 2000, discount: 500, label: '₹500 Off Voucher' },
              ].map((opt) => {
                const canAfford = calculatedPoints >= opt.pts;
                return (
                  <button
                    key={opt.pts}
                    disabled={!canAfford}
                    onClick={() => {
                      setRedeemedDiscount(opt.discount);
                      setRedeemedPointsSpent((prev) => prev + opt.pts);
                      setShowRedeemModal(false);
                      triggerToast(`Redeemed ${opt.pts} pts for ${opt.label}!`);
                    }}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                      canAfford
                        ? 'border-[#e6007e]/30 bg-[#fff5f8] hover:bg-[#fde7f3] cursor-pointer'
                        : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#26181c]">{opt.label}</div>
                      <div className="text-[10px] text-[#5a3f47]">{opt.pts} points required</div>
                    </div>
                    <span className="text-xs font-bold text-[#e6007e] bg-white px-2.5 py-1 rounded-xl shadow-xs">
                      Redeem
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowRedeemModal(false)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
