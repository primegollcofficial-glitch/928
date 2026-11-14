export type PageId =
  | 'home'
  | 'the-book'
  | 'about-saad'
  | 'the-story'
  | 'in-the-news'
  | 'counseling'
  | 'book-a-ride'
  | 'contact';

export interface QuoteItem {
  id: string;
  text: string;
  attribution: string;
  chapter: string;
  category: string;
  saved?: boolean;
}

export interface ReviewItem {
  id: string;
  author: string;
  title: string;
  content: string;
  role: string;
  rating: number;
  initial: string;
  verified: boolean;
}

export interface DocumentaryRecord {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  timeTag: string;
  imageUrl: string;
  altText: string;
  category: 'accident' | 'metrohealth';
  sensitive?: boolean;
}

export interface TimelineEvent {
  year: string;
  title: string;
  roleTag: string;
  description: string;
  badgeText: string;
  icon: string;
  isHighlight?: boolean;
}

export interface MediaArticle {
  id: string;
  outlet: string;
  date: string;
  title: string;
  excerpt: string;
  type: 'Television' | 'Print' | 'Podcast' | 'Keynote';
  linkText: string;
}

export interface RideBooking {
  id: string;
  name: string;
  phone: string;
  email: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  destination: string;
  hours: number;
  passengers: string;
  notes: string;
  hourlyRate: number;
  total: number;
  deposit: number;
  balance: number;
  status: 'deposit-pending' | 'deposit-sent' | 'balance-paid';
  createdAt: string;
}

export interface RideFeedback {
  id: string;
  name: string;
  bookingRef: string;
  rating: number;
  comment: string;
  tipAmount: number;
  createdAt: string;
}
