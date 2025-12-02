export const smoothPoint = (prev, next, factor = 0.35) => {
    if (!prev) {
        return next;
    }
    return [
        prev[0] + (next[0] - prev[0]) * factor,
        prev[1] + (next[1] - prev[1]) * factor,
        prev[2] + (next[2] - prev[2]) * factor
    ];
};
export const computeVelocity = (points, delta = 1 / 30) => {
    if (points.length < 2) {
        return 0;
    }
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const dx = last[0] - prev[0];
    const dy = last[1] - prev[1];
    const dz = last[2] - prev[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance / delta;
};
export const normalizeLandmark = (x, y) => [
    (x - 0.5) * 6,
    (0.5 - y) * 6,
    0
];
