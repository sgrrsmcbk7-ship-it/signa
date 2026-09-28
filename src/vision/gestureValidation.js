// Error Mode, level 1: problems with the *frame*, checked before any sign is evaluated.
// These block recognition because landmarks are unreliable in these situations.

import { ENGINE } from '../config.js';
import { PRIORITY } from './gestureRules.js';

/**
 * @param f features of the primary hand
 * @param handCount number of detected hands
 * @returns {Array<{key, priority, params?}>} sorted by priority
 */
export function checkFraming(f, handCount, cfg = ENGINE) {
  const issues = [];
  if (handCount > 1) issues.push({ key: 'twoHands', priority: PRIORITY.framing });

  const m = cfg.edgeMargin;
  const { minX, maxX, minY, maxY } = f.bbox;
  if (minX < m || maxX > 1 - m || minY < m || maxY > 1 - m) {
    // The video is shown mirrored, so image-left is screen-right.
    let where = 'center';
    if (minY < m) where = 'down';
    else if (maxY > 1 - m) where = 'up';
    issues.push({ key: 'outOfFrame', priority: PRIORITY.framing + 0.1, params: { where } });
  }
  if (f.handSize < cfg.minHandSize) issues.push({ key: 'tooFar', priority: PRIORITY.framing + 0.2 });
  else if (f.handSize > cfg.maxHandSize) issues.push({ key: 'tooClose', priority: PRIORITY.framing + 0.2 });

  return issues.sort((a, b) => a.priority - b.priority);
}
