export function dropSeenId(drop) {
  const releaseRevision = drop.unlocked_at ?? '';
  const contentRevision = drop.updatedAt ?? drop.updated_at ?? '';
  return `${drop.id}:${releaseRevision}:${contentRevision}`;
}
