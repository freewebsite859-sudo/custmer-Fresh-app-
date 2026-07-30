import React, { useState, useEffect } from 'react';
import { Salon, Screen, SavedProfessional, SavedService } from '../types';

interface FavoritesScreenProps {
  salons: Salon[];
  favorites: string[];
  favoriteProfessionals: SavedProfessional[];
  favoriteServices: SavedService[];
  onToggleFavoriteSalon: (salonId: string) => void;
  onToggleFavoriteProfessional: (proId: string) => void;
  onToggleFavoriteService: (serviceId: string) => void;
  onSelectSalon: (salon: Salon) => void;
  onNavigate: (screen: Screen) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  salons,
  favorites,
  favoriteProfessionals,
  favoriteServices,
  onToggleFavoriteSalon,
  onToggleFavoriteProfessional,
  onToggleFavoriteService,
  onSelectSalon,
  onNavigate,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState<'salons' | 'professionals' | 'services'>('salons');

  // Snackbar state for Undo
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    undoData?: {
      type: 'salon' | 'professional' | 'service';
      item: Salon | SavedProfessional | SavedService;
    };
  }>({
    visible: false,
    message: '',
  });

  const savedSalons = salons.filter((s) => favorites.includes(s.id));

  const handleRemoveSalon = (salon: Salon) => {
    onToggleFavoriteSalon(salon.id);
    setSnackbar({
      visible: true,
      message: `Removed ${salon.name} from Favourites`,
      undoData: { type: 'salon', item: salon },
    });
    setTimeout(() => {
      setSnackbar((prev) => (prev.undoData?.item.id === salon.id ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  const handleRemoveProfessional = (pro: SavedProfessional) => {
    onToggleFavoriteProfessional(pro.id);
    setSnackbar({
      visible: true,
      message: `Removed ${pro.name} from Favourites`,
      undoData: { type: 'professional', item: pro },
    });
    setTimeout(() => {
      setSnackbar((prev) => (prev.undoData?.item.id === pro.id ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  const handleRemoveService = (service: SavedService) => {
    onToggleFavoriteService(service.id);
    setSnackbar({
      visible: true,
      message: `Removed ${service.name} from Favourites`,
      undoData: { type: 'service', item: service },
    });
    setTimeout(() => {
      setSnackbar((prev) => (prev.undoData?.item.id === service.id ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  const handleUndo = () => {
    if (!snackbar.undoData) return;
    const { type, item } = snackbar.undoData;
    if (type === 'salon') {
      onToggleFavoriteSalon(item.id);
    } else if (type === 'professional') {
      onToggleFavoriteProfessional(item.id);
    } else if (type === 'service') {
      onToggleFavoriteService(item.id);
    }
    setSnackbar({ visible: false, message: '' });
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-40 pt-2 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full bg-[#fde7f3]/60 hover:bg-[#fde7f3] flex items-center justify-center text-[#26181c] transition-colors active:scale-95"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-[22px] font-bold text-[#26181c] tracking-tight">Favourites</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#f6dce2]/40 p-1 rounded-2xl mb-6 border border-[#f0d8e2]">
        <button
          onClick={() => setActiveTab('salons')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'salons'
              ? 'bg-[#e6007e] text-white shadow-sm'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Salons ({savedSalons.length})
        </button>
        <button
          onClick={() => setActiveTab('professionals')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'professionals'
              ? 'bg-[#e6007e] text-white shadow-sm'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Professionals ({favoriteProfessionals.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'services'
              ? 'bg-[#e6007e] text-white shadow-sm'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Services ({favoriteServices.length})
        </button>
      </div>

      {/* Salons Tab */}
      {activeTab === 'salons' && (
        <div className="flex flex-col gap-4">
          {savedSalons.length > 0 ? (
            savedSalons.map((salon) => (
              <div
                key={salon.id}
                className="bg-white rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#e8e8e8] flex flex-col gap-3 relative group"
              >
                <div className="relative w-full h-[160px] rounded-2xl overflow-hidden bg-[#e5e2e1]">
                  <img
                    src={salon.image}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  
                  {/* Heart button */}
                  <button
                    onClick={() => handleRemoveSalon(salon)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#e6007e] shadow-md transition-transform active:scale-95"
                    aria-label="Remove from Favourites"
                  >
                    <span className="material-symbols-outlined text-[20px] fill-current">favorite</span>
                  </button>

                  {/* Rating Badge */}
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-amber-500 fill-current">star</span>
                    <span className="text-[12px] font-bold text-[#26181c]">{salon.rating}</span>
                    <span className="text-[11px] text-[#5a3f47]">({salon.reviewCount || 128})</span>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-[17px] font-bold text-[#26181c]">{salon.name}</h3>
                    {salon.verified && (
                      <span className="material-symbols-outlined text-[16px] text-[#0353db]" title="Verified Salon">
                        verified
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#5a3f47] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#8c7077]">location_on</span>
                    {salon.area} • {salon.distanceKm} km away
                  </p>
                </div>

                {/* Details row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e8]/60 text-[12px]">
                  <div>
                    <span className="text-[#8c7077]">Starting at</span>
                    <p className="font-bold text-[#26181c]">₹{salon.startingPrice}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[#8c7077]">Next slot</span>
                    <p className="font-bold text-emerald-600">Today, 04:30 PM</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onSelectSalon(salon)}
                    className="h-11 bg-[#ffe8ed] text-[#e6007e] rounded-xl font-bold text-[13px] hover:bg-[#fde7f3] transition-colors active:scale-[0.98]"
                  >
                    View Shop
                  </button>
                  <button
                    onClick={() => {
                      onSelectSalon(salon);
                      onNavigate('salon-detail');
                    }}
                    className="h-11 bg-[#e6007e] text-white rounded-xl font-bold text-[13px] hover:bg-[#b90064] transition-colors shadow-sm shadow-[#e6007e]/25 active:scale-[0.98]"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            renderEmptyState('salons', onNavigate)
          )}
        </div>
      )}

      {/* Professionals Tab */}
      {activeTab === 'professionals' && (
        <div className="flex flex-col gap-4">
          {favoriteProfessionals.length > 0 ? (
            favoriteProfessionals.map((pro) => {
              const salonObj = salons.find((s) => s.id === pro.salonId) || salons[0];
              return (
                <div
                  key={pro.id}
                  className="bg-white rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#e8e8e8] flex items-center gap-4 relative group"
                >
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-[#fde7f3]">
                    <img
                      src={pro.avatar}
                      alt={pro.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[16px] font-bold text-[#26181c] truncate">{pro.name}</h3>
                        <p className="text-[12px] text-[#5a3f47] font-medium">{pro.role}</p>
                        <p className="text-[11px] text-[#e6007e] font-semibold mt-0.5 truncate">{pro.salonName}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveProfessional(pro)}
                        className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#e6007e] transition-transform active:scale-95"
                        aria-label="Remove favourite"
                      >
                        <span className="material-symbols-outlined text-[18px] fill-current">favorite</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#e8e8e8]/60">
                      <div className="flex items-center gap-1 text-[12px] font-bold text-[#26181c]">
                        <span className="material-symbols-outlined text-[14px] text-amber-500 fill-current">star</span>
                        {pro.rating}
                      </div>
                      <button
                        onClick={() => {
                          onSelectSalon(salonObj);
                          onNavigate('salon-detail');
                        }}
                        className="h-8 px-4 bg-[#e6007e] text-white rounded-lg font-bold text-[11px] hover:bg-[#b90064] transition-colors shadow-xs active:scale-[0.98]"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            renderEmptyState('professionals', onNavigate)
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="flex flex-col gap-4">
          {favoriteServices.length > 0 ? (
            favoriteServices.map((service) => {
              const salonObj = salons.find((s) => s.id === service.salonId) || salons[0];
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#e8e8e8] flex flex-col gap-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#fde7f3] text-[#e6007e] text-[10px] font-bold uppercase tracking-wider mb-1">
                        {service.category}
                      </span>
                      <h3 className="text-[17px] font-bold text-[#26181c]">{service.name}</h3>
                      <p className="text-[13px] text-[#5a3f47] font-medium mt-0.5">{service.salonName}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveService(service)}
                      className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-[#e6007e] transition-transform active:scale-95"
                      aria-label="Remove favourite"
                    >
                      <span className="material-symbols-outlined text-[20px] fill-current">favorite</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e8]/60">
                    <div className="flex items-center gap-3 text-[13px] text-[#5a3f47]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {service.durationMinutes} mins
                      </span>
                      <span className="font-extrabold text-[#26181c] text-[15px]">₹{service.price}</span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectSalon(salonObj);
                        onNavigate('salon-detail');
                      }}
                      className="h-10 px-5 bg-[#e6007e] text-white rounded-xl font-bold text-[12px] hover:bg-[#b90064] transition-colors shadow-sm shadow-[#e6007e]/20 active:scale-[0.98]"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            renderEmptyState('services', onNavigate)
          )}
        </div>
      )}

      {/* Snackbar with Undo */}
      {snackbar.visible && (
        <div className="fixed bottom-32 mb-safe left-1/2 -translate-x-1/2 z-50 bg-[#26181c] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-[#e6007e]/40 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-[13px] font-medium">{snackbar.message}</span>
          <button
            onClick={handleUndo}
            className="text-[#ffb0c8] font-bold text-[13px] hover:underline uppercase tracking-wider px-2 py-1 rounded bg-white/10"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

function renderEmptyState(type: string, onNavigate: (screen: Screen) => void) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-[28px] border border-[#e8e8e8]">
      <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-[#e6007e]/10 rounded-full blur-xl" />
        <div className="relative w-20 h-20 bg-[#ffe8ed] rounded-full flex items-center justify-center text-[#e6007e]">
          <span className="material-symbols-outlined text-[42px]">favorite_border</span>
        </div>
      </div>
      <h3 className="text-[20px] font-bold text-[#26181c] mb-2">No favourites yet</h3>
      <p className="text-[14px] text-[#5a3f47] mb-8 max-w-[280px] leading-relaxed">
        Save salons, services or professionals to find them quickly.
      </p>
      <button
        onClick={() => onNavigate('home')}
        className="w-full max-w-[240px] h-[52px] bg-[#e6007e] text-white text-[14px] font-semibold rounded-xl shadow-lg shadow-[#e6007e]/25 active:scale-95 transition-transform"
      >
        Explore Salons
      </button>
    </div>
  );
}
