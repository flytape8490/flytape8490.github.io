function calculateHomography(P) {
    const dx1 = P[1].x - P[2].x;
    const dx2 = P[3].x - P[2].x;
    const sx = P[0].x - P[1].x + P[2].x - P[3].x;
    const dy1 = P[1].y - P[2].y;
    const dy2 = P[3].y - P[2].y;
    const sy = P[0].y - P[1].y + P[2].y - P[3].y;

    const D = dx1 * dy2 - dy1 * dx2;
    const g = D !== 0 ? (sx * dy2 - sy * dx2) / D : 0;
    const h = D !== 0 ? (dx1 * sy - dy1 * sx) / D : 0;

    const a = P[1].x - P[0].x + g * P[1].x;
    const b = P[3].x - P[0].x + h * P[3].x;
    const c = P[0].x;
    const d = P[1].y - P[0].y + g * P[1].y;
    const e = P[3].y - P[0].y + h * P[3].y;
    const f = P[0].y;

    return { a, b, c, d, e, f, g, h };
}