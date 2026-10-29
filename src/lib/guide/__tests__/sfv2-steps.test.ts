import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MISSIONS, getMission } from '../sfv2-steps';
import GuideMock from '@/components/guide/mocks/GuideMock';

describe('sfv2-steps (REQ-001)', () => {
  it('3개 미션이 정의되어 있고 모두 사용 가능하다', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual(['schedule', 'study-hall', 'test-center']);
    for (const m of MISSIONS) {
      expect(m.available).toBe(true);
      expect(m.steps.length).toBeGreaterThan(0);
    }
  });

  it('각 미션의 스텝 id 와 target 은 미션 안에서 유일하다', () => {
    for (const m of MISSIONS) {
      expect(new Set(m.steps.map((s) => s.id)).size).toBe(m.steps.length);
      expect(new Set(m.steps.map((s) => s.target)).size).toBe(m.steps.length);
    }
  });

  it('모든 스텝에 한국어 안내 문구(title, body)가 있다', () => {
    for (const m of MISSIONS) {
      for (const s of m.steps) {
        expect(s.title.trim()).not.toBe('');
        expect(s.body.trim()).not.toBe('');
      }
    }
  });

  it('완료 후 이동할 실제 v2 주소는 app.superfastsat.io 를 가리킨다', () => {
    for (const m of MISSIONS) {
      expect(m.liveUrl).toMatch(/^https:\/\/app\.superfastsat\.io\//);
    }
  });

  it('각 스텝 시점의 모형 화면에 해당 target 이 존재한다', () => {
    for (const m of MISSIONS) {
      m.steps.forEach((s, i) => {
        const html = renderToStaticMarkup(createElement(GuideMock, { id: m.id, index: i }));
        expect(html, `${m.id} step ${i}`).toContain(`data-tutorial-id="${s.target}"`);
      });
    }
  });

  it('getMission 은 id 로 미션을 찾는다', () => {
    expect(getMission('study-hall').title).toContain('Study Hall');
  });
});
