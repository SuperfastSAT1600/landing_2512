// 자동 생성 파일 — 직접 편집하지 마세요.
// 생성: npx tsx scripts/gen-newton-advisor.ts (model: claude-opus-5)
// 손으로 쓴 문구가 아니라 상담 노트 30건을 실제 LLM에 통과시킨 출력입니다.

import type { AdvisorPlan } from '@/lib/newton-advisor';

export const DEMO_ADVISOR_PLAN_KO: AdvisorPlan = {
  "summary": "수학은 78→89로 반등했으나 본인의 경제·보건정책 방향과 부모의 pre-med 계획이 미조정 상태이며 9월 수강신청 마감이 임박했다.",
  "signals": [
    {
      "title": "본인 진로 발언, 부모에게 미전달",
      "detail": "2025-11-17 '숫자와 사람'에서 2026-08-03 경제·공중보건 확언으로 굳어졌지만 부모에게는 단 한 번도 말하지 않았다.",
      "severity": "critical",
      "noteIds": [
        "note-09",
        "note-23",
        "note-30"
      ]
    },
    {
      "title": "부모 응답 3주로 지연, 아버지 입장 미확인",
      "detail": "회신이 가을 몇 시간에서 3월 9일, 6월 3주로 늦어졌고 3자 대화는 거부, 아버지는 참석 0회.",
      "severity": "critical",
      "noteIds": [
        "note-05",
        "note-19",
        "note-25",
        "note-27"
      ]
    },
    {
      "title": "월요일 결석 5회, 원인 미검증",
      "detail": "1~3월 월요일 결석 5회의 근거는 어머니의 '주말 게임' 진술뿐이며, research paper 시작 후 소멸한 이유도 미확인이다.",
      "severity": "watch",
      "noteIds": [
        "note-16",
        "note-19",
        "note-20",
        "note-23"
      ]
    }
  ],
  "thisWeek": [
    {
      "task": "어머니에게 전화해 8월 중 대면 3자 면담 날짜를 확정하라.",
      "owner": "Claire Jung",
      "due": "이번 주 금요일까지",
      "why": "이메일 회신이 3주 걸리므로 9월 수강신청 마감 전 면담은 전화로만 성립한다.",
      "value": "Opportunities for Growth",
      "noteIds": [
        "note-25",
        "note-27",
        "note-29"
      ]
    },
    {
      "task": "아버지 참석 여부를 서면으로 요청하고 회신을 기록하라.",
      "owner": "Claire Jung",
      "due": "이번 주 금요일까지",
      "why": "아버지는 1년간 면담 0회이고 그의 입장은 어머니 전언으로만 존재해 결정 구조가 미확인이다.",
      "value": "Noble Character",
      "noteIds": [
        "note-05",
        "note-20",
        "note-27"
      ]
    },
    {
      "task": "AP Statistics 수강 가능 여부를 확인해 Seojun에게 서면 회신하라.",
      "owner": "Daniel Cho",
      "due": "이번 주 금요일까지",
      "why": "본인이 직접 요청한 유일한 과목이며 '검토하겠다' 상태라 면담 전 확정돼야 한다.",
      "value": "Empower Minds",
      "noteIds": [
        "note-27",
        "note-30"
      ]
    }
  ],
  "thisMonth": [
    {
      "task": "Seojun과 30분 사전 미팅으로 면담에서 말할 3문장을 문서화하라.",
      "owner": "Daniel Cho",
      "due": "면담 3일 전까지",
      "why": "부모가 이미 주변에 의사 진로를 알렸으므로 준비 없이는 그가 면담에서 침묵한다.",
      "value": "Empower Minds",
      "noteIds": [
        "note-23",
        "note-30"
      ]
    },
    {
      "task": "Seojun 참석 대면 3자 면담을 열고 합의 사항을 회의록으로 남겨라.",
      "owner": "Claire Jung",
      "due": "8월 31일 이전",
      "why": "9월 수강신청이 닫히면 통계·경제 방향 선택은 1년 뒤로 밀린다.",
      "value": "Opportunities for Growth",
      "noteIds": [
        "note-29",
        "note-30"
      ]
    },
    {
      "task": "78→89 성적 곡선과 정체·반등 원인을 1쪽 문서로 부모에게 보내라.",
      "owner": "Grace Han",
      "due": "면담 3일 전까지",
      "why": "12월 회의에서 어머니가 84를 '하락'으로 읽었으므로 주도권이 반등을 만든 근거를 문서로 고정한다.",
      "value": "Wisdom through Discovery",
      "noteIds": [
        "note-10",
        "note-24",
        "note-28"
      ]
    }
  ],
  "thisQuarter": [
    {
      "task": "Pre-Calculus 교사와 error-analysis journaling 인수인계 회의록을 작성하라.",
      "owner": "Grace Han",
      "due": "9월 첫 수업 전",
      "why": "5개월 정체를 깬 유일한 방법이므로 첫 수업 전에 이어져야 87·88·89 흐름이 유지된다.",
      "value": "Nurture Excellence",
      "noteIds": [
        "note-18",
        "note-21",
        "note-28"
      ]
    },
    {
      "task": "월요일 출결을 주 단위로 기록하고 2회 누적 시 원인을 직접 확인하라.",
      "owner": "Daniel Cho",
      "due": "학기 첫 6주",
      "why": "결석 5회의 원인은 어머니 진술뿐이고 3주 만에 멈춘 이유도 검증되지 않았다.",
      "value": "Noble Character",
      "noteIds": [
        "note-16",
        "note-19",
        "note-20"
      ]
    },
    {
      "task": "healthcare pricing 연구를 독립 프로젝트로 등록하고 지도교사를 배정하라.",
      "owner": "Ms. Bennett",
      "due": "10월 말까지",
      "why": "그가 자발적으로 추가 작업한 유일한 영역이며 초안을 마감 전, 코스워크 수준 이상으로 제출했다.",
      "value": "Thrive in Innovation",
      "noteIds": [
        "note-22",
        "note-23",
        "note-26"
      ]
    }
  ],
  "risks": [
    {
      "title": "3자 면담 자체가 재차 거부될 가능성",
      "detail": "어머니는 6월에 '진로는 가정에서 결정'이라며 3자 대화를 1회 명시적으로 거부했다.",
      "firstMove": "면담을 진로 상담이 아닌 Grade 11 수강 확정 안건으로 제시한다.",
      "noteIds": [
        "note-27",
        "note-29"
      ]
    },
    {
      "title": "면담에서 본인이 침묵할 가능성",
      "detail": "부모가 이미 주변에 의사 진로를 알렸다고 본인이 말했고, 3월 면담에서도 이 주제는 다뤄지지 못했다.",
      "firstMove": "면담 첫 15분을 Seojun의 발언 순서로 고정한다.",
      "noteIds": [
        "note-20",
        "note-30"
      ]
    }
  ]
};
