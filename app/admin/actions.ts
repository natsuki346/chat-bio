'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase';

/*
 * 運営者の操作。
 *
 * 認証は置いていない（フェーズ1の検証用）ので、ここは誰でも叩ける入口だと思って扱う。
 * 受け取るのは「どれを・どうするか」だけにして、本文の作り込みはしない。
 */

/** 「就活/自己分析, 就活/意思決定」のような入力を配列にする */
function toTags(value: string): string[] {
  return value
    .split(/[,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function back(error?: string): never {
  redirect(error ? `/admin?error=${encodeURIComponent(error)}` : '/admin?saved=1');
}

/** 経験談を1件入れる。必ず供給者に紐づける */
export async function addExperience(formData: FormData): Promise<void> {
  const accountId = String(formData.get('accountId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const tags = toTags(String(formData.get('tags') ?? ''));

  // 提供者が特定できない経験談は入れさせない
  if (!accountId) back('提供者を選んでください');
  if (!content) back('経験談の本文を入力してください');

  const { error } = await getAdminSupabase()
    .from('experiences')
    .insert({ account_id: accountId, content, tags });

  if (error) {
    // 23503 = 外部キー違反。存在しない供給者を指している
    back(error.code === '23503' ? 'その提供者は登録されていません' : error.message);
  }

  revalidatePath('/admin');
  back();
}

/** つながるリクエストを対応済みにする（戻すこともできる） */
export async function setConnectStatus(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!requestId || (status !== 'pending' && status !== 'done')) {
    back('更新する内容が不正です');
  }

  const { error } = await getAdminSupabase()
    .from('connect_requests')
    .update({ status })
    .eq('request_id', requestId);

  if (error) back(error.message);

  revalidatePath('/admin');
  back();
}
