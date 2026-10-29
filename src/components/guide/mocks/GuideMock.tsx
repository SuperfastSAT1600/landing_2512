import type { MissionId } from '@/lib/guide/sfv2-steps';
import ScheduleMock from './ScheduleMock';
import EntryMock from './EntryMock';

export default function GuideMock({ id, index }: { id: MissionId; index: number }) {
  return id === 'schedule' ? <ScheduleMock index={index} /> : <EntryMock kind={id} index={index} />;
}
