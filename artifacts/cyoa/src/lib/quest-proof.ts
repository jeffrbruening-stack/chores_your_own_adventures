// Upload a proof photo for a quest assignment.
// 1) Ask the API for a signed upload URL, 2) PUT the file directly to storage,
// 3) return the /objects/... path to send with the completion request.
export async function uploadQuestProof(assignmentId: number, file: File): Promise<string> {
  const token = localStorage.getItem('cyoa_token');
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const urlRes = await fetch(`${BASE}/api/quests/assignments/${assignmentId}/proof-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(err.error ?? 'Could not start photo upload');
  }
  const { uploadURL, objectPath } = await urlRes.json();

  const putRes = await fetch(uploadURL, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!putRes.ok) throw new Error('Photo upload failed');

  return objectPath;
}

// Complete a quest assignment (optionally with an uploaded proof photo path).
export async function completeQuestAssignment(
  assignmentId: number,
  photoPath?: string,
): Promise<{
  status: string;
  xpGained: number;
  goldGained: number;
  xpAwarded: number;
  goldAwarded: number;
  newLevel?: number;
  leveledUp: boolean;
}> {
  const token = localStorage.getItem('cyoa_token');
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${BASE}/api/quests/assignments/${assignmentId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(photoPath ? { photoPath } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to complete quest');
  }
  return res.json();
}

export function proofImageUrl(assignmentId: number): string {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  const token = localStorage.getItem('cyoa_token') ?? '';
  return `${BASE}/api/quests/assignments/${assignmentId}/proof-image?token=${encodeURIComponent(token)}`;
}
