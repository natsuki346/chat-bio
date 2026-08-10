export function extractJsonArray(raw: string): unknown[] {
  const s = raw.replace(/```json|```/g, '').trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b <= a) throw new Error('JSON配列が見つからない: ' + s.slice(0, 200));
  return JSON.parse(s.slice(a, b + 1));
}

/**
 * 途中までしか届いていない JSON 配列を、閉じ括弧などを補って parse できる形に直す。
 * 直せない形（例：数値や true が書きかけ）のときは null を返し、呼び出し側は次のチャンクを待つ。
 */
function repair(input: string): string | null {
  // '{' か '[' を積んでいく。オブジェクトのフレームだけ「: を見たか」を並行して持つ
  const stack: ('{' | '[')[] = [];
  const colonSeen: boolean[] = [];
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let stringIsKey = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }

    if (c === '"') {
      inString = true;
      escaped = false;
      stringStart = i;
      // オブジェクト直下でまだ ':' が来ていない位置の文字列＝キー
      stringIsKey = stack[stack.length - 1] === '{' && !colonSeen[colonSeen.length - 1];
    } else if (c === '{') {
      stack.push('{');
      colonSeen.push(false);
    } else if (c === '[') {
      stack.push('[');
    } else if (c === '}') {
      if (stack.pop() === '{') colonSeen.pop();
    } else if (c === ']') {
      stack.pop();
    } else if (c === ':') {
      if (colonSeen.length > 0) colonSeen[colonSeen.length - 1] = true;
    } else if (c === ',') {
      if (stack[stack.length - 1] === '{' && colonSeen.length > 0) {
        colonSeen[colonSeen.length - 1] = false;
      }
    }
  }

  let s = input;
  const markPairComplete = () => {
    if (stack[stack.length - 1] === '{' && colonSeen.length > 0) {
      colonSeen[colonSeen.length - 1] = true;
    }
  };

  if (inString) {
    // 書きかけのエスケープを落としてから閉じる
    s = s.replace(/\\u[0-9a-fA-F]{0,3}$/, '');
    if (escaped) s = s.slice(0, -1);
    if (stringIsKey) {
      // キーが書きかけ＝値がまだ無いので、キーごと（直前のカンマも）捨てる
      s = s.slice(0, stringStart).replace(/,\s*$/, '');
      markPairComplete();
    } else {
      s += '"';
    }
  }

  s = s.trimEnd();
  if (s.endsWith(',')) {
    s = s.slice(0, -1).trimEnd();
    markPairComplete();
  }
  if (s.endsWith(':')) {
    s += 'null';
  } else if (
    stack[stack.length - 1] === '{' &&
    colonSeen.length > 0 &&
    !colonSeen[colonSeen.length - 1] &&
    s.endsWith('"')
  ) {
    // キーだけ来て ':' がまだ
    s += ':null';
  }

  for (let i = stack.length - 1; i >= 0; i--) {
    s += stack[i] === '{' ? '}' : ']';
  }

  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? s : null;
  } catch {
    return null;
  }
}

/** ストリーミング途中のテキストから、今読めるところまでの JSON 配列を取り出す。 */
export function parsePartialJsonArray(raw: string): unknown[] | null {
  const s = raw.replace(/```json|```/g, '');
  const a = s.indexOf('[');
  if (a < 0) return null;
  const repaired = repair(s.slice(a));
  if (repaired === null) return null;
  return JSON.parse(repaired) as unknown[];
}
