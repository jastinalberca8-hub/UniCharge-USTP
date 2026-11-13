import React, { useState } from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { KioskStation } from '../../types';
import {
  MapPin,
  Search,
  Navigation,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Compass,
} from 'lucide-react';

interface StationDiscoveryScreenProps {
  onSelectStationToBook: (station: KioskStation) => void;
}

export const StationDiscoveryScreen: React.FC<StationDiscoveryScreenProps> = ({
  onSelectStationToBook,
}) => {
  const { stations, selectedStation, setSelectedStation, setHardwareKioskStationId } =
    useUniCharge();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'nearest'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const filteredStations = stations.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.campusCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'available') return st.availableSlots > 0;
    return true;
  });

  const sortedStations = [...filteredStations].sort((a, b) => {
    if (filterMode === 'nearest') return a.distanceMeters - b.distanceMeters;
    return 0;
  });

  const handleSelectStation = (st: KioskStation) => {
    sound.playTap();
    setSelectedStation(st);
    setHardwareKioskStationId(st.id);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] overflow-y-auto pb-6">
      {/* Top Header matching Kiosk palette */}
      <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#4E6E81] uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-[#5BC496]" />
              <span>USTP CDO Campus Network</span>
            </div>
            <h1 className="text-base font-bold text-[#1E293B] tracking-tight truncate">
              Kiosk Station Discovery
            </h1>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#EDF2F5] p-0.5 rounded-lg border border-[#E2E8F0] shrink-0">
            <button
              onClick={() => {
                sound.playTap();
                setViewMode('list');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#4E6E81] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              List
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setViewMode('map');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-[#4E6E81] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search building, floor, or kiosk ID..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#4E6E81]"
          />
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              sound.playTap();
              setFilterMode('all');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#4E6E81] text-white shadow-xs'
                : 'bg-[#EDF2F5] text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            All Kiosks ({stations.length})
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setFilterMode('available');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
              filterMode === 'available'
                ? 'bg-[#5BC496] text-[#1E293B] shadow-xs'
                : 'bg-[#EDF2F5] text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Available Now
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setFilterMode('nearest');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
              filterMode === 'nearest'
                ? 'bg-[#4E6E81] text-white shadow-xs'
                : 'bg-[#EDF2F5] text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Nearest First
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-3">
        {/* MAP VIEW */}
        {viewMode === 'map' && (
          <div className="mb-4">
            <div className="relative rounded-2xl overflow-hidden bg-[#3D5767] border border-[#4E6E81] aspect-[4/3] shadow-sm p-3">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="20" y="20" width="60" height="60" rx="8" fill="#4E6E81" />
                <path d="M 20 50 Q 50 40 80 50" stroke="#3D5767" strokeWidth="2.5" fill="none" />
                <path d="M 50 20 Q 40 50 50 80" stroke="#3D5767" strokeWidth="2.5" fill="none" />
                <line x1="38" y1="46" x2="62" y2="32" stroke="#5BC496" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
                <line x1="38" y1="46" x2="26" y2="68" stroke="#5BC496" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
                <line x1="62" y1="32" x2="74" y2="64" stroke="#5BC496" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
                <line x1="74" y1="64" x2="50" y2="84" stroke="#5BC496" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />

                <g fill="#2C4250" stroke="#5BC496" strokeWidth="0.5">
                  <rect x="30" y="38" width="16" height="14" rx="2" />
                  <rect x="54" y="24" width="16" height="14" rx="2" />
                  <rect x="18" y="60" width="16" height="14" rx="2" />
                  <rect x="66" y="56" width="16" height="14" rx="2" />
                  <rect x="42" y="76" width="16" height="14" rx="2" />
                </g>

                <text x="38" y="44" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">CITC</text>
                <text x="62" y="30" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">LIBRARY</text>
                <text x="26" y="66" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">CEA</text>
                <text x="74" y="62" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">SAC</text>
                <text x="50" y="82" fill="#F8FAFC" fontSize="2.8" textAnchor="middle" fontWeight="bold">GYM</text>
              </svg>

              {stations.map((st) => {
                const isSelected = selectedStation.id === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStation(st)}
                    style={{ left: `${st.mapCoords.x}%`, top: `${st.mapCoords.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5BC496] text-[#1E293B] ring-4 ring-[#5BC496]/40 scale-125 z-10'
                        : 'bg-[#FFFFFF] text-[#4E6E81] hover:scale-110 shadow'
                    }`}
                  >
                    <MapPin className="w-4 h-4 fill-current" />
                  </button>
                );
              })}

              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-[#1E293B] bg-[#FFFFFF]/95 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#5BC496] inline-block" />
                  Tap pin to preview kiosk
                </span>
                <span className="font-bold text-[#4E6E81] truncate ml-2">{selectedStation.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Kiosk Focus Card */}
        {viewMode === 'map' && (
          <div className="mb-4 p-4 rounded-2xl bg-[#FFFFFF] border border-[#4E6E81] shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#4E6E81] uppercase tracking-wider">
                  Selected Station
                </span>
                <h3 className="text-sm font-bold text-[#1E293B] mt-0.5">{selectedStation.name}</h3>
                <p className="text-xs text-[#64748B] mt-0.5">{selectedStation.floor}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40">
                  {selectedStation.availableSlots}/{selectedStation.totalSlots} Free
                </span>
                <div className="text-[11px] text-[#64748B] mt-1 font-mono">
                  {selectedStation.distanceMeters}m · {selectedStation.walkMinutes} min
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectStationToBook(selectedStation)}
              className="w-full mt-3 h-10 rounded-xl bg-[#4E6E81] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#3D5767] active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <span>Select This Station &amp; Choose Locker</span>
              <ArrowRight className="w-4 h-4 text-[#5BC496]" />
            </button>
          </div>
        )}

        {/* STATIONS LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] px-1">
            <span>AVAILABLE STATIONS ({sortedStations.length})</span>
            <span>REAL-TIME STATUS</span>
          </div>

          {sortedStations.map((station) => {
            const isSelected = selectedStation.id === station.id;
            return (
              <div
                key={station.id}
                onClick={() => handleSelectStation(station)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#4E6E81] ring-2 ring-[#4E6E81]/15 shadow-sm'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#4E6E81]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#4E6E81] text-[#5BC496]'
                          : 'bg-[#EDF2F5] text-[#4E6E81]'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-[#1E293B] tracking-tight">
                          {station.name}
                        </h3>
                        {station.isPopular && (
                          <span className="text-[10px] font-bold text-[#48AD80] flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Popular
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{station.floor}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-1 font-mono">
                        <span className="flex items-center gap-1 text-[#1E293B]">
                          <Navigation className="w-3 h-3 text-[#5BC496]" />
                          {station.distanceMeters}m
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {station.walkMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                        station.availableSlots > 2
                          ? 'bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40'
                          : station.availableSlots > 0
                          ? 'bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/40'
                          : 'bg-red-50 text-[#DC2626] border border-red-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          station.availableSlots > 2
                            ? 'bg-[#5BC496]'
                            : station.availableSlots > 0
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#DC2626]'
                        }`}
                      />
                      <span>
                        {station.availableSlots}/{station.totalSlots} Free
                      </span>
                    </div>
                    <span className="block text-[10px] text-[#64748B] font-mono mt-1">
                      {station.campusCode}
                    </span>
                  </div>
                </div>

                {/* Locker Slot Matrix Mini-Preview */}
                <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#64748B] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#4E6E81]" />
                      8 Compartments
                    </span>
                    <span className="text-[10px] text-[#64748B]">S · M · L</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {station.slots.map((slot) => {
                      const isFree = slot.status === 'available';
                      return (
                        <div
                          key={slot.id}
                          className={`p-1 rounded-lg text-center border text-[10px] font-mono ${
                            isFree
                              ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B]'
                              : slot.status === 'in_use'
                              ? 'bg-[#FFFBEB] border-[#F59E0B]/50 text-[#D97706]'
                              : 'bg-red-50 border-red-200 text-[#DC2626]'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-center gap-0.5">
                            <span>#{slot.slotNumber}</span>
                            <span className="text-[8px] px-1 rounded bg-white/80 text-[#4E6E81]">
                              {slot.size}
                            </span>
                          </div>
                          <div className="text-[8px] font-bold mt-0.5">
                            {isFree ? 'FREE' : slot.status === 'in_use' ? 'BUSY' : 'MAINT'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Book Locker Action Button */}
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStationToBook(station);
                    }}
                    className={`w-full h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#4E6E81] text-white hover:bg-[#3D5767]'
                        : 'bg-[#EDF2F5] text-[#4E6E81] hover:bg-[#4E6E81] hover:text-white'
                    }`}
                  >
                    <span>Reserve at {station.name.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#5BC496]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
