// Shared salon category taxonomy + small pure helpers used by both the Home
// screen (category picker) and the Service Results screen (category chips +
// matching), so the two screens can never drift out of sync.

export interface CategoryOption {
  id: string;
  label: string;
  icon: string; // Material Symbols icon name
}

export const SERVICE_CATEGORIES: CategoryOption[] = [
  { id: 'All', label: 'All', icon: 'apps' },
  { id: 'Hair', label: 'Hair', icon: 'content_cut' },
  { id: 'Skin', label: 'Skin', icon: 'face_6' },
  { id: 'Nails', label: 'Nails', icon: 'back_hand' },
  { id: 'Spa', label: 'Spa', icon: 'spa' },
  { id: 'Makeup', label: 'Makeup', icon: 'brush' },
  { id: 'Barber Shop', label: 'Barber Shop', icon: 'face' },
  { id: 'Beauty', label: 'Beauty', icon: 'auto_awesome' },
  { id: 'Massage & Wellness', label: 'Massage & Wellness', icon: 'self_improvement' },
  { id: 'Tattoo & Piercing', label: 'Tattoo & Piercing', icon: 'draw' },
];

export const CATEGORY_MAPPING: Record<string, string[]> = {
  'Hair': ['Hair Salon', 'Hair Stylist', 'Hair Spa', 'Hair Color', 'Hair Cutting'],
  'Skin': ['Facial Clinic', 'Skincare Studio', 'Dermatology', 'Facial Spa'],
  'Nails': ['Nail Salon', 'Nail Art', 'Manicure', 'Pedicure'],
  'Spa': ['Luxury Spa', 'Wellness Spa', 'Steam', 'Sauna', 'Relaxation Center'],
  'Makeup': ['Bridal Makeup', 'Party Makeup', 'Professional Makeup Artist'],
  'Barber Shop': ["Men's Haircut", 'Beard Styling', 'Shaving', 'Grooming'],
  'Beauty': ['Beauty Parlour', 'Beauty Salon', 'Threading', 'Waxing', 'Eyebrows', 'Bleach'],
  'Massage & Wellness': ['Body Massage', 'Deep Tissue Massage', 'Thai Massage', 'Ayurvedic Massage', 'Wellness Center'],
  'Tattoo & Piercing': ['Tattoo Studio', 'Tattoo Artist', 'Piercing Studio', 'Body Art'],
};

// Parses a salon's real "hours" string (e.g. "9:00 AM – 8:00 PM") and checks
// whether the current local time falls within it. No hardcoded open/closed
// state — this is derived purely from the salon's own opening hours data.
export function isSalonOpenNow(hours?: string): boolean {
  if (!hours) return false;
  const parseHour = (text: string): number | null => {
    const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(text || '');
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + parseInt(m[2] || '0', 10);
  };
  const parts = hours.split(/[–-]/);
  const opens = parseHour(parts[0] || '');
  const closes = parseHour(parts[1] || '');
  if (opens === null || closes === null) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= opens && nowMins <= closes;
}

/** True if the given salon plausibly offers the given category, using name/
 * tags/services/type/category fields plus the CATEGORY_MAPPING keyword list. */
export function salonMatchesCategory(
  salon: { type?: string; category?: string; tags?: string[]; services?: { category: string }[]; name?: string },
  categoryId: string,
): boolean {
  if (categoryId === 'All') return true;
  const keywords = CATEGORY_MAPPING[categoryId] || [categoryId];
  return keywords.some((keyword) => {
    const k = keyword.toLowerCase();
    return (
      (salon.type && salon.type.toLowerCase().includes(k)) ||
      (salon.category && salon.category.toLowerCase().includes(k)) ||
      (salon.tags && salon.tags.some((t) => t.toLowerCase().includes(k))) ||
      (salon.services && salon.services.some((s) => s.category.toLowerCase().includes(k))) ||
      (salon.name && salon.name.toLowerCase().includes(k))
    );
  });
}
