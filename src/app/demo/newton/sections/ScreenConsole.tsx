'use client';

import { Section } from '../components/Section';
import { OneSystemBand } from '../components/OneSystemBand';
import { UnifiedConsole } from '../components/UnifiedConsole';

/**
 * 통합을 가장 먼저 보여주는 섹션.
 *
 * 순서: AS-IS/TO-BE 도식(원래는 몇 개를 따로 사는가) → 실제 콘솔 화면.
 * 문제를 먼저 세우고 그 해결이 실제로 어떻게 생겼는지 바로 이어서 보여준다.
 */
export function ScreenConsole() {
  return (
    <Section
      id="console"
      eyebrow="Screen 1 — Student console"
      title="학생의 모든 정보를 하나의 소프트웨어로"
    >
      <OneSystemBand />

      <UnifiedConsole />
    </Section>
  );
}
