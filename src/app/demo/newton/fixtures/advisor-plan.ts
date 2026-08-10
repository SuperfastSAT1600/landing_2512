// 자동 생성 파일 — 직접 편집하지 마세요.
// 생성: npx tsx scripts/gen-newton-advisor.ts (model: claude-opus-5)
// 손으로 쓴 문구가 아니라 상담 노트 30건을 실제 LLM에 통과시킨 출력입니다.

import type { AdvisorPlan } from '@/lib/newton-advisor';

export const DEMO_ADVISOR_PLAN: AdvisorPlan = {
  "summary": "Seojun ended the year at 89 after taking ownership of his work, but his health-policy direction has never reached his parents.",
  "signals": [
    {
      "title": "Plateau broke only under self-owned method",
      "detail": "Five months flat at 83-84 broke after he owned error-analysis journaling: 87, 88, 89.",
      "severity": "watch",
      "noteIds": [
        "note-14",
        "note-18",
        "note-28"
      ]
    },
    {
      "title": "Interest voiced to staff, never home",
      "detail": "Given free choice he picked economics or health four times, yet parents have told everyone he will be a doctor.",
      "severity": "critical",
      "noteIds": [
        "note-08",
        "note-15",
        "note-22",
        "note-23",
        "note-30"
      ]
    },
    {
      "title": "Parent channel narrowing, father never verified",
      "detail": "Mother's replies slowed from hours to 21 days and she declined a three-way talk; father attended nothing, his stance relayed by her.",
      "severity": "critical",
      "noteIds": [
        "note-05",
        "note-19",
        "note-20",
        "note-25",
        "note-27"
      ]
    }
  ],
  "thisWeek": [
    {
      "task": "Email both parents, naming father, two in-person slots before 8 September.",
      "owner": "Claire Jung",
      "due": "by Friday",
      "why": "Course selection closes in September; mother's last reply took 21 days.",
      "value": "Opportunities for Growth",
      "noteIds": [
        "note-05",
        "note-25",
        "note-27",
        "note-29"
      ]
    },
    {
      "task": "Confirm in writing whether Seojun has an AP Statistics seat.",
      "owner": "Daniel Cho",
      "due": "by Friday",
      "why": "He asked on 8 June and got 'we will look at it'; still unanswered.",
      "value": "Empower Minds",
      "noteIds": [
        "note-08",
        "note-27"
      ]
    },
    {
      "task": "Brief the Pre-Calculus teacher to continue error-analysis journaling from week one.",
      "owner": "Grace Han",
      "due": "week 1 of term",
      "why": "Journaling, not worksheets, moved him 83 to 89; a restart would lose it.",
      "value": "Wisdom through Discovery",
      "noteIds": [
        "note-14",
        "note-18",
        "note-28"
      ]
    }
  ],
  "thisMonth": [
    {
      "task": "Have Seojun write one page naming his Grade 11 course choices.",
      "owner": "Daniel Cho",
      "due": "before the parent meeting",
      "why": "Must exist before the meeting, or it reverts to the pre-med timeline.",
      "value": "Empower Minds",
      "noteIds": [
        "note-20",
        "note-30"
      ]
    },
    {
      "task": "Hold three-way meeting where Seojun presents page and health-policy paper.",
      "owner": "Claire Jung",
      "due": "before 10 September",
      "why": "Depends on his page; he has never been asked for his own answer.",
      "value": "Noble Character",
      "noteIds": [
        "note-23",
        "note-26",
        "note-30"
      ]
    },
    {
      "task": "Ask Seojun directly why Mondays; log every Monday absence.",
      "owner": "Daniel Cho",
      "due": "end of September",
      "why": "Five absences were explained only by mother's gaming account, never verified with him.",
      "value": "Nurture Excellence",
      "noteIds": [
        "note-16",
        "note-19",
        "note-20"
      ]
    }
  ],
  "thisQuarter": [
    {
      "task": "Send both parents written record of Seojun's stated Grade 11 direction.",
      "owner": "Claire Jung",
      "due": "two weeks after the meeting",
      "why": "Follows the September meeting; mother currently hears health policy as an extracurricular.",
      "value": "Noble Character",
      "noteIds": [
        "note-29",
        "note-27",
        "note-30"
      ]
    },
    {
      "task": "Start the co-supervised health-policy extension piece with Ms. Bennett.",
      "owner": "Ms. Bennett",
      "due": "by end of October",
      "why": "His unassigned draft beat coursework, and Monday absences stopped three weeks while it ran.",
      "value": "Thrive in Innovation",
      "noteIds": [
        "note-22",
        "note-23",
        "note-26"
      ]
    },
    {
      "task": "Review the first two Pre-Calculus tests with Grace Han in October.",
      "owner": "Grace Han",
      "due": "late October",
      "why": "Mother read the 86-to-84 dip as decline; an early stumble revives placement pressure.",
      "value": "Nurture Excellence",
      "noteIds": [
        "note-02",
        "note-10",
        "note-24"
      ]
    }
  ],
  "risks": [
    {
      "title": "Direction declared decided at home",
      "detail": "Mother declined the three-way conversation, calling course direction 'decided at home', and father's agreement is only her report.",
      "firstMove": "Put one agenda item on the September invitation: Seojun's Grade 11 courses.",
      "noteIds": [
        "note-05",
        "note-20",
        "note-27",
        "note-29"
      ]
    },
    {
      "title": "Monday absences resume without owned project",
      "detail": "Five Monday absences January to March stopped only during the research paper; the late-night cause was never verified.",
      "firstMove": "Fix the extension project start date in week one of term.",
      "noteIds": [
        "note-16",
        "note-19",
        "note-20",
        "note-23"
      ]
    }
  ]
};
