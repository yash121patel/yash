export interface Devotee {
  id: string;
  name: string;
  village: string;
  mobile: string;
  language: string;
  tokenNumber: number;
  status: 'pending' | 'completed' | 'approved' | 'rejected';
  registrationTime: string;
  completionTime: string | null;
}

export interface QueueStats {
  completed: number;
  pending: number;
  total: number;
}

export interface DailyEvent {
  id?: string;
  title: string;
  time: string;
  description: string;
}

export interface UpcomingFestival {
  id?: string;
  title: string;
  description: string;
  targetDate: string;
}
