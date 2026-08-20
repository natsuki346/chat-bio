/**
 * 「つながる」が押されたことを運営者に伝える。
 *
 * 実際の接続は運営者が手作業で行うので、ここでは待ち行列に1件積むだけ。
 * 記録に失敗しても送信そのものは止めない（利用者の操作は完了させる）。
 */
export async function logConnectRequest({
  experienceId,
  accountId,
  requesterNote,
}: {
  experienceId?: string;
  accountId?: string;
  requesterNote?: string;
}): Promise<void> {
  // DB を入れる前に作られた記録には id が無い。その場合は繋ぎ先が特定できないので送らない
  if (!experienceId || !accountId) return;

  try {
    await fetch('/api/connect-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experienceId, accountId, requesterNote }),
    });
  } catch {
    // 記録できなくても本体は進める
  }
}
