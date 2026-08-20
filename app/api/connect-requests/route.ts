import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** 「つながる」が押されたことを記録する。実際の接続は運営者が手作業で行う */
export async function POST(request: Request) {
  let experienceId = '';
  let accountId = '';
  let requesterNote: string | null = null;

  try {
    const body = await request.json();
    experienceId = typeof body?.experienceId === 'string' ? body.experienceId.trim() : '';
    accountId = typeof body?.accountId === 'string' ? body.accountId.trim() : '';
    const note = typeof body?.requesterNote === 'string' ? body.requesterNote.trim() : '';
    // 長い相談文がそのまま来ることがあるので、識別できる長さで切る
    requesterNote = note ? note.slice(0, 500) : null;
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (!experienceId || !accountId) {
    return Response.json({ error: 'どの経験談から押されたかが分かりません' }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminSupabase()
      .from('connect_requests')
      .insert({ experience_id: experienceId, account_id: accountId, requester_note: requesterNote })
      .select('request_id')
      .single();

    if (error) throw new Error(error.message);

    return Response.json({ requestId: data.request_id });
  } catch (error) {
    console.error('[api/connect-requests POST]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
