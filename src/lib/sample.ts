import type { Trip, TripRequest } from "./schema";

export const SAMPLE_REQUEST: TripRequest = {
  from: "Mumbai, Maharashtra, India",
  fromCoords: { lat: 19.076, lon: 72.8777 },
  dest: "Goa, India",
  destCoords: { lat: 15.3005, lon: 74.0855 },
  start: "2026-12-12",
  end: "2026-12-16",
  budget: 60000,
  currency: "INR",
  travelers: 2,
  pace: "Balanced",
  interests: ["Beaches", "Cafes", "Culture & history", "Nature"],
  modes: [],
  priority: 1,
};

export const SAMPLE_TRIP: Trip = {
  headline: "Beaches, forts and long Goan lunches",
  summary: "North Goa beaches, the Latin Quarter, a waterfall day and a slow finish down south.",
  travel: {
    options: [
      { mode: "flight", title: "Direct flight, Mumbai to Goa", hours: 3.5, cost: 12000, note: "About 1 h 15 min in the air; land at Dabolim or Mopa." },
      { mode: "train", title: "Overnight train on the Konkan line", hours: 11, cost: 3200, note: "Arrive at Madgaon or Thivim; sleeper or 3AC berths." },
      { mode: "bus", title: "Overnight sleeper bus", hours: 12, cost: 2800, note: "Drops you in Panjim or Mapusa early morning." },
      { mode: "drive", title: "Drive the coastal highway", hours: 10, cost: 7500, note: "Fuel and tolls for one car; you keep it for the trip." },
    ],
    chosen: 0,
  },
  budget: {
    breakdown: [
      { label: "Stays", amount: 18000 },
      { label: "Food & cafes", amount: 9500 },
      { label: "Transport", amount: 7000 },
      { label: "Activities", amount: 6500 },
      { label: "Buffer", amount: 4000 },
    ],
    note: "Mid-range guesthouses in Candolim and Panjim, plus a scooter for two days.",
  },
  crowd: {
    headline: "Busy, but not Christmas-busy",
    summary:
      "Your dates land just before the holiday rush. The weekend is the busiest stretch, so the popular beaches sit on weekdays.",
    calendar: [3, 3, 3, 3, 2, 3, 3, 4, 4, 3, 3, 3, 3, 4, 4, 5, 5, 4, 4],
    reasons: [
      "Peak season starts mid-December",
      "Christmas and New Year week is the busiest of the year",
      "Weekends bring visitors from Mumbai and Bengaluru",
    ],
    alternative: {
      start: "2026-12-01",
      end: "2026-12-05",
      why: "Same dry weather, fewer people, and hotels are usually cheaper before mid-December.",
    },
    bestTime: { place: "Palolem Beach", window: "6 – 8 am", levels: [18, 22, 30, 45, 60, 74, 86, 92, 86, 80, 74, 78, 66, 48, 30] },
  },
  days: [
    {
      title: "Land, unpack, chase the sunset",
      area: "Candolim & Calangute",
      crowd: 4,
      cost: 6800,
      tip: "Fort Aguada fills up before sunset. Get there by 5:15 pm.",
      stops: [
        { time: "11:00", name: "Check in, Candolim", type: "stay", note: "Taxi from the airport, about an hour.", cost: 1500, lat: 15.518, lng: 73.762 },
        { time: "13:30", name: "Infantaria, Calangute", type: "cafe", note: "Late breakfast. Bakery counter and Goan sausage rolls.", cost: 900, lat: 15.544, lng: 73.7553 },
        { time: "15:30", name: "Sinquerim Beach", type: "beach", note: "Calmer stretch than Baga; good for a first swim.", cost: 0, lat: 15.499, lng: 73.767 },
        { time: "17:15", name: "Fort Aguada", type: "sight", note: "17th-century Portuguese fort and lighthouse over the sea.", cost: 100, lat: 15.4925, lng: 73.7738 },
      ],
    },
    {
      title: "Cliffs, cafes and Chapora",
      area: "Anjuna & Vagator",
      crowd: 4,
      cost: 5900,
      tip: "Rent a scooter for the day. The cafes are spread along the cliff road.",
      stops: [
        { time: "09:30", name: "Artjuna, Anjuna", type: "cafe", note: "Garden cafe with a design shop out back.", cost: 1100, lat: 15.5836, lng: 73.7417 },
        { time: "11:30", name: "Anjuna Beach", type: "beach", note: "Rocky coves; walk north toward the cliffs.", cost: 0, lat: 15.5733, lng: 73.7407 },
        { time: "14:00", name: "Baba Au Rhum", type: "food", note: "French bakery tucked into the hills.", cost: 1400, lat: 15.5797, lng: 73.7489 },
        { time: "17:00", name: "Chapora Fort", type: "sight", note: "Short, steep climb with views over Vagator and the river.", cost: 0, lat: 15.6062, lng: 73.7365 },
      ],
    },
    {
      title: "Churches and the Latin Quarter",
      area: "Old Goa & Panjim",
      crowd: 3,
      cost: 4700,
      tip: "Cover shoulders for the churches, and go early to beat the tour buses.",
      stops: [
        { time: "08:30", name: "Basilica of Bom Jesus", type: "sight", note: "UNESCO-listed baroque church in Old Goa.", cost: 0, lat: 15.5009, lng: 73.9116 },
        { time: "10:00", name: "Se Cathedral", type: "sight", note: "Across the square, one of the largest churches in Asia.", cost: 0, lat: 15.5035, lng: 73.9121 },
        { time: "12:30", name: "Fontainhas", type: "sight", note: "Painted Portuguese-era houses and narrow lanes.", cost: 0, lat: 15.4966, lng: 73.8317 },
        { time: "15:00", name: "Cafe Bodega, Panjim", type: "cafe", note: "Courtyard cafe inside the Sunaparanta arts centre.", cost: 800, lat: 15.4935, lng: 73.829 },
      ],
    },
    {
      title: "The milk-white waterfall",
      area: "Mollem & Dudhsagar",
      crowd: 3,
      cost: 7200,
      tip: "Jeep safaris leave from Collem. Book the morning slot a day ahead.",
      stops: [
        { time: "07:00", name: "Drive to Collem", type: "move", note: "About 1.5 hours inland from Panjim.", cost: 2500, lat: 15.3417, lng: 74.2522 },
        { time: "09:00", name: "Dudhsagar Falls", type: "nature", note: "Jeep safari through the forest to the four-tier falls.", cost: 1800, lat: 15.3144, lng: 74.3143 },
        { time: "13:00", name: "Spice plantation, Ponda", type: "food", note: "Guided walk plus a Goan buffet.", cost: 1600, lat: 15.4107, lng: 74.035 },
        { time: "18:30", name: "Mandovi riverfront, Panjim", type: "sight", note: "Easy evening walk along the river.", cost: 0, lat: 15.5, lng: 73.827 },
      ],
    },
    {
      title: "Slow morning, then fly",
      area: "Palolem",
      crowd: 3,
      cost: 5400,
      tip: "Palolem is almost empty before 8 am, the quietest beach slot of the trip.",
      stops: [
        { time: "06:30", name: "Palolem Beach", type: "beach", note: "Crescent bay. Swim and coffee before the crowds.", cost: 0, lat: 15.01, lng: 74.0232 },
        { time: "09:30", name: "Butterfly Beach", type: "beach", note: "Small cove reached by boat from Palolem.", cost: 1200, lat: 15.0207, lng: 74.0006 },
        { time: "13:00", name: "Beach shack lunch, Palolem", type: "food", note: "Kingfish thali by the water.", cost: 1000, lat: 15.0095, lng: 74.024 },
        { time: "16:00", name: "Transfer to the airport", type: "move", note: "About 1.5 hours to Dabolim.", cost: 2500, lat: 15.3808, lng: 73.8314 },
      ],
    },
  ],
  gallery: [
    { place: "Palolem Beach", type: "beach" },
    { place: "Fort Aguada", type: "sight" },
    { place: "Fontainhas", type: "sight" },
    { place: "Dudhsagar Falls", type: "nature" },
    { place: "Chapora Fort", type: "sight" },
    { place: "Butterfly Beach", type: "beach" },
    { place: "Anjuna Beach", type: "beach" },
    { place: "Basilica of Bom Jesus", type: "sight" },
    { place: "Se Cathedral", type: "sight" },
    { place: "Calangute Beach", type: "beach" },
  ],
};
