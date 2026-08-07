/**
 * LocationSelectionModal — lets the user manually pick from 100+ Jaipur
 * localities. Selecting an area sets a manual CurrentLocation (with
 * approximate coordinates) so Nearby Salons can still be Haversine-sorted
 * even when GPS is unavailable.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JAIPUR_LOCALITIES, JAIPUR_LOCALITY_NAMES } from '../data/jaipurLocalities';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentArea?: string;
  onSelectLocality: (localityName: string, coords: { lat: number; lng: number }) => void;
  onDetectGPS?: () => void;
  isDetectingGPS?: boolean;
}

export const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({
  isOpen,
  onClose,
  currentArea,
  onSelectLocality,
  onDetectGPS,
  isDetectingGPS = false,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const zones = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? JAIPUR_LOCALITIES.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            (l.zone || '').toLowerCase().includes(q),
        )
      : JAIPUR_LOCALITIES;

    // Group by zone
    const grouped = new Map<string, typeof JAIPUR_LOCALITIES>();
    for (const loc of filtered) {
      const zone = loc.zone || 'Other';
      const list = grouped.get(zone) || [];
      list.push(loc);
      grouped.set(zone, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [query]);

  const popularNames = ['Vaishali Nagar', 'Malviya Nagar', 'C-Scheme', 'Mansarovar', 'Raja Park', 'Jagatpura'];
  const popular = popularNames
    .map((n) => JAIPUR_LOCALITIES.find((l) => l.name === n))
    .filter((l): l is (typeof JAIPUR_LOCALITIES)[number] => Boolean(l));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        >
          <div className="absolute inset-0 bg-transparent" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl flex flex-col relative max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#f0d8e2]">
              <div>
                <h3 className="text-[18px] font-bold text-[#26181c]">Select your location</h3>
                <p className="text-[11px] text-[#8c7077] mt-0.5">
                  {JAIPUR_LOCALITY_NAMES.length}+ Jaipur localities
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#fcf9f8] flex items-center justify-center text-[#8c7077] hover:text-[#e6007e] hover:bg-[#fde7f3] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* GPS detect button */}
            {onDetectGPS && (
              <div className="px-4 pt-3">
                <button
                  onClick={onDetectGPS}
                  disabled={isDetectingGPS}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#fff0f2] border border-[#fcd5e8] hover:bg-[#fde7f3] transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span
                    className={`w-9 h-9 rounded-full bg-[#e6007e] text-white flex items-center justify-center ${
                      isDetectingGPS ? 'animate-pulse' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">my_location</span>
                  </span>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[13px] font-bold text-[#26181c]">
                      {isDetectingGPS ? 'Detecting your location...' : 'Detect my current location'}
                    </span>
                    <span className="text-[11px] text-[#8c7077]">
                      Use GPS & Google Geocoding for accurate results
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[#e6007e] ml-auto">
                    chevron_right
                  </span>
                </button>
              </div>
            )}

            {/* Search */}
            <div className="px-4 pt-3">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px] text-[#8c7077]">search</span>
                </span>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your area (e.g. Vaishali Nagar)"
                  className="w-full h-12 pl-10 pr-10 bg-[#fcf9f8] text-[14px] text-[#26181c] placeholder:text-[#b89aa3] outline-none border border-[#f0d8e2] focus:border-[#e6007e] rounded-2xl"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute inset-y-0 right-2 flex items-center text-[#8c7077] hover:text-[#e6007e] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 pt-3">
              {!query && popular.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[12px] font-bold text-[#8c7077] uppercase tracking-wide mb-2">
                    Popular
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {popular.map((loc) => (
                      <LocalityChip
                        key={`pop-${loc.name}`}
                        name={loc.name}
                        active={currentArea === loc.name}
                        onClick={() => onSelectLocality(loc.name, { lat: loc.lat, lng: loc.lng })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {zones.length === 0 && (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-[32px] text-[#e0bec6]">
                    location_off
                  </span>
                  <p className="text-[13px] font-semibold text-[#8c7077] mt-2">
                    No localities match "{query}"
                  </p>
                </div>
              )}

              {zones.map(([zone, list]) => (
                <div key={zone} className="mb-4">
                  <h4 className="text-[11px] font-bold text-[#b89aa3] uppercase tracking-wide mb-1.5 px-1">
                    {zone}
                  </h4>
                  <div className="flex flex-col">
                    {list.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => onSelectLocality(loc.name, { lat: loc.lat, lng: loc.lng })}
                        className={`flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          currentArea === loc.name
                            ? 'bg-[#fff0f2]'
                            : 'hover:bg-[#fcf5f8]'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            currentArea === loc.name ? 'text-[#e6007e]' : 'text-[#b89aa3]'
                          }`}
                        >
                          location_on
                        </span>
                        <span
                          className={`text-[14px] flex-1 ${
                            currentArea === loc.name
                              ? 'font-bold text-[#e6007e]'
                              : 'font-medium text-[#26181c]'
                          }`}
                        >
                          {loc.name}
                        </span>
                        {currentArea === loc.name && (
                          <span className="material-symbols-outlined text-[18px] text-[#e6007e]">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LocalityChip: React.FC<{ name: string; active?: boolean; onClick: () => void }> = ({
  name,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
      active
        ? 'bg-[#e6007e] text-white shadow-md'
        : 'bg-[#fff0f2] text-[#5a3f47] border border-[#fcd5e8] hover:border-[#e6007e]/40'
    }`}
  >
    {name}
  </button>
);

export default LocationSelectionModal;
