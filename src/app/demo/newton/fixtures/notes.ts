// 뉴튼아카데미 데모용 상담 노트 픽스처.
//
// 타입은 실제 CRM 타입(ConsultationEntry)을 그대로 쓴다 — 데모 전용 타입을 만들지 않는다.
// 실제 도입 시 이 배열이 그대로 시드 데이터가 된다.
//
// 14개월(2025-06 ~ 2026-08) 동안 여러 담당자가 남긴 30건. 아래 5개 신호를 의도적으로 심어두었고,
// advisor-plan.ts의 분석 결과가 이 노트들을 근거로 지목한다.
//   S1 수학 성적 정체   — 초기 상승 후 4개 학기 연속 제자리
//   S2 학부모 응답 지연  — 당일 회신 → 5~9일 지연, 상담 2회 불참
//   S3 관심사 이동      — 의대 지향 → 경제/데이터 쪽으로 표현이 바뀜
//   S4 결석 패턴       — 겨울 이후 월요일에 결석이 몰림
//   S5 진로 발언 변화   — "medicine" → "not sure" → "data/policy"

import type { ConsultationEntry } from '@/types/crm';

/** 데모 학생 식별자 — 화면 조립과 근거 링크에서 공통으로 쓴다. */
export const DEMO_STUDENT_ID = 'newton-demo-student-01';

const note = (
  n: number,
  date: string,
  author: string,
  memo: string,
): ConsultationEntry => ({
  id: `note-${String(n).padStart(2, '0')}`,
  created_at: `${date}T09:00:00.000Z`,
  raw_memo: memo,
  author,
  published: false,
});

