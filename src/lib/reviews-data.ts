import fs from 'fs';
import path from 'path';

const reviewsPath = path.join(process.cwd(), 'src/data/reviews.json');

export type ReviewStatus = 'pending' | 'published' | 'hidden';

export interface ReviewData {
    id: string; // UUID
    title: string;
    category: string;
    author: string;
    authorType: string;
    grade: string;
    rating: number; // 1-5
    content: string;
    date: string; // YYYY.MM.DD
    marketingConsent: boolean;
    rewardType: string;
    contact: string;
    status: ReviewStatus;
    isFeatured: boolean;
}

// Read reviews
export function getReviews(): ReviewData[] {
    if (!fs.existsSync(reviewsPath)) {
        return [];
    }
    const data = fs.readFileSync(reviewsPath, 'utf8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Get Published Reviews (for public site)
export function getPublishedReviews(): ReviewData[] {
    const reviews = getReviews();
    return reviews.filter(r => r.status === 'published');
}

// Get Featured Reviews (for Hero)
export function getFeaturedReviewsData(): ReviewData[] {
    const reviews = getReviews();
    return reviews.filter(r => r.status === 'published' && r.isFeatured).slice(0, 3);
}

// Save reviews
export function saveReviews(reviews: ReviewData[]) {
    // Ensure dir exists
    const dir = path.dirname(reviewsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 4), 'utf8');
}

// Add a new review
export function addReview(review: ReviewData) {
    const reviews = getReviews();
    reviews.unshift(review); // Add to top
    saveReviews(reviews);
}

// Update a review
export function updateReview(id: string, updates: Partial<ReviewData>) {
    const reviews = getReviews();
    const index = reviews.findIndex(r => r.id === id);
    if (index !== -1) {
        reviews[index] = { ...reviews[index], ...updates };
        saveReviews(reviews);
        return true;
    }
    return false;
}

// Delete a review
export function deleteReview(id: string) {
    let reviews = getReviews();
    const initialLength = reviews.length;
    reviews = reviews.filter(r => r.id !== id);
    if (reviews.length !== initialLength) {
        saveReviews(reviews);
        return true;
    }
    return false;
}
