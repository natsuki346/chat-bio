import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
 * Supabase への接続。鍵は2種類あり、できることが違う。
 *
 * ① publishable（anon）キー … ブラウザにも出る前提の鍵。RLS で anon に許した操作しかできない。
 *    いまのポリシーでは suppliers への insert だけ。＝供給者登録に使う。
 *
 * ② secret キー … RLS を迂回する鍵。NEXT_PUBLIC_ を付けないので、
 *    Next.js はこれをクライアントのバンドルに入れない（サーバーでしか読めない）。
 *    experiences の読み取り、connect_requests / unmatched_logs への書き込み、
 *    管理画面はすべてこちらが要る。
 *
 * ②は必ず app/api/* のルートハンドラ・Server Component・Server Action の中だけで使うこと。
 * 'use client' の付いたファイルから呼ぶと、その時点でバンドルに入ってしまう。
 */

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function url(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL が設定されていません（.env.local を確認）');
  }
  return value;
}

/** anon 相当。RLS で許された操作しかできない（＝供給者登録） */
export function getPublicSupabase(): SupabaseClient {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません（.env.local を確認）',
    );
  }

  if (!publicClient) {
    publicClient = createClient(url(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicClient;
}

/**
 * RLS を迂回する。サーバー側からのみ呼ぶこと。
 * 鍵が無いときは、何が足りないのかが分かる形で落とす。
 */
export function getAdminSupabase(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SECRET_KEY が設定されていません。' +
        'experiences の読み取りや connect_requests への記録には、RLS を迂回できる鍵が要ります（.env.local を確認）',
    );
  }

  if (!adminClient) {
    adminClient = createClient(url(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** 管理画面で「まだ鍵が無い」と出し分けるために使う */
export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/**
 * 埋め込んだ関連（suppliers(username) など）を1件取り出す。
 * 実際は1対1でもクライアントの型では配列に見えることがあるので、どちらの形でも受ける。
 */
export function one<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}
