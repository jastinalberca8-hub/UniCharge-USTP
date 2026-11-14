import React from 'react';
import { useUniCharge } from '../../context/UniChargeContext';
import { sound } from '../../utils/audio';
import { formatDuration } from '../../utils/format';
import { ServiceType, LockerSize, LockerSlot } from '../../types';
import { PRICING_RATES } from '../../data/mockData';
import {
  Zap,
  Package,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ServiceLockerSelectionScreenProps {
  onProceedToPayment: () => void;
  onBackToStations: () => void;
}

export const ServiceLockerSelectionScreen: React.FC<ServiceLockerSelectionScreenProps> = ({
  onProceedToPayment,
  onBackToStations,
}) => {
  const {
    selectedStation,
    selectedService,
    setSelectedService,
    selectedSize,
    setSelectedSize,
    selectedDuration,
    setSelectedDuration,
    selectedSlot,
    setSelectedSlot,
    calculateFee,
  } = useUniCharge();

  const slotsOfSize = selectedStation.slots.filter((s) => s.size === selectedSize);
  const availableSlotsOfSize = slotsOfSize.filter((s) => s.status === 'available');

  const handleServiceSelect = (svc: ServiceType) => {
    sound.playTap();
    setSelectedService(svc);
  };

  const handleSizeSelect = (sz: LockerSize) => {
    sound.playTap();
    setSelectedSize(sz);
    const available = selectedStation.slots.find((s) => s.size === sz && s.status === 'available');
    setSelectedSlot(available || null);
  };

  const handleSlotSelect = (slot: LockerSlot) => {
    if (slot.status !== 'available') return;
    sound.playTap();
    setSelectedSlot(slot);
    setSelectedSize(slot.size);
  };

  const totalFee = calculateFee(selectedSize, selectedDuration, selectedService);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-[#1E293B] overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FFFFFF]/95 backdrop-blur-md px-4 pt-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => {
              sound.playTap();
              onBackToStations();
            }}
            className="text-xs font-semibold text-[#4E6E81] hover:text-[#3D5767] flex items-center gap-1 cursor-pointer"
          >
            ← Change Station
          </button>
          <span className="text-[10px] font-bold text-[#48AD80] uppercase tracking-wider">
            Step 1 of 2
          </span>
        </div>

        <h1 className="text-base font-bold text-[#1E293B] tracking-tight">
          Configure Locker Booking
        </h1>
        <p className="text-xs text-[#64748B] font-mono">
          {selectedStation.name} · {selectedStation.availableSlots} free slots
        </p>
      </div>

      <div className="px-4 py-3 space-y-5 flex-1">
        {/* SECTION 1: SERVICE TYPE SELECTOR */}
        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
            1. Select Service Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'charging', title: 'Charging', sub: '65W–140W PD', Icon: Zap },
                { id: 'storage', title: 'Storage', sub: 'Safe Locker', Icon: Package },
                { id: 'both', title: 'Both', sub: 'Charge + Safe', Icon: Sparkles },
              ] as const
            ).map(({ id, title, sub, Icon }) => {
              const active = selectedService === id;
              return (
                <button
                  key={id}
                  onClick={() => handleServiceSelect(id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    active
                      ? 'bg-[#4E6E81] text-white border-[#4E6E81] shadow-sm'
                      : 'bg-[#FFFFFF] text-[#1E293B] border-[#E2E8F0] hover:border-[#4E6E81]/50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                      active ? 'bg-[#5BC496] text-[#1E293B]' : 'bg-[#EDF2F5] text-[#4E6E81]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-xs">{title}</div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-slate-100' : 'text-[#64748B]'}`}>
                    {sub}
                  </div>
                  {active && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#5BC496] text-[#1E293B] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: COMPARTMENT SIZE PICKER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              2. Compartment Size
            </label>
            <span className="text-[11px] font-semibold text-[#4E6E81]">
              {availableSlotsOfSize.length} of {slotsOfSize.length} Size {selectedSize} Free
            </span>
          </div>

          <div className="space-y-2">
            {(['S', 'M', 'L'] as LockerSize[]).map((size) => {
              const rate = PRICING_RATES[size];
              const isSelected = selectedSize === size;
              const freeCount = selectedStation.slots.filter(
                (s) => s.size === size && s.status === 'available'
              ).length;

              return (
                <div
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EDF2F5] border-[#4E6E81] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#4E6E81]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#4E6E81] text-white'
                            : 'bg-[#EDF2F5] text-[#4E6E81]'
                        }`}
                      >
                        {size}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-[#1E293B]">{rate.label}</h4>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                              freeCount > 0
                                ? 'bg-[#EBF9F3] text-[#1E293B] border border-[#5BC496]/40'
                                : 'bg-red-50 text-[#DC2626] border border-red-200'
                            }`}
                          >
                            {freeCount > 0 ? `${freeCount} Free` : 'Full'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{rate.bestFor}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-[#4E6E81] font-mono">
                        ₱{rate.hourly}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">/ hr</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: SPECIFIC HARDWARE COMPARTMENT MATRIX */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              3. Select Compartment Slot
            </label>
            <span className="text-[11px] font-mono text-[#4E6E81] font-semibold">
              {selectedSlot ? `Slot #${selectedSlot.slotNumber}` : 'Tap to select'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {selectedStation.slots.map((slot) => {
              const isSelected = selectedSlot?.slotNumber === slot.slotNumber;
              const isAvailable = slot.status === 'available';

              return (
                <button
                  key={slot.id}
                  disabled={!isAvailable}
                  onClick={() => handleSlotSelect(slot)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-[#4E6E81] text-white border-[#4E6E81] shadow-sm font-bold cursor-pointer'
                      : isAvailable
                      ? 'bg-[#EBF9F3] border-[#5BC496]/40 text-[#1E293B] hover:border-[#4E6E81] cursor-pointer'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-mono font-bold">#{slot.slotNumber}</span>
                    <span
                      className={`font-bold text-[8px] px-1 rounded ${
                        isSelected ? 'bg-[#5BC496] text-[#1E293B]' : 'bg-white text-[#4E6E81]'
                      }`}
                    >
                      {slot.size}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-bold">
                    {isSelected ? 'PICKED' : isAvailable ? 'FREE' : 'BUSY'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: DURATION & PRICING TIER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              4. Duration
            </label>
            <span className="text-xs font-bold text-[#4E6E81] font-mono">
              {formatDuration(selectedDuration)}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-2.5">
            {[30, 60, 120, 180, 240].map((mins) => {
              const isSel = selectedDuration === mins;
              return (
                <button
                  key={mins}
                  onClick={() => {
                    sound.playTap();
                    setSelectedDuration(mins);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[#4E6E81] text-white shadow-xs'
                      : 'bg-[#FFFFFF] border border-[#E2E8F0] text-[#64748B] hover:border-[#4E6E81]'
                  }`}
                >
                  {mins === 30 ? '30m' : `${mins / 60}h`}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={30}
            max={240}
            step={30}
            value={selectedDuration}
            onChange={(e) => {
              sound.playTap();
              setSelectedDuration(Number(e.target.value));
            }}
            className="w-full accent-[#4E6E81] cursor-pointer"
          />
        </div>

        {/* BOOKING SUMMARY BOX */}
        <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Station &amp; Slot:</span>
            <span className="font-semibold text-[#1E293B]">
              {selectedStation.campusCode} · Slot #{selectedSlot?.slotNumber || 1}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Service &amp; Size:</span>
            <span className="font-semibold text-[#1E293B] capitalize">
              {selectedService} · Size {selectedSize}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Duration:</span>
            <span className="font-semibold text-[#1E293B] font-mono">
              {formatDuration(selectedDuration)}
            </span>
          </div>
          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#64748B] block">Total Campus Fee</span>
              <span className="text-[10px] text-[#48AD80] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> USTP Student Rate
              </span>
            </div>
            <span className="text-lg font-extrabold text-[#4E6E81] font-mono">
              ₱{totalFee}.00
            </span>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM CTA */}
      <div className="sticky bottom-0 p-3 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E2E8F0] z-20">
        <button
          onClick={() => {
            sound.playTap();
            onProceedToPayment();
          }}
          className="w-full h-11 rounded-xl bg-[#4E6E81] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#3D5767] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <span>Continue to QR Authorization (₱{totalFee})</span>
          <ChevronRight className="w-4 h-4 text-[#5BC496]" />
        </button>
      </div>
    </div>
  );
};
