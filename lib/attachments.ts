import type { Attachment } from '@/types';

/** 1ファイルあたりの上限。これを超える分は切って、切ったことを本文に書く */
const MAX_CHARS = 20000;
/** 一度に添えられる数 */
export const MAX_FILES = 5;

/**
 * 読める形式だけを受け取る。
 * 中身を文字として取り出してモデルに渡すので、テキストにできないものは弾く。
 */
export const ACCEPT =
  '.txt,.md,.markdown,.csv,.tsv,.json,.yml,.yaml,.html,.css,.js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.java,.sh,.sql,text/*';

const READABLE = /\.(txt|md|markdown|csv|tsv|json|ya?ml|html?|css|m?jsx?|m?tsx?|py|rb|go|rs|java|sh|sql|toml|ini|env)$/i;

function isReadable(file: File): boolean {
  return file.type.startsWith('text/') || READABLE.test(file.name);
}

export type ReadResult = {
  attachments: Attachment[];
  /** 読めなかったファイル名。理由を添えて利用者に見せる */
  skipped: string[];
};

/** 選ばれたファイルを読んで、モデルに渡せる形にする。 */
export async function readAttachments(files: File[]): Promise<ReadResult> {
  const attachments: Attachment[] = [];
  const skipped: string[] = [];

  for (const file of files.slice(0, MAX_FILES)) {
    if (!isReadable(file)) {
      skipped.push(file.name);
      continue;
    }
    try {
      const raw = await file.text();
      const text =
        raw.length > MAX_CHARS ? `${raw.slice(0, MAX_CHARS)}\n…（長いのでここまで）` : raw;
      if (!text.trim()) {
        skipped.push(file.name);
        continue;
      }
      attachments.push({ name: file.name, text });
    } catch {
      skipped.push(file.name);
    }
  }

  return { attachments, skipped };
}

/** 添付を、相談本文のうしろに足す形に組み立てる。 */
export function withAttachments(query: string, attachments: Attachment[]): string {
  if (attachments.length === 0) return query;
  const blocks = attachments.map((item) => `--- 添付ファイル: ${item.name}\n${item.text}`);
  return [query, '', ...blocks].join('\n');
}
