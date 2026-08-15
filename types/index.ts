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
  /** 反応した中身＝経験の見出し */
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
  /** 旧データには無いので任意 */
  model?: ModelId;
  createdAt: string;
  count: number;
  /** 最初に返ってきた見出し／一言 */
  summary?: string;
  /** 開き直せるように、この相談で交わしたやり取りを順に持つ */
  turns?: ChatTurn[];
  /** 1相談＝1往復だった頃の記録。読むときだけ使う */
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
  /** この相談に添えたもの。レポート作成時に query と合わせて渡すため、ターンにも残しておく */
  attachments?: Attachment[];
  experiences: Experience[];
  articles: Article[];
  /** やり取りから先回りした「次に聞きたいこと」。押すとそのまま次の相談になる */
  followups: string[];
  /** loading: 最初のチャンク待ち / streaming: 本文が流れている最中 */
  status: 'loading' | 'streaming' | 'done' | 'error';
  error?: string;
  steps: ProcessStep[];
};

export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

/** 語り口。返ってくる話の中身は変えず、話し方だけを変える。 */
export type Tone = 'friend' | 'mentor' | 'expert';

/** 画面のモード。整理＝AIと悩みを深める、相談＝経験者を探す。 */
export type AppMode = 'organize' | 'consult';

/** 整理モードのやり取り1件。 */
export type OrganizeMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
};

/**
 * 整理モードで育てる悩みカード。
 * draft: 対話しながら書き換わる ／ approved: 本人が確定した ／ sent: 相手に送った
 */
export type IssueCard = {
  id: string;
  status: 'draft' | 'approved' | 'sent';
  /** 一覧で見分けるための見出し */
  title: string;
  /** 概要 */
  summary: string;
  /** 背景。どういう経緯でそうなっているか */
  background: string;
  /** 具体的に困っていること */
  problems: string[];
  /** どんな話を聞きたいか */
  wants: string[];
  /** 経験者に相談できるだけの材料が揃ったか。エージェントの判断 */
  ready: boolean;
  /** 整理のやり取り。承認後も「どう整理されたか」の経緯として残す */
  messages: OrganizeMessage[];
  createdAt: string;
  approvedAt?: string;
};

/** 相談に添えたファイル。中身を文字にして相談と一緒に渡す。 */
export type Attachment = {
  name: string;
  text: string;
};
