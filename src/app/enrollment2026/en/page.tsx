import { Suspense } from 'react';
import { EnrollmentV2Page } from '@/components/enrollment-v2/EnrollmentV2Page';

export default function Page() {
  return (
    <Suspense>
      <EnrollmentV2Page lang="en" />
    </Suspense>
  );
}
