import { Suspense } from 'react';
import { EnrollmentV2Page } from '@/components/enrollment-v2/EnrollmentV2Page';
import { ENROLLMENT_V3 } from '@/components/enrollment-v2/variants';

// V3 — v2와 같은 화면, 판매 상품만 다르다(관리형 10시간 · 대표코치 10/20/40시간 · 1:4 특강).
export default function Page() {
  return (
    <Suspense>
      <EnrollmentV2Page variant={ENROLLMENT_V3} />
    </Suspense>
  );
}
