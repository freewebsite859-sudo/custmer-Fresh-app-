export type Screen = 
  | 'splash' 
  | 'welcome' 
  | 'home' 
  | 'search' 
  | 'salon-detail' 
  | 'checkout' 
  | 'bookings' 
  | 'favourites'
  | 'location-modal' 
  | 'location-permission'
  | 'popular-cities'
  | 'rewards' 
  | 'profile'
  | 'saved-addresses'
  | 'support'
  | 'settings'
  | 'owner-dashboard'
  | 'gp-dashboard'
  | 'terms'
  | 'privacy'
  | 'cancellation';

export type UserRole = 'customer' | 'business_user' | 'growth_partner';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  platform_role: UserRole;
  is_active: boolean;
  dob: string | null;
  gender: string | null;
  preferred_city: string | null;
  preferred_area: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'PAST' | 'COMPLETED' | 'CANCELLED' | 'payment_pending';

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category: string;
  description?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewsCount: number;
  avatar: string;
}

export interface Salon {
  id: string;
  name: string;
  type?: string;
  category?: string;
  area: string;
  city: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  reviewsCount: number;
  verified: boolean;
  isNew?: boolean;
  image: string;
  gallery: string[];
  startingPrice: number;
  tags: string[];
  genderCategory?: 'Unisex' | 'Women Only' | 'Men Only';
  address: string;
  hours: string;
  description: string;
  phone?: string;
  bookingUrl?: string;
  amenities?: string[];
  offers?: Array<{
    id: string;
    title: string;
    code: string;
    discountPercent?: number;
    amountOff?: number;
  }>;
  services: Service[];
  staff: Staff[];
  weeklyCollection?: number;
  monthlyCollection?: number;
  completedBookings?: number;
  verifiedReviewsCount?: number;
  lastActiveTime?: number;
}

export interface Booking {
  id: string;
  salonId: string;
  salonName: string;
  services: Service[];
  totalAmount: number;
  dateStr: string; // e.g. "Sat, 28 Jul"
  timeSlot: string; // e.g. "11:00 AM"
  status: BookingStatus;
  staffName?: string;
  locationArea: string;
  createdTime: number;
  isReviewed?: boolean;
}

export interface UserLocation {
  city: string;
  area: string;
  address?: string;
  isGPS: boolean;
}

export interface Address {
  id: string;
  label: string;
  flatNumber: string;
  street: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface LoyaltyTier {
  id: 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  minBookings: number;
  maxBookings: number | null;
  multiplier: string;
  icon: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  perks: string[];
}

export interface AppNotification {
  id: string;
  bookingId: string;
  salonName: string;
  timeSlot: string;
  dateStr: string;
  servicesSummary: string;
  timestamp: number;
  read: boolean;
  type: 'reminder_1h' | 'booking_confirmed' | 'general';
  message: string;
}

export interface ServiceReview {
  id: string;
  salonId: string;
  serviceId?: string;
  serviceName: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verifiedBooking?: boolean;
}

export interface WaitlistEntry {
  id: string;
  salonId: string;
  salonName: string;
  serviceNames: string[];
  dateStr: string;
  timeSlot: string;
  clientName: string;
  clientPhone: string;
  notificationPreference: 'sms' | 'push' | 'both';
  createdAt: number;
  position: number;
  status: 'ACTIVE' | 'NOTIFIED' | 'EXPIRED' | 'CANCELLED';
}

export interface ReferralFriend {
  id: string;
  name: string;
  status: 'Completed' | 'Pending First Booking';
  pointsEarned: number;
  date: string;
}

export interface SavedProfessional {
  id: string;
  salonId: string;
  name: string;
  role: string;
  rating: number;
  avatar: string;
  salonName: string;
  skills: string[];
}

export interface SavedService {
  id: string;
  salonId: string;
  name: string;
  durationMinutes: number;
  price: number;
  salonName: string;
  category: string;
}

