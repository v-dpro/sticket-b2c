// Profile Timeline Types

export type ViewMode = 'timeline' | 'grid' | 'map' | 'stats';

export interface YearData {
  year: number;
  showCount: number;
  artistCount: number;
  venueCount: number;
  isTopYear?: boolean;
  logs: LogEntry[];
  milestones?: Milestone[];
}

export interface LogEntry {
  id: number;
  artist: string;
  tour?: string;
  venue: string;
  city: string;
  date: string;
  dateObj: Date;
  rating: number;
  note?: string;
  photos?: string[];
  badges?: Badge[];
  friends?: Friend[];
  isFeatured?: boolean;
}

export interface Milestone {
  id: number;
  type: 'shows' | 'distance' | 'loyalty' | 'streak';
  icon: string;
  message: string;
  insertAfterLogId?: number;
}

export interface Badge {
  id: number;
  name: string;
  icon: string;
}

export interface Friend {
  id: number;
  name: string;
  avatar: string;
}
