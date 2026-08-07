/**
 * SalonSorter — Sorts and groups salons per spec
 * Priority: Nearest Distance → Highest Rating → Featured Status → Recently Active
 * Groups: Nearby 0-2km, Close 2-5km, Around You 5-10km, Everything Else
 */
import { Salon } from '../../types';

export interface SortedSalon extends Salon {
  computedDistanceM: number;
  computedDistanceKm: number;
}

export interface GroupedSalons {
  nearby: SortedSalon[];      // 0-2 km
  close: SortedSalon[];       // 2-5 km
  aroundYou: SortedSalon[];   // 5-10 km
  everythingElse: SortedSalon[]; // >10 km
  allSorted: SortedSalon[];
}

export function sortSalons(salons: SortedSalon[]): SortedSalon[] {
  return [...salons].sort((a, b) => {
    // 1. Nearest distance
    if (a.computedDistanceM !== b.computedDistanceM) return a.computedDistanceM - b.computedDistanceM;
    // 2. Highest rating
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    // 3. Featured (verified + has offers)
    const aFeat = a.verified && (a.offers?.length ?? 0) > 0 ? 0 : 1;
    const bFeat = b.verified && (b.offers?.length ?? 0) > 0 ? 0 : 1;
    if (aFeat !== bFeat) return aFeat - bFeat;
    // 4. Recently active
    const aActive = a.lastActiveTime ?? 0;
    const bActive = b.lastActiveTime ?? 0;
    return bActive - aActive;
  });
}

export function groupSalons(sorted: SortedSalon[]): GroupedSalons {
  const nearby: SortedSalon[] = [];
  const close: SortedSalon[] = [];
  const aroundYou: SortedSalon[] = [];
  const everythingElse: SortedSalon[] = [];
  for (const s of sorted) {
    const km = s.computedDistanceKm;
    if (km <= 2) nearby.push(s);
    else if (km <= 5) close.push(s);
    else if (km <= 10) aroundYou.push(s);
    else everythingElse.push(s);
  }
  return { nearby, close, aroundYou, everythingElse, allSorted: sorted };
}

export const SalonSorter = { sortSalons, groupSalons };
export default SalonSorter;
