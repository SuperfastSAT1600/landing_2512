export type AuthorType = "Student" | "Parent";
export type StudentGrade = "8학년 이하" | "9학년" | "10학년" | "11학년" | "12학년";
export type ReviewCategory = "목표 점수 달성" | "학습 코치 만족" | "학습 관리 만족";

export interface Review {
    id: string;
    title: string;
    content: string;
    author: string;
    authorType: AuthorType;
    grade: StudentGrade;
    category: ReviewCategory;
    rating: number;
    isFeatured: boolean;
    date: string;
}

export const reviews: Review[] = [
    {
        id: 'r1',
        title: "8주 만에 1550점 달성했습니다!",
        content: "처음 1300점대에서 정체되어 있었는데, 8주 만에 1550점을 찍었습니다. 선생님들의 밀착 코칭 덕분이에요! 매주 진행되는 모의고사 분석과 1:1 상담이 정말 큰 도움이 되었습니다. 특히 제가 취약했던 리딩 섹션에서 정답의 근거를 찾는 방법을 확실하게 배운 것이 점수 상승의 주요 원인이었던 것 같아요. 목표했던 아이비리그 대학에 지원할 수 있는 점수를 받게 되어 너무 기쁩니다.",
        author: "minji***",
        authorType: "Student",
        grade: "11학년",
        category: "목표 점수 달성",
        rating: 5,
        isFeatured: true,
        date: "2024.11.15"
    },
    {
        id: 'r2',
        title: "수학 시간 단축 비법이 대박입니다",
        content: "SuperfastSAT의 Math 문제 풀이 방식은 정말 혁명적이었습니다. 시간 부족으로 항상 고생했는데 이제 시간이 남아요. 이전에는 모든 문제를 정석대로 풀려고 하니 시간이 항상 부족했는데, 선생님께서 알려주신 Shortcut 방식과 패턴 인식 훈련 덕분에 문제를 보자마자 어떻게 접근해야 할지 바로 알 수 있게 되었습니다. 덕분에 수학은 만점을 받았고 전체 점수도 크게 올랐습니다.",
        author: "david***",
        authorType: "Student",
        grade: "10학년",
        category: "학습 코치 만족",
        rating: 5,
        isFeatured: true,
        date: "2024.11.02"
    },
    {
        id: 'r3',
        title: "온라인 수업으로 집중하는 건 처음 봅니다",
        content: "아이가 온라인 수업으로 이렇게 집중하는 건 처음 봤습니다. 매주 제공되는 학습 리포트 덕분에 믿고 맡길 수 있었어요.",
        author: "seoyeon_mom***",
        authorType: "Parent",
        grade: "9학년",
        category: "학습 관리 만족",
        rating: 5,
        isFeatured: true,
        date: "2024.10.28"
    },
    {
        id: 'r4',
        title: "Reading 점수가 수직 상승했어요",
        content: "지문 분석하는 법을 배우고 나서 Reading이 더 이상 두렵지 않습니다. 정답 근거 찾는 속도가 빨라졌어요.",
        author: "jaehoon***",
        authorType: "Student",
        grade: "12학년",
        category: "목표 점수 달성",
        rating: 5,
        isFeatured: false,
        date: "2024.10.15"
    },
    {
        id: 'r5',
        title: "코치님의 멘탈 관리 덕분에 포기하지 않았어요",
        content: "점수가 안 올라서 슬럼프가 왔을 때 코치님이 진심으로 상담해주셔서 극복할 수 있었습니다. 정말 감사합니다.",
        author: "emily***",
        authorType: "Student",
        grade: "11학년",
        category: "학습 코치 만족",
        rating: 5,
        isFeatured: false,
        date: "2024.09.30"
    },
    {
        id: 'r6',
        title: "취약 유형만 골라서 풀 수 있어서 효율적",
        content: "Weakness Trainer로 제가 자주 틀리는 유형만 집중 공략하니까 점수가 금방 올랐어요. 시간 낭비 없는 공부법입니다.",
        author: "woojin***",
        authorType: "Student",
        grade: "10학년",
        category: "학습 관리 만족",
        rating: 5,
        isFeatured: false,
        date: "2024.09.12"
    },
    {
        id: 'r7',
        title: "SAT를 처음 준비하는데 방향이 잡혔습니다",
        content: "8학년이라 너무 이른가 싶었는데, 기초부터 탄탄하게 잡아주셔서 고등학교 진학 전에 자신감이 생겼습니다.",
        author: "sarah***",
        authorType: "Student",
        grade: "8학년 이하",
        category: "학습 코치 만족",
        rating: 5,
        isFeatured: false,
        date: "2024.08.25"
    },
    {
        id: 'r8',
        title: "아이가 스스로 책상에 앉게 되었어요",
        content: "공부하라고 잔소리하지 않아도 코치님이 챙겨주시니 아이가 스스로 스케줄을 관리하네요. 놀라운 변화입니다.",
        author: "youngsu_par***",
        authorType: "Parent",
        grade: "10학년",
        category: "학습 관리 만족",
        rating: 5,
        isFeatured: false,
        date: "2024.08.10"
    },
    {
        id: 'r9',
        title: "목표했던 1500점을 넘겼습니다!",
        content: "혼자 공부할 때는 막막했는데, 커리큘럼대로 따라가니 점수가 오르는 게 보였습니다. 후회 없는 선택이었어요.",
        author: "michael***",
        authorType: "Student",
        grade: "12학년",
        category: "목표 점수 달성",
        rating: 5,
        isFeatured: false,
        date: "2024.07.22"
    }
];

export function getFeaturedReviews() {
    return reviews.filter(review => review.isFeatured).slice(0, 3);
}
