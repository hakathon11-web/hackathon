// Centralized list of Tbilisi districts (Georgian) for selection and logic
export const TBILISI_DISTRICTS: string[] = [
  'გლდანი',
  'ისანი',
  'კრწანისი',
  'ნაძალადევი',
  'საბურთალო',
  'ჩუღურეთი',
  'მთაწმინდა',
  'ვაკე',
  'სამგორი',
  'დიდუბე',
];

export type District = (typeof TBILISI_DISTRICTS)[number];

// Approximate coordinates for district centers, keyed by Georgian names above
export const TBILISI_DISTRICT_COORDINATES: Record<District, { lat: number; lng: number }> = {
  'გლდანი': { lat: 41.7789, lng: 44.8144 },
  'ისანი': { lat: 41.7033, lng: 44.8144 },
  'კრწანისი': { lat: 41.6725, lng: 44.8271 },
  'ნაძალადევი': { lat: 41.7578, lng: 44.7516 },
  'საბურთალო': { lat: 41.7325, lng: 44.7516 },
  'ჩუღურეთი': { lat: 41.7211, lng: 44.7737 },
  'მთაწმინდა': { lat: 41.6969, lng: 44.7909 },
  'ვაკე': { lat: 41.7070, lng: 44.7737 },
  'სამგორი': { lat: 41.6890, lng: 44.8600 },
  'დიდუბე': { lat: 41.7789, lng: 44.7916 },
};

// English translations for the Georgian district names
export const TBILISI_DISTRICT_EN: Record<District, string> = {
  'გლდანი': 'Gldani',
  'ისანი': 'Isani',
  'კრწანისი': 'Krtsanisi',
  'ნაძალადევი': 'Nadzaladevi',
  'საბურთალო': 'Saburtalo',
  'ჩუღურეთი': 'Chughureti',
  'მთაწმინდა': 'Mtatsminda',
  'ვაკე': 'Vake',
  'სამგორი': 'Samgori',
  'დიდუბე': 'Didube',
};


