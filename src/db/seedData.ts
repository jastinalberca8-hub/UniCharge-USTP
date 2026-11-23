import {
  CHARGING_SLOT_COUNT,
  TOTAL_COMPARTMENT_COUNT,
  UNICHARGE_STATION_CODE,
  UNICHARGE_STATION_ID,
  UNICHARGE_STATION_NAME,
  formatCompartmentCode,
  getCompartmentCategory,
} from '../constants/pricing.ts';
import type { KioskStation, LockerSlot, SecurityAlert } from '../types/index.ts';

export function buildStationCompartments(): LockerSlot[] {
  const slots: LockerSlot[] = [];

  for (let slotNumber = 1; slotNumber <= TOTAL_COMPARTMENT_COUNT; slotNumber++) {
    const category = getCompartmentCategory(slotNumber);
    const code = formatCompartmentCode(slotNumber);

    slots.push({
      id: `unicharge-slot-${slotNumber}`,
      slotNumber,
      code,
      category,
      status: 'available',
      chargingPower:
        category === 'charging'
          ? '65W USB-C PD + 220V Outlet'
          : 'Secure Storage Compartment',
      currentTemp: 28.2,
      isDoorOpen: false,
      isLocked: true,
    });
  }

  return slots;
}

const initialSlots = buildStationCompartments();

export const SEED_STATIONS: KioskStation[] = [
  {
    id: UNICHARGE_STATION_ID,
    name: UNICHARGE_STATION_NAME,
    campusCode: UNICHARGE_STATION_CODE,
    building: 'UniCharge Campus Station',
    floor: `${CHARGING_SLOT_COUNT} Charging · ${TOTAL_COMPARTMENT_COUNT - CHARGING_SLOT_COUNT} Storage Compartments`,
    walkMinutes: 1,
    distanceMeters: 0,
    totalSlots: TOTAL_COMPARTMENT_COUNT,
    availableSlots: initialSlots.length,
    image: '/src/assets/images/smart_locker_station_1794365237708.jpg',
    isPopular: true,
    online: true,
    powerDrawWatts: 0,
    mapCoords: { x: 50, y: 50 },
    coordinates: { lat: 8.4855, lng: 124.6565 },
    slots: initialSlots,
  },
];

export const SEED_SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: 'alt-2',
    timestamp: '42 mins ago',
    stationCode: UNICHARGE_STATION_CODE,
    stationName: UNICHARGE_STATION_NAME,
    slotNumber: 6,
    severity: 'info',
    type: 'Overcharge Cut-Off',
    message: 'Smart relay disconnected USB-C PD line after connected device reached 100% charge.',
    resolved: true,
  },
  {
    id: 'alt-3',
    timestamp: '2 hours ago',
    stationCode: UNICHARGE_STATION_CODE,
    stationName: UNICHARGE_STATION_NAME,
    slotNumber: 17,
    severity: 'critical',
    type: 'Tamper Vibration',
    message: 'Accelerometer spike (2.4g) on storage door S2; verified as accidental bump.',
    resolved: true,
  },
];
