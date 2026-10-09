import { Suspense } from 'react';
import { EnrollmentV2Page } from '@/components/enrollment-v2/EnrollmentV2Page';
import { ENROLLMENT_V3 } from '@/components/enrollment-v2/variants';

export default function Page() {
  return (
    <Suspense>
      <EnrollmentV2Page lang="en" variant={ENROLLMENT_V3} />
    </Suspense>
  );
}
