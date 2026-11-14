export const RIDE_PRICING = {
  hourlyRate: 125,
  depositPercent: 25,
  minHours: 0.5,
  maxHours: 12,
  currency: 'USD',
};

/**
 * Payment details for the booking page.
 *
 * The QR images are intentionally empty until real codes are supplied.
 * Drop the images into `public/assets/ride/` and set the paths below, e.g.
 *   venmoQrImage: '/assets/ride/venmo-qr.png'
 *   zelleQrImage: '/assets/ride/zelle-qr.png'
 *
 * Venmo username should be the handle without the leading "@" (e.g. 'SaadHamed').
 * Zelle contact can be the enrolled email address or mobile number.
 */
export const RIDE_PAYMENT = {
  venmoHandle: '',
  venmoQrImage: '',
  zelleContact: '',
  zelleQrImage: '',
  contactEmail: 'info@saad928.com',
};

export const RIDE_SERVICES = [
  {
    icon: 'flight_takeoff',
    title: 'Airport Transfers',
    description:
      'Cleveland Hopkins (CLE) and Burke Lakefront pickups, drop-offs, and early-morning departures.',
  },
  {
    icon: 'local_hospital',
    title: 'Medical & Rehab',
    description:
      'Door-to-door rides to appointments, physical therapy, and trauma-center visits.',
  },
  {
    icon: 'psychology',
    title: 'Counseling Rides',
    description:
      'A private, judgment-free space to talk on the way to or from a session.',
  },
  {
    icon: 'event',
    title: 'Events & Errands',
    description:
      'Weddings, family gatherings, grocery runs, and hourly errands around the city.',
  },
];

export const RIDE_FAQ = [
  {
    question: 'How is the rate calculated?',
    answer:
      'Rides are $125.00 per hour, billed in 30-minute increments, plus a tip of your choosing. The estimate on this page updates automatically as you adjust your hours.',
  },
  {
    question: 'How does the deposit work?',
    answer:
      'A 25% non-refundable deposit reserves your date and time. The remaining 75% balance is due at pickup. The deposit is applied to your total — it is not an additional fee.',
  },
  {
    question: 'How do I pay?',
    answer:
      'Scan the Venmo or Zelle QR code on this page. Both the deposit and the pickup balance can be sent from your phone. Cash is also accepted at pickup by arrangement.',
  },
  {
    question: 'Can I add a tip after the ride?',
    answer:
      'Yes. Tips are accepted at the end of the ride or the next day through Venmo or Zelle. Use the feedback section to leave a comment and add a tip whenever you are ready.',
  },
  {
    question: 'What is the service area?',
    answer:
      'Cleveland and Northeast Ohio. Longer regional trips can be quoted by request — just include the details in your booking notes.',
  },
  {
    question: 'What if I need to reschedule?',
    answer:
      'Deposits are non-refundable. If you need to move your ride, contact Saad at least 24 hours in advance and we will do our best to reschedule your reservation.',
  },
];