export const DEMO_NOTES: ConsultationEntry[] = [
  note(1, '2025-06-12', 'Claire Jung', `Admission interview. Seojun joins Grade 10 in August, transferring from a domestic middle school.
Parents (both physicians) were clear about the goal: US undergraduate, pre-med track, ideally a BS/MD program.
Seojun himself was quiet through most of the meeting. When asked why medicine, he said "my parents are doctors, so I know the field well."
English is conversational but academic writing is untested. Math placement recommended before term starts.`),

  note(2, '2025-06-27', 'Daniel Cho', `Math placement result: strong arithmetic fluency, weak on proof-style reasoning and word problems.
Placed into Algebra II rather than Pre-Calculus. Mother pushed back on the phone, asked whether he could "catch up over summer and move up."
Explained that the gap is conceptual, not pace. She accepted but asked us to re-evaluate in December.
Note for file: family measures progress by placement level, not by understanding. Expect pressure at each review point.`),

  note(3, '2025-08-19', 'Daniel Cho', `First week check-in. Settled in socially faster than expected — joined the basketball intramural group.
Academically cautious; does not volunteer answers but his written work is careful.
Asked him about clubs. He mentioned Model UN "because it sounds useful for applications," not out of interest.`),

  note(4, '2025-09-08', 'Grace Han', `Algebra II — first unit test 78. Errors clustered in multi-step word problems, not computation.
Sat with him for 20 minutes after class. He can do every individual step; he freezes when the problem doesn't state which step comes first.
Started him on a weekly problem-decomposition worksheet. He was receptive, asked to take extra ones home.`),

  note(5, '2025-09-22', 'Claire Jung', `Parent call (mother). Reported the 78 and the intervention plan. She replied within the hour, asked detailed questions, offered to hire an outside tutor.
Advised against a second tutor for now — the issue is method, not volume. She agreed to hold off for one term.
Very engaged. Father has not attended anything yet; mother says he "trusts her judgment on school things."`),

  note(6, '2025-10-06', 'Grace Han', `Second unit test 86. Real improvement — the decomposition worksheets are working.
He now writes out "what is being asked" before starting. Told him plainly that this jump was his own doing. He looked genuinely pleased, first time I've seen that.`),

  note(7, '2025-10-20', 'Ms. Bennett', `English — first analytical essay. C+. Ideas are there, structure is not. He writes as if the reader already agrees with him.
He was frustrated: "In Korean I can write this fine." Explained that the expectation is argument scaffolding, not language ability. He seemed relieved it wasn't a language verdict.`),

  note(8, '2025-11-03', 'Grace Han', `Third unit test 84. Slight dip from 86 but within noise. Watching whether the gain holds.
More notable: he stayed after class to ask whether the statistics unit "is used in economics." Told him yes. He asked two follow-up questions about how economists use regression — the most curious I've seen him about anything.`),

  note(9, '2025-11-17', 'Daniel Cho', `Homeroom check-in. Asked about the pre-med plan. He said "that's the plan" and changed the subject quickly.
When I asked what he'd choose if nothing were decided for him, he said "maybe something with numbers and people." Did not elaborate.
Logging this because it is the first time he has voiced anything other than medicine.`),

  note(10, '2025-12-01', 'Claire Jung', `December review meeting with mother, as promised in June. Presented the Algebra II arc: 78 → 86 → 84.
She focused on the 84 as a decline and returned to the Pre-Calculus question. Held the line: he moves up when proof reasoning is solid, not by calendar.
She accepted but the meeting ended cooler than previous calls. First friction with this family.`),

  note(11, '2025-12-15', 'Grace Han', `End-of-term test 85. Term average 83.
Honest read: he plateaued after the October jump. The decomposition method fixed the entry problem; what's limiting him now is that he doesn't check whether his answer is reasonable.
Needs a different intervention next term, not more of the same.`),

  note(12, '2026-01-12', 'Daniel Cho', `Spring term start. Seojun absent Monday — mother emailed the same morning, family returned late from a trip.
He seemed flat all week. Asked if anything was going on at home; he said no.`),

  note(13, '2026-01-19', 'Daniel Cho', `Absent Monday again. Email from mother arrived Wednesday, two days after.
Noting the response-time change — through the fall she replied within hours.`),

  note(14, '2026-01-26', 'Grace Han', `First unit test of spring term: 84. Same band as December.
Two terms of flat results now. He is doing the assigned work; the work is no longer producing gains.
Recommend moving him to error-analysis journaling — he reviews his own wrong answers and writes why the mistake happened. Will need buy-in from him, not just compliance.`),

  note(15, '2026-02-02', 'Ms. Bennett', `English essay 2: B-. Structure improved noticeably. He used the counterargument frame we drilled.
Topic he chose: whether minimum wage increases help low-income workers. Unprompted, he brought in two data sources.
This is the second time he has gravitated to an economics question when given a free choice.`),

  note(16, '2026-02-09', 'Daniel Cho', `Absent Monday. Third Monday absence this term. No advance notice; mother's note came Thursday.
Raised it gently with Seojun. He said he "gets tired on weekends." Did not push further.`),

  note(17, '2026-02-23', 'Claire Jung', `Scheduled parent conference — mother cancelled 40 minutes before, asked to reschedule "sometime next month."
This is a change. Through the fall she initiated contact herself.
Sent two proposed times; no reply as of today.`),

  note(18, '2026-03-02', 'Grace Han', `Unit test 83. Error-analysis journaling started two weeks ago; too early to judge.
What I can see: his journal entries are thoughtful. He wrote "I stopped reading the question after I recognized the type." That is an accurate self-diagnosis and a good sign.`),

  note(19, '2026-03-09', 'Daniel Cho', `Reply from mother on the conference reschedule — nine days after my note. Took the late-March slot.
Absences: two more Mondays this month.
Pattern is now clear enough to name: Monday clustering since January, and parent responsiveness has gone from hours to roughly a week.`),

  note(20, '2026-03-23', 'Claire Jung', `Parent conference held (mother only; father again absent).
She led with the pre-med timeline and asked about SAT prep starting this summer and which US summer programs would "look good for medical school."
I raised the Monday absences. She said he stays up late on weekends gaming and she is "handling it." Tone was closed.
I did not raise the interest shift — the meeting did not have room for it. Flagging for a separate conversation.`),

  note(21, '2026-04-06', 'Grace Han', `Unit test 87. First movement in four months. The journaling is doing what the worksheets stopped doing.
He came to show me the test himself, which he has never done.`),

  note(22, '2026-04-13', 'Ms. Bennett', `Seojun asked whether he could do his research paper on healthcare pricing rather than a literature topic.
Explained it needs to fit the course, but offered to co-supervise a data-driven angle on health policy as an independent piece.
He said yes immediately. First time he has volunteered for extra work.`),

  note(23, '2026-04-27', 'Daniel Cho', `No Monday absences in three weeks. Correlates with the research paper starting.
Asked him about it. He talked for ten minutes without stopping — about datasets, about why the same procedure costs different amounts.
Asked directly: is medicine still the plan? He said "I like the questions about health more than being a doctor. But I haven't told my parents that."`),

  note(24, '2026-05-11', 'Grace Han', `Unit test 88. Two consecutive gains. He is ready for Pre-Calculus in the fall on merit, not on pressure.
Recommend we frame this to the family carefully — if it lands as "he caught up," we lose the lesson about why he stalled.`),

  note(25, '2026-05-18', 'Claire Jung', `Emailed mother about fall placement and about scheduling a three-way conversation including Seojun on course direction.
No reply after seven days. Sent a follow-up.`),

  note(26, '2026-06-01', 'Ms. Bennett', `Research paper draft submitted, well ahead of the deadline. Quality is above his coursework level.
He has taught himself enough spreadsheet work to build his own comparison tables. Nobody assigned this.`),

  note(27, '2026-06-08', 'Daniel Cho', `Reply from mother, three weeks after Claire's first email. Agreed to Pre-Calculus. Declined the three-way conversation — said course direction is "decided at home."
Told Seojun about the Pre-Calculus move. He asked whether he could also take AP Statistics as an elective. Told him we would look at it.`),

  note(28, '2026-06-22', 'Grace Han', `End-of-year exam 89. Year arc: 78 → 86 → 84 → 83 → 84 → 83 → 87 → 88 → 89.
The story of this year is a five-month plateau that broke when he got ownership over the work.`),

  note(29, '2026-07-13', 'Claire Jung', `Summer check-in call with mother. She asked about SAT prep intensity and BS/MD program requirements.
I raised Seojun's health-policy work and his statistics interest as a strength for any application. She received it as an extracurricular, not as a direction.
Did not have a way to open the larger conversation on a phone call. This needs to happen in person, with him present, before Grade 11 course selection closes in September.`),

  note(30, '2026-08-03', 'Daniel Cho', `Pre-year meeting with Seojun alone. He is anxious about Grade 11 — specifically about "having to decide."
Asked what he would pick with no constraints: economics or public health, with statistics. Said it without hesitating this time.
Asked what stops him from saying that at home: "they've already told everyone I'm going to be a doctor."
He is not resisting his parents. He has not been given a moment where his own answer is asked for. We can build that moment.`),
];
