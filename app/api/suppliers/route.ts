import { getPublicSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** 形だけ見る。認証メールは送らないので、届くかどうかまでは確かめない */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 供給者を1人登録する。入力は username と email だけ（30秒で終わらせる） */
export async function POST(request: Request) {
  let username = '';
  let email = '';

  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username.trim() : '';
    email = typeof body?.email === 'string' ? body.email.trim() : '';
  } catch {
    return Response.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (!username) {
    return Response.json({ error: '表示名を入力してください' }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return Response.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 });
  }

  /*
   * account_id は列の既定値に任せず、こちらで作って明示的に入れる。
   *
   * RLS で anon に許してあるのは insert だけなので、
   * .select() で「入れた行」を返させようとすると select 権限が要り 42501 で弾かれる。
   * 先に id を決めておけば、読み戻さずに何が入ったか分かる。
   */
  const accountId = crypto.randomUUID();

  try {
    const { error } = await getPublicSupabase()
      .from('suppliers')
      .insert({ account_id: accountId, username, email });

    if (error) {
      // 23505 = unique 違反。username は重複させない
      if (error.code === '23505') {
        return Response.json(
          { error: 'その表示名はすでに使われています。別の名前にしてください' },
          { status: 409 },
        );
      }
      throw new Error(error.message);
    }

    // 画面には出さないが、このブラウザが誰なのかを覚えるために返す
    return Response.json({ accountId, username });
  } catch (error) {
    console.error('[api/suppliers POST]', error);
    const message = error instanceof Error ? error.message : '不明なエラー';
    return Response.json({ error: message }, { status: 500 });
  }
}
