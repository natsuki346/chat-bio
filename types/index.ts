export type Experience = {
  label: string;
  title: string;
  body: string;
  point: string;
  /** 相談内容とのマッチ度。0〜100の整数。ストリーミング途中や旧データには無いので任意 */
  score?: number;
  person?: string;
};

/**
 * 出力された1件に「グッド」を付けたという記録。
 * どんな回答を好むのかを後から見られるように、押した中身も一緒に持つ。
 */
export type ReactionTarget = {
  /** ターンと並び位置から作る安定したキー */
  key: string;
  /** そのとき相談していた内容 */
  query: string;
  mode: SearchMode;
  /** 反応した中身。経験談なら見出し、人を探すなら一言 */
  about: string;
  /** 経験談のときの要点 */
  point?: string;
  /** 経験談のときのマッチ度 */
  score?: number;
  person?: string;
};

export type Reaction = ReactionTarget & {
  value: 'good';
  createdAt: string;
};

/** 「何を打って何を聞いたか」の自動ログ。マイカードとは別物。 */
export type HistoryEntry = {
  id: string;
  query: string;
  /** 自分で付け直した名前。無ければ query をそのまま見出しにする */
  title?: string;
  /** 一覧の先頭に固定する */
  pinned?: boolean;
  /** 一覧から外して別枠に寄せる。消したわけではない */
  archived?: boolean;
  mode: SearchMode;
  /** 旧データには無いので任意 */
  model?: ModelId;
  createdAt: string;
  count: number;
  /** 最初に返ってきた見出し／一言 */
  summary?: string;
  /** 開き直せるようにやり取りそのものを持つ */
  turn?: ChatTurn;
};

/** 相談がまだ片付いていないか、解決したか。 */
export type RecordStatus = 'open' | 'resolved';

/**
 * マイカード。履歴から自分で選んで作る。ステータスを持ち、
 * 「繋がる」ときに相手へ送る単位になる。
 * ※TS 組み込みの Record と衝突するので ChatRecord という名前にしている。
 */
export type ChatRecord = {
  id: string;
  /** お題。相談内容から作る短い見出し */
  title: string;
  query: string;
  mode: SearchMode;
  createdAt: string;
  /** 返ってきた件数 */
  count: number;
  /** 最初に返ってきた見出し／一言 */
  summary?: string;
  /** 何に対して相談しているのかの概要。やり取りから自動で作る */
  overview?: string;
  status: RecordStatus;
  /** どの履歴から作ったカードか */
  historyId?: string;
  /** 解決済みにしたときに、何を見てどう解決したかをまとめたもの */
  resolution?: string;
};

/** 「人を探す」モードの1件。経験談は出さず、一言とアカウントだけ見せる。 */
export type PersonHit = {
  quote: string;
  person?: string;
};

export type Article = {
  title: string;
  keywords: string;
  why?: string;
};

export type Person = {
  name: string;
  handle: string;
};

/** 1ターンの中で実際に何が動いたかの記録。履歴を開いたときに経過として見せる。 */
export type ProcessStep = {
  label: string;
  detail?: string;
  /** 開始からの経過ミリ秒 */
  at: number;
};

/**
 * 相手に届く部分。受け手はこれを読んで「なぜ自分に来たか」を掴む。
 */
export type RequestCard = {
  /** 相手が一読で分かるように整理した悩み */
  problem: string;
  /** 今どう考えているか・どういう経緯か */
  thinking: string;
  /** なぜこの人に届いたのか */
  reason: string;
};

/**
 * マッチングレポート。読む人が2人いる1ページ。
 * 送り手は「なぜこの人が出てきたか」を、受け手は card の中身を読む。
 */
export type MatchReport = {
  /** 送り手が読む：なぜこの相手を出力したのかという選定理由 */
  matchReason: string;
  /** 相手に届く部分 */
  card: RequestCard;
  /** 相手に送る最初のメッセージ。編集してから送る */
  greeting: string;
};

/** DM の1通。カードを添えられる。 */
export type DirectMessage = {
  id: string;
  person: string;
  from: 'me' | 'them';
  text: string;
  /** 添えた相談カード（マイカード）の id */
  cardIds: string[];
  /** AI が書いた紹介カード。受け手はこれを見て承認可否を決める */
  card?: RequestCard;
  /** 紹介カードの状態。受け手が承認するか辞退するかを決める */
  cardStatus?: 'pending' | 'approved' | 'declined';
  /** 送り手が何を見て送ってきたか。受け手が背景を理解するために使う */
  context?: {
    /** 見ていた経験談の見出し、または一言 */
    about?: string;
    /** そのときの相談内容 */
    query?: string;
  };
  createdAt: string;
};

export type ChatTurn = {
  id: string;
  query: string;
  /** 送信時に選ばれていた検索モード。表示の出し分けに使う。 */
  mode: SearchMode;
  experiences: Experience[];
  people: PersonHit[];
  articles: Article[];
  /** やり取りから先回りした「次に聞きたいこと」。押すとそのまま次の相談になる */
  followups: string[];
  /** loading: 最初のチャンク待ち / streaming: 本文が流れている最中 */
  status: 'loading' | 'streaming' | 'done' | 'error';
  error?: string;
  steps: ProcessStep[];
};

export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

/** 検索モード。いまは両モードとも同じ API を叩き、見た目だけが切り替わる。 */
export type SearchMode = 'experience' | 'person';
