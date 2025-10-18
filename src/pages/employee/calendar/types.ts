export type Resource = {
  id: string;
  name: string;
  service: string;
  color?: string;
  isAvailable: boolean;
  serviceId: string;
  venueServiceId: string;
  maxTables: number;
  price: number;
};

export type Event = {
  id: string;
  resourceId: string;
  startDate: Date;
  endDate: Date;
  startTime: string; // e.g., "10:00"
  duration: number; // duration in hours (e.g., 1.5 for 1.5 hours)
  color?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  // Open duration fields
  isOpenDuration?: boolean; // true if duration is not fixed
  actualStartTime?: Date; // when the event actually started
  actualEndTime?: Date; // when the event ended (null if still active)
  eventStatus?: 'active' | 'ended'; // current event status
  // Optional attached products (by predefined catalog id)
  products?: EventProduct[];
  // Additional fields for employee events
  guestCount?: number;
  eventType?: 'booking' | 'employee';
  specialRequests?: string;
  paymentMethod?: string; // 'card' or 'cash'
};

export type CalendarView = 'day';

export type WeekDate = {
  date: Date;
  dayName: string;
  dayNumber: string;
  monthName: string;
  isToday: boolean;
  isSelected: boolean;
};

export type TimeSlot = {
  hour: number;
  time: string; // e.g., "10:00"
  label: string; // e.g., "10:00"
};

export type GridPosition = {
  resourceId: string;
  date: Date;
  startTime: string;
  endTime: string;
};

// Predefined product available to attach to events
export type Product = {
  id: string;
  name: string;
  price?: number;
};

// An item attached to an event from the product catalog
export type EventProduct = {
  productId: string;
  quantity: number;
};