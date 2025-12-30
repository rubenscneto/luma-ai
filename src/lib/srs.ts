export interface ReviewResult {
    interval: number;
    easeFactor: number;
    nextReview: Date;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const calculateNextReview = (
    currentInterval: number,
    currentEaseFactor: number,
    rating: Rating
): ReviewResult => {
    let newInterval = 0;
    let newEaseFactor = currentEaseFactor;

    if (rating === 'again') {
        newInterval = 0; // Reset to 0 (re-learn)
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
    } else if (rating === 'hard') {
        newInterval = currentInterval === 0 ? 1 : Math.floor(currentInterval * 1.2);
        newEaseFactor = Math.max(1.3, currentEaseFactor - 0.15);
    } else if (rating === 'good') {
        newInterval = currentInterval === 0 ? 1 : Math.floor(currentInterval * 2.5);
    } else if (rating === 'easy') {
        newInterval = currentInterval === 0 ? 4 : Math.floor(currentInterval * currentEaseFactor * 1.3);
        newEaseFactor = currentEaseFactor + 0.15;
    }

    // Calculate Date
    const nextReview = new Date();
    // interval is in days, but if it's 0 (again), we set it to 1 minute for immediate review styling, 
    // but practically in DB we might want to just set it to "now". 
    // For this simple implementation:
    // If interval 0 -> review in 1 minute
    if (newInterval === 0) {
        nextReview.setMinutes(nextReview.getMinutes() + 1);
    } else {
        nextReview.setDate(nextReview.getDate() + newInterval);
    }

    return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        nextReview
    };
};
