export interface FocalPoint {
  x: number;
  y: number;
}

/**
 * Given the image's aspect ratio (W/H) and a focal point in image-relative
 * coordinates (0–1), returns the CSS `object-position` values (0–100 %) that
 * center the focal point in a square container using `object-cover`.
 *
 * For a wide image (W > H) only horizontal panning has slack; for tall
 * images only vertical. Focals outside the reachable band are clamped.
 */
export function focalToObjectPosition(imgAspect: number, focal: FocalPoint): { x: number; y: number } {
  if (!Number.isFinite(imgAspect) || imgAspect <= 0) return { x: 50, y: 50 };
  if (imgAspect > 1) {
    const fMin = 1 / (2 * imgAspect);
    const fMax = 1 - fMin;
    const clamped = Math.min(fMax, Math.max(fMin, focal.x));
    return { x: ((clamped - fMin) / (fMax - fMin)) * 100, y: 50 };
  }
  if (imgAspect < 1) {
    const fMin = imgAspect / 2;
    const fMax = 1 - fMin;
    const clamped = Math.min(fMax, Math.max(fMin, focal.y));
    return { x: 50, y: ((clamped - fMin) / (fMax - fMin)) * 100 };
  }
  return { x: 50, y: 50 };
}

/**
 * Inverse of focalToObjectPosition. Given a tap at (tx, ty) in pixels inside
 * an S×S square tile displaying an image at natural dims (W, H) with the
 * supplied current focal, returns the new focal that would center the tapped
 * image pixel in the tile.
 */
export function tapToFocal(
  tx: number,
  ty: number,
  tileSize: number,
  naturalWidth: number,
  naturalHeight: number,
  currentFocal: FocalPoint,
): FocalPoint {
  const imgAspect = naturalWidth / naturalHeight;
  const pos = focalToObjectPosition(imgAspect, currentFocal);
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  if (imgAspect > 1) {
    const k = tileSize / naturalHeight;
    const displayedW = naturalWidth * k;
    const imgLeft = -(displayedW - tileSize) * (pos.x / 100);
    const imgXAtTap = (tx - imgLeft) / k;
    const imgYAtTap = ty / k;
    return { x: clamp01(imgXAtTap / naturalWidth), y: clamp01(imgYAtTap / naturalHeight) };
  }
  if (imgAspect < 1) {
    const k = tileSize / naturalWidth;
    const displayedH = naturalHeight * k;
    const imgTop = -(displayedH - tileSize) * (pos.y / 100);
    const imgXAtTap = tx / k;
    const imgYAtTap = (ty - imgTop) / k;
    return { x: clamp01(imgXAtTap / naturalWidth), y: clamp01(imgYAtTap / naturalHeight) };
  }
  return currentFocal;
}
