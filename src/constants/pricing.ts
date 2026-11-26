import type { PricingTier, PricingTierId, ServiceType } from '../types/index.ts';

export const UNICHARGE_STATION_ID = 'unicharge-station-01';
export const UNICHARGE_STATION_CODE = 'USTP-UNICHARGE-01';
export const UNICHARGE_STATION_NAME = 'UniCharge Station';
export const UNICHARGE_ADMIN_DESK = 'UniCharge Admin Desk';

export const CHARGING_SLOT_COUNT = 15;
export const STORAGE_SLOT_COUNT = 5;
export const TOTAL_COMPARTMENT_COUNT = CHARGING_SLOT_COUNT + STORAGE_SLOT_COUNT;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'charging-short',
    name: 'Charging-Short',
    serviceType: 'charging',
    durationLabel: '1–2 hrs',
    durationMinutes: 120,
    fee: 10,
    description: 'Fast charging session for quick class breaks',
  },
  {
    id: 'charging-long',
    name: 'Charging-Long',
    serviceType: 'charging',
    durationLabel: '3–5 hrs',
    durationMinutes: 300,
    fee: 20,
    description: 'Extended charging time',
  },
  {
    id: 'storage-short',
    name: 'Storage-Short',
    serviceType: 'storage',
    durationLabel: '1–2 hrs',
    durationMinutes: 120,
    fee: 10,
    description: 'Short-term secure locker storage',
  },
  {
    id: 'storage-medium',
    name: 'Storage-Medium',
    serviceType: 'storage',
    durationLabel: '3–5 hrs',
    durationMinutes: 300,
    fee: 15,
    description: 'Half-day campus bag & laptop storage',
  },
  {
    id: 'storage-long',
    name: 'Storage-Long',
    serviceType: 'storage',
    durationLabel: '6–8 hrs',
    durationMinutes: 480,
    fee: 25,
    description: 'Full school-day secure compartment',
  },
  {
    id: 'storage-extended-long',
    name: 'Storage-Extended Long',
    serviceType: 'storage',
    durationLabel: '9–14 hrs',
    durationMinutes: 840,
    fee: 40,
    description: 'All-day to evening extended storage',
  },
];

export function formatCompartmentCode(slotNumber: number): string {
  if (slotNumber >= 16 && slotNumber <= 20) {
    return `S${slotNumber - 15}`;
  }
  return String(slotNumber).padStart(2, '0');
}

export function getCompartmentCategory(slotNumber: number): ServiceType {
  return slotNumber >= 16 ? 'storage' : 'charging';
}

export function formatCompartmentLabel(slotNumber: number): string {
  const code = formatCompartmentCode(slotNumber);
  return slotNumber >= 16 ? `Storage ${code}` : `Charging #${code}`;
}

export function getTiersForService(service: ServiceType): PricingTier[] {
  return PRICING_TIERS.filter((tier) => tier.serviceType === service);
}

export function getDefaultTierForService(service: ServiceType): PricingTier {
  return service === 'storage' ? PRICING_TIERS[2] : PRICING_TIERS[0];
}

export function normalizeServiceType(
  raw: string | undefined,
  slotNumber?: number
): ServiceType {
  if (raw === 'storage') return 'storage';
  if (raw === 'charging') return 'charging';
  if (typeof slotNumber === 'number' && slotNumber >= 16) return 'storage';
  return 'charging';
}

export function resolvePricingTier(params: {
  tierId?: string;
  serviceType?: string;
  durationMinutes?: number;
  slotNumber?: number;
}): PricingTier {
  const byId = PRICING_TIERS.find(
    (t) =>
      t.id === params.tierId ||
      t.name.toLowerCase() === String(params.tierId || '').trim().toLowerCase()
  );
  if (byId) {
    return byId;
  }

  const service = normalizeServiceType(params.serviceType, params.slotNumber);
  const mins = Number(params.durationMinutes) || 120;

  if (service === 'charging') {
    return mins > 120 ? PRICING_TIERS[1] : PRICING_TIERS[0];
  }

  if (mins <= 120) return PRICING_TIERS[2];
  if (mins <= 300) return PRICING_TIERS[3];
  if (mins <= 480) return PRICING_TIERS[4];
  return PRICING_TIERS[5];
}

export function getPricingTierById(tierId: PricingTierId): PricingTier {
  return PRICING_TIERS.find((t) => t.id === tierId) || PRICING_TIERS[0];
}
