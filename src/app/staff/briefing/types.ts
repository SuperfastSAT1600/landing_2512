import type { BriefingPayload } from '@/app/api/cron/schedule-input-status/briefing-payload';
import type { ContactLog } from '@/lib/staff-contacts';
import type { StaffUser } from '@/lib/staff-session';

export type { BriefingPayload, ContactLog, StaffUser };
export type ContactsByStudent = Record<string, ContactLog[]>;

export interface BriefingResponse {
  date: string;
  payload: BriefingPayload;
  availableDates: string[];
}

export type ListKey = 'endingSoon' | 'noSchedule' | 'neverScheduled' | 'coach';
