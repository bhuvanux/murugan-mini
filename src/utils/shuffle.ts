/**
 * Fisher-Yates shuffle algorithm for randomizing arrays
 * Uses crypto.getRandomValues for better randomization
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        // Use crypto for better randomness
        const randomBytes = new Uint32Array(1);
        crypto.getRandomValues(randomBytes);
        const j = randomBytes[0] % (i + 1);

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}
