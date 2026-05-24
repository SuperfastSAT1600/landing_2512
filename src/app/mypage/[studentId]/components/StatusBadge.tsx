import type { ParentStatus } from '@/types/crm';

interface Props {
  status: ParentStatus;
}

const STATUS_CONFIG: Record<
  ParentStatus,
  { label: string; description: string; className: string }
> = {
  new: {
    label: '신규',
    description: '안녕하세요! 곧 담당자가 연락을 드릴 예정입니다.',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  schedule: {
    label: '스케줄 입력 필요',
    description: '아래에서 희망 수업 시간을 선택해주세요.',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  matching: {
    label: '매칭 진행 중',
    description: '적합한 코치를 찾고 있습니다. 잠시만 기다려주세요.',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  done: {
    label: '매칭 완료',
    description: '코치와의 매칭이 완료되었습니다. OT 일정을 확인해보세요.',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
};

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <div className="space-y-2">
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${config.className}`}
      >
        {config.label}
      </span>
      <p className="text-gray-600 text-sm">{config.description}</p>
    </div>
  );
}
