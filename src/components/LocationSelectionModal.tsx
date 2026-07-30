import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserLocation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { JAIPUR_LOCATIONS, JAIPUR_ZONES } from '../data/locations';
import {
  LOCATION_PIN_URL,
  LOGO_SQUARE,
} from '../data/mockData';

interface LocationSelectionModalProps {
  currentLocation: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
  onClose: () => void;
}

export const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({
  currentLocation,
  onSelectLocation,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'permission' | 'picker'>('permission');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [zoneSearch, setZoneSearch] = useState<string>('');
  const [areaSearch, setAreaSearch] = useState<string>('');
  const [isZoneOpen, setIsZoneOpen] = useState<boolean>(false);
  const [isAreaOpen, setIsAreaOpen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showDeniedModal, setShowDeniedModal] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const zoneRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const isValid = selectedZone && selectedArea;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(event.target as Node)) {
        setIsZoneOpen(false);
      }
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setIsAreaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUseGPS = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      const gpsLocation: UserLocation = {
        city: 'Jaipur',
        area: 'Mansarovar',
        address: 'Current Location via GPS',
        isGPS: true,
      };
      onSelectLocation(gpsLocation);
    }, 1200);
  };

  const handleConfirmLocation = () => {
    setHasInteracted(true);
    if (!isValid) return;
    
    onSelectLocation({
      city: 'Jaipur',
      area: `${selectedZone} > ${selectedArea}`,
      isGPS: false,
    });
  };

  const filteredZones = useMemo(() => 
    JAIPUR_ZONES.filter(z => z.toLowerCase().includes(zoneSearch.toLowerCase())),
    [zoneSearch]
  );

  const filteredAreas = useMemo(() => {
    if (!selectedZone) return [];
    return (JAIPUR_LOCATIONS[selectedZone] || []).filter(a => 
      a.toLowerCase().includes(areaSearch.toLowerCase())
    );
  }, [selectedZone, areaSearch]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col max-w-md mx-auto overflow-y-auto animate-in fade-in">
      {/* Fixed Navigation Header */}
      <header className="fixed top-0 inset-x-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-[#e8e8e8]/50 pt-safe max-w-md mx-auto">
        <div className="h-16 px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 -ml-2 flex items-center justify-center text-[#e6007e] transition-transform active:scale-95"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
            </button>
            <img src={LOGO_SQUARE} alt="Logo" className="h-9 w-9 object-contain" />
            <span className="text-[18px] font-bold text-[#26181c] truncate">
              Location Selection
            </span>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-28 px-5 flex-1 flex flex-col">
        {viewMode === 'permission' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
            {/* Pulsing Pin Graphic */}
            <div className="relative w-[200px] h-[200px] mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#e6007e]/10 rounded-full animate-ping opacity-40" />
              <div className="absolute inset-4 bg-[#e6007e]/20 rounded-full animate-pulse opacity-50" />
              <img
                src={LOCATION_PIN_URL}
                alt="Location Pin"
                className="relative z-10 w-full h-full object-contain drop-shadow-xl"
              />
            </div>

            <h2 className="text-[24px] font-bold text-[#26181c] mb-2">Find salons near you</h2>
            <p className="text-[15px] text-[#5a3f47] max-w-[280px] leading-relaxed mb-8">
              Allow location access to see nearby premium salons and available slots tailored to you.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleUseGPS}
                disabled={isLocating}
                className="w-full h-[52px] bg-[#e6007e] text-white font-semibold text-[15px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#e6007e]/20 active:scale-95 transition-all"
              >
                {isLocating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    Locating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">my_location</span>
                    Use My Current Location
                  </>
                )}
              </button>

              <button
                onClick={() => setViewMode('picker')}
                className="w-full h-[52px] bg-[#fde7f3] text-[#e6007e] font-semibold text-[15px] rounded-2xl flex items-center justify-center active:scale-95 transition-all"
              >
                Select Location Manually
              </button>
            </div>

            <p className="text-[12px] text-[#8c7077] mt-6 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Your location is only used to show nearby salons.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in">
            {/* Location Selection Header */}
            <div className="flex flex-col gap-1">
              <h3 className="text-[20px] font-bold text-[#26181c]">Jaipur Location Selection</h3>
              <p className="text-[13px] text-[#5a3f47]">Select your zone and area for localized results</p>
            </div>

            {/* Selected Value Preview */}
            <div className="bg-[#fff0f2] rounded-2xl p-4 flex items-center gap-3 border border-[#fde7f3] shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#ffd9e2] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#8e004b] text-[20px]">map</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-bold text-[#e6007e] uppercase tracking-wider">Current Selection</span>
                <span className="text-[15px] font-bold text-[#26181c] truncate">
                  {selectedZone ? (selectedArea ? `${selectedZone} > ${selectedArea}` : `${selectedZone} > ...`) : 'Select Location'}
                </span>
              </div>
            </div>

            {/* Dropdowns Container */}
            <div className="flex flex-col gap-4">
              {/* Zone Dropdown */}
              <div className="flex flex-col gap-2" ref={zoneRef}>
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-bold text-[#26181c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#e6007e]">location_city</span>
                    Select Zone <span className="text-rose-500">*</span>
                  </h4>
                  {hasInteracted && !selectedZone && (
                    <span className="text-[11px] font-bold text-rose-500 animate-in fade-in slide-in-from-right-2">Zone is required</span>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsZoneOpen(!isZoneOpen);
                      setHasInteracted(true);
                    }}
                    className={`w-full h-14 px-4 bg-white border ${
                      isZoneOpen 
                        ? 'border-[#e6007e] ring-2 ring-[#e6007e]/10' 
                        : hasInteracted && !selectedZone 
                          ? 'border-rose-300 bg-rose-50/30' 
                          : 'border-[#e8e8e8]'
                    } rounded-2xl flex items-center justify-between transition-all`}
                  >
                    <span className={`text-[15px] ${selectedZone ? 'text-[#26181c] font-semibold' : 'text-[#8c7077]'}`}>
                      {selectedZone || 'Select Zone'}
                    </span>
                    <span className={`material-symbols-outlined text-[#e6007e] transition-transform duration-300 ${isZoneOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  <AnimatePresence>
                    {isZoneOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e8e8] rounded-2xl shadow-xl z-[110] overflow-hidden flex flex-col"
                      >
                        <div className="p-2 border-b border-[#f3f4f6]">
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8c7077] text-[18px]">search</span>
                            <input
                              type="text"
                              value={zoneSearch}
                              onChange={(e) => setZoneSearch(e.target.value)}
                              placeholder="Search zone..."
                              className="w-full h-10 pl-9 pr-4 bg-[#fcf9f8] text-[14px] rounded-xl outline-none"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredZones.map(zone => (
                            <button
                              key={zone}
                              onClick={() => {
                                setSelectedZone(zone);
                                setSelectedArea('');
                                setAreaSearch('');
                                setIsZoneOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-[14px] hover:bg-[#fff0f2] transition-colors flex items-center justify-between ${selectedZone === zone ? 'text-[#e6007e] font-bold bg-[#fff0f2]' : 'text-[#26181c]'}`}
                            >
                              {zone}
                              {selectedZone === zone && (
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              )}
                            </button>
                          ))}
                          {filteredZones.length === 0 && (
                            <div className="p-4 text-center text-[#8c7077] text-[13px]">No zones found</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Area Dropdown */}
              <div className="flex flex-col gap-2" ref={areaRef}>
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-bold text-[#26181c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#e6007e]">pin_drop</span>
                    Select Area <span className="text-rose-500">*</span>
                  </h4>
                  {hasInteracted && selectedZone && !selectedArea && (
                    <span className="text-[11px] font-bold text-rose-500 animate-in fade-in slide-in-from-right-2">Area is required</span>
                  )}
                </div>
                <div className="relative">
                  <button
                    disabled={!selectedZone}
                    onClick={() => {
                      setIsAreaOpen(!isAreaOpen);
                      setHasInteracted(true);
                    }}
                    className={`w-full h-14 px-4 border rounded-2xl flex items-center justify-between transition-all ${
                      !selectedZone 
                        ? 'bg-[#fcfcfc] border-[#f3f3f3] opacity-60' 
                        : isAreaOpen 
                          ? 'bg-white border-[#e6007e] ring-2 ring-[#e6007e]/10' 
                          : hasInteracted && !selectedArea
                            ? 'border-rose-300 bg-rose-50/30'
                            : 'border-[#e8e8e8]'
                    }`}
                  >
                    <span className={`text-[15px] ${selectedArea ? 'text-[#26181c] font-semibold' : 'text-[#8c7077]'}`}>
                      {selectedArea || 'Select Area'}
                    </span>
                    <span className={`material-symbols-outlined text-[#e6007e] transition-transform duration-300 ${isAreaOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  <AnimatePresence>
                    {isAreaOpen && selectedZone && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e8e8] rounded-2xl shadow-xl z-[110] overflow-hidden flex flex-col"
                      >
                        <div className="p-2 border-b border-[#f3f4f6]">
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8c7077] text-[18px]">search</span>
                            <input
                              type="text"
                              value={areaSearch}
                              onChange={(e) => setAreaSearch(e.target.value)}
                              placeholder={`Search area in ${selectedZone}...`}
                              className="w-full h-10 pl-9 pr-4 bg-[#fcf9f8] text-[14px] rounded-xl outline-none"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto">
                          {filteredAreas.map(area => (
                            <button
                              key={area}
                              onClick={() => {
                                setSelectedArea(area);
                                setIsAreaOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-[14px] hover:bg-[#fff0f2] transition-colors flex items-center justify-between ${selectedArea === area ? 'text-[#e6007e] font-bold bg-[#fff0f2]' : 'text-[#26181c]'}`}
                            >
                              {area}
                              {selectedArea === area && (
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              )}
                            </button>
                          ))}
                          {filteredAreas.length === 0 && (
                            <div className="p-4 text-center text-[#8c7077] text-[13px]">No areas found</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Quick GPS Alternative */}
            <div className="mt-4 p-4 rounded-2xl border border-dashed border-[#e8e8e8] bg-[#fcf9f8]">
              <button
                onClick={handleUseGPS}
                className="w-full flex items-center justify-center gap-2 text-[14px] font-bold text-[#e6007e] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">my_location</span>
                Or use Current Location via GPS
              </button>
            </div>

            {/* Bottom Sticky Action */}
            <div className="fixed bottom-0 left-0 right-0 pt-5 pb-8 p-5 bg-white/95 backdrop-blur-3xl border-t border-[#e8e8e8] pb-safe z-40 max-w-md mx-auto shadow-[0_-8px_30px_rgba(0,0,0,0.08)] mb-safe">
              <AnimatePresence>
                {hasInteracted && !isValid && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-center text-[12px] font-bold text-rose-500 mb-3"
                  >
                    Please select both Zone and Area to continue
                  </motion.p>
                )}
              </AnimatePresence>
              <button
                onClick={handleConfirmLocation}
                className={`w-full h-[52px] ${!isValid ? 'bg-[#fff0f2] text-[#e6007e] border border-[#fde7f3]' : 'bg-[#e6007e] text-white shadow-lg shadow-[#e6007e]/20'} text-[15px] font-semibold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2`}
              >
                Confirm Location
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Permission Denied Modal Simulation */}
      {showDeniedModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 max-w-[320px] shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">location_disabled</span>
            </div>
            <h3 className="text-base font-bold text-[#26181c] mb-1">Location Access Denied</h3>
            <p className="text-xs text-[#5a3f47] mb-5">
              Please enable location permissions in browser settings to auto-detect nearby salons.
            </p>
            <button
              onClick={() => {
                setShowDeniedModal(false);
                setViewMode('picker');
              }}
              className="w-full h-11 bg-[#e6007e] text-white font-bold text-xs rounded-xl mb-2"
            >
              Select Manually
            </button>
            <button
              onClick={() => setShowDeniedModal(false)}
              className="py-1 text-xs text-[#8c7077]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
