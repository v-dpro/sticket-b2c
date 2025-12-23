export type TicketStatus = 'KEEPING' | 'SELLING' | 'SOLD' | 'TRANSFERRED';

export type TicketSource = 'EMAIL' | 'MANUAL' | 'SCAN' | 'TRANSFER';

export type BarcodeFormat = 'QR' | 'CODE128' | 'PDF417' | 'AZTEC' | 'UNKNOWN';

export interface Ticket {
  id: string;
  userId: string;

  // Event info
  event: {
    id: string;
    name: string;
    date: string;
    artist: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    venue: {
      id: string;
      name: string;
      city: string;
      state?: string;
    };
  };

  // Ticket details
  section?: string;
  row?: string;
  seat?: string;
  isGeneralAdmission: boolean;

  // Barcode
  barcode?: string;
  barcodeFormat: BarcodeFormat;
  barcodeImageUrl?: string;

  // Status
  status: TicketStatus;
  source: TicketSource;

  // Metadata
  purchasePrice?: number;
  purchaseDate?: string;
  confirmationNumber?: string;
  notes?: string;

  // Email parsing
  sourceEmail?: string;
  rawEmailId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface TicketGroup {
  date: string; // e.g., "Dec 2024", "Jan 2025"
  tickets: Ticket[];
}

export interface AddTicketData {
  eventId?: string;

  // If no eventId, manual event info
  artistName?: string;
  venueName?: string;
  eventDate?: string;

  // Ticket details
  section?: string;
  row?: string;
  seat?: string;
  isGeneralAdmission?: boolean;

  // Barcode
  barcode?: string;
  barcodeFormat?: BarcodeFormat;

  // Optional
  purchasePrice?: number;
  confirmationNumber?: string;
  notes?: string;
}



