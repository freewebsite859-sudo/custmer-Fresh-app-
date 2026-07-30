import { Booking, UserLocation } from '../types';

export const LOGO_URL = '/src/assets/images/nexora_logo_luxury_1785236781115.jpg';
export const LOGO_SQUARE = '/src/assets/images/nexora_logo_luxury_1785236781115.jpg';
export const AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOG1KE6QycrqAoi7dvqGoKSboLCppWbW1iEIxfa-y3Kt9PqLCrLFbTlN81KwatwAqsjiP6pC5EuRgNifKMXn1jJAUtJmQ-OOnG2guAwtwASOf_UxNibUixlHs1-s_VNPq8I1Z01uqo7WtWFJW-AlR3Ev8MP7fqPsta3lByjgM0pUznoxoZ2wbsAu4nP1nMxUIMX-nkMAHauG1IaOLN7F1OVYtFUWyN_ii8Tg0neCdN1V-w_AlDNuC-zn5yePu84wt5QkuDxg4sjhM';
export const BANNER_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCn991u77TB1QyV1AdBOSD9Jub7f5x5unJ3YPA0BDgK3swZsZaLvaxP0ik4sGEXA7VftRQ0xH3pJa7JDlVtvEh0JM8d0DoCeAntUDfq8A2cY6hsssagHPGnI2grUSeAkB_iz_XM8HD4V9jad5jWs8vrm-0cQH4LPFfUKr0UGMUrs9ugln2A-o6bjCycqKyGC-a1w5q2FFt7GX_oMNAsUVXo4zV1SqldpGwYNedjEs3yZy84q1pDL_cWc56gd0Xb_U-UFmWot0yH4qw';
export const LOCATION_PIN_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtvEyTkpLk9SfuFRowvBqe-LhfEaeJ4EN4EXFd2Jc4epPo3YNlLbrCphpf9KpbhCEo0tsRiMt2-1LeI-aXpINydWYomtYhZ_s1zEU4_AGYyiqCtk1zJvASOlrf7CbLPbRWNym2I7xXzeM-w6pIL5VEEhVwlX95f-PcuCRpVNHVCvvHXsG52VAnkK095w5oeD5Wo9ZB4e5GUZLI5RJBDKOLyEmXcddMzaB4lS4EpnFyKDwgDmALTaggwDYycO1gyubVkSMblxtSVxU';
export const WELCOME_BG_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGlC0y_Xz7ws9fBk2enobNYh_8MeOC3_im9Vw1YDOlIopdHcUPp2vnWjDM9eJQVHfp81c_JtHXfmlRhS-QG1F2I5kvPJzHrcpVvurCwHS2KkFxHWBSSRgkYpdI47_fPMvqmFv75zYI3NQFSsYIcdc6dCZ8-7lBaTl4or6AswOuZ4_rBqfdADrYNchiUpNjt9KAZSdAcZrJjDAxo9Rv8hz2NouIh23-guUR9ZMazmHiio7YoqW-Gd_gEAcOcNW8ThyembA8056Yr2k';

export const INITIAL_LOCATION: UserLocation = {
  city: 'Mumbai',
  area: 'Indiranagar, Bangalore',
  isGPS: true,
};

export const POPULAR_CITIES = [
  'Jaipur',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Pune',
  'Ahmedabad',
];

export const RECENT_LOCATIONS = [
  { area: 'Malviya Nagar', cityState: 'Jaipur, Rajasthan' },
  { area: 'Bandra West', cityState: 'Mumbai, Maharashtra' },
  { area: 'Koramangala', cityState: 'Bengaluru, Karnataka' },
];


export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-99',
    salonId: 'aura-premium',
    salonName: 'Aura Premium Salon',
    services: [
      { id: 'a1', name: "Woman's Haircut & Blowdry", durationMinutes: 45, price: 899, category: 'Hair Styling' },
    ],
    totalAmount: 899,
    dateStr: 'Sun, 21 Jul',
    timeSlot: '03:00 PM',
    status: 'COMPLETED',
    staffName: 'Maya S.',
    locationArea: 'Indiranagar, Bangalore',
    createdTime: Date.now() - 345600000,
    isReviewed: false,
  },
  {
    id: 'bk-101',
    salonId: 'aura-premium',
    salonName: 'Aura Premium Salon',
    services: [
      { id: 'a2', name: 'Balayage & Styling', durationMinutes: 120, price: 3499, category: 'Hair Styling' },
    ],
    totalAmount: 3499,
    dateStr: 'Sat, 28 Jul',
    timeSlot: '11:00 AM',
    status: 'CONFIRMED',
    staffName: 'Maya S.',
    locationArea: 'Indiranagar, Bangalore',
    createdTime: Date.now() - 86400000,
  },
  {
    id: 'bk-102',
    salonId: 'lumiere-studio',
    salonName: 'Lumiere Studio',
    services: [
      { id: 'l2', name: 'Classic Manicure', durationMinutes: 30, price: 650, category: 'Nails' },
    ],
    totalAmount: 650,
    dateStr: 'Tue, 15 Aug',
    timeSlot: '2:30 PM',
    status: 'PENDING',
    staffName: 'Zara M.',
    locationArea: 'Bandra West, Mumbai',
    createdTime: Date.now() - 43200000,
  },
];
