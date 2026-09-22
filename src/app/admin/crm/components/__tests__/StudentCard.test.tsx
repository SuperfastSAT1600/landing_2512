/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { StudentCard } from '../StudentCard';
import type { Student } from '@/types/crm';

const STUDENT = { id: 's-1', name: '김학생', lead_type: 'B2C' } as unknown as Student;

function renderCard(props: Partial<React.ComponentProps<typeof StudentCard>> = {}) {
  return render(
    <DndContext>
      <SortableContext items={[STUDENT.id]}>
        <StudentCard student={STUDENT} onChurn={vi.fn()} onClick={vi.fn()} {...props} />
      </SortableContext>
    </DndContext>
  );
}

describe('StudentCard — 전략 없음 배지', () => {
  it('strategyMissing=true면 "전략 없음" 배지를 보여준다', () => {
    renderCard({ strategyMissing: true });
    expect(screen.getByText('전략 없음')).toBeTruthy();
  });

  it('strategyMissing=false면 배지가 없다', () => {
    renderCard({ strategyMissing: false });
    expect(screen.queryByText('전략 없음')).toBeNull();
  });

  it('strategyMissing을 안 넘기면(다른 칸반) 배지가 없다', () => {
    renderCard();
    expect(screen.queryByText('전략 없음')).toBeNull();
  });
});
