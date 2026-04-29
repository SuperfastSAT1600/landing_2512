import fs from 'fs';
import path from 'path';

const coachesPath = path.join(process.cwd(), 'src/data/coaches.json');

export interface CoachData {
    slug: string;              // URL identifier (jimmy)
    name: string;              // 표시 이름
    photo: string;             // 이미지 URL
    bio: string;               // 소개 멘트
    curriculumPostSlug: string; // 커리큘럼 탭에 전체 렌더링할 포스팅 slug
    isActive: boolean;         // 공개 여부
}

/** Read all coaches from JSON store. Returns empty array if file is missing or corrupt. */
export function getCoaches(): CoachData[] {
    if (!fs.existsSync(coachesPath)) {
        return [];
    }
    const data = fs.readFileSync(coachesPath, 'utf8');
    try {
        return JSON.parse(data) as CoachData[];
    } catch {
        return [];
    }
}

/** Get only active (public) coaches. */
export function getActiveCoaches(): CoachData[] {
    return getCoaches().filter(c => c.isActive);
}

/** Get a single coach by slug. Returns undefined if not found. */
export function getCoachBySlug(slug: string): CoachData | undefined {
    return getCoaches().find(c => c.slug === slug);
}

/** Persist the full coaches array to disk. */
export function saveCoaches(coaches: CoachData[]): void {
    const dir = path.dirname(coachesPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(coachesPath, JSON.stringify(coaches, null, 4), 'utf8');
}

/** Add a new coach. Prepends to the list. */
export function addCoach(coach: CoachData): void {
    const coaches = getCoaches();
    coaches.unshift(coach);
    saveCoaches(coaches);
}

/** Update a coach by slug. Returns true if found and updated, false otherwise. */
export function updateCoach(slug: string, updates: Partial<CoachData>): boolean {
    const coaches = getCoaches();
    const index = coaches.findIndex(c => c.slug === slug);
    if (index === -1) {
        return false;
    }
    coaches[index] = { ...coaches[index], ...updates };
    saveCoaches(coaches);
    return true;
}

/** Delete a coach by slug. Returns true if found and deleted, false otherwise. */
export function deleteCoach(slug: string): boolean {
    const coaches = getCoaches();
    const filtered = coaches.filter(c => c.slug !== slug);
    if (filtered.length === coaches.length) {
        return false;
    }
    saveCoaches(filtered);
    return true;
}
