import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/crm';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

type RealtimePayload =
  | { eventType: 'INSERT'; new: Student; old: null }
  | { eventType: 'UPDATE'; new: Student; old: Partial<Student> }
  | { eventType: 'DELETE'; new: null; old: Partial<Student> };

interface UseCrmRealtimeOptions {
  onStudentChange: (payload: RealtimePayload) => void;
}

export function useCrmRealtime({ onStudentChange }: UseCrmRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStudentChangeRef = useRef(onStudentChange);

  useEffect(() => {
    onStudentChangeRef.current = onStudentChange;
  }, [onStudentChange]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      // Trigger a refresh signal via callback with a synthetic payload
      // Parent page handles actual refetch
      onStudentChangeRef.current({
        eventType: 'UPDATE',
        new: {} as Student,
        old: {},
      });
    }, 30000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    const channel = supabase.channel('crm-students');

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students' },
        (payload) => {
          onStudentChangeRef.current({
            eventType: 'INSERT',
            new: payload.new as Student,
            old: null,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'students' },
        (payload) => {
          onStudentChangeRef.current({
            eventType: 'UPDATE',
            new: payload.new as Student,
            old: payload.old as Partial<Student>,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'students' },
        (payload) => {
          onStudentChangeRef.current({
            eventType: 'DELETE',
            new: null,
            old: payload.old as Partial<Student>,
          });
        }
      )
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('connected');
          stopPolling();
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('disconnected');
          startPolling();
        } else {
          setStatus('connecting');
        }
      });

    channelRef.current = channel;

    return () => {
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [startPolling, stopPolling]);

  return { status };
}
