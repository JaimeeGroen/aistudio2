export interface Retailer {
  id: string;
  name: string;
  url: string;
  color: string;
}

export interface PricePoint {
  date: string; // ISO Date string YYYY-MM-DD
  [retailerId: string]: number | string; // Price for that retailer
}

export interface RacketDetails {
  name: string;
  imageUrl: string;
  description: string;
}

export interface ScrapedPrice {
  retailerId: string;
  price: number;
}
