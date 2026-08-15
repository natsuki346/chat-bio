'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import ChatLog from '@/components/ChatLog';
import InputBar from '@/components/InputBar';
import Sidebar, { type SidebarView } from '@/components/Sidebar';
import MyCards from '@/components/MyCards';
import DirectMessages from '@/components/DirectMessages';
import ThreadOutline from '@/components/ThreadOutline';
import { RecordsProvider } from '@/components/RecordsContext';
import { TONE_OPTIONS } from '@/lib/options';
import {
  deriveTitle,
  getRecordsSnapshot,
  getServerRecordsSnapshot,
  subscribeRecords,
  updateRecords,
} from '@/lib/records';
import {
  clearHistory,
  deleteHistory,
  getHistorySnapshot,
  historyTurns,
  getServerHistorySnapshot,
  subscribeHistory,
  updateHistory,
} from '@/lib/history';
import type {
  Article,
  Attachment,
  ChatTurn,
  Experience,
  ModelId,
  ProcessStep,
  Tone,
} from '@/types';

type ChatEvent =
  | { type: 'update' | 'done'; experiences: Experience[] }
  | { type: 'error'; error: string };

const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? '取得に失敗しました');
  }
  return data as T;
}

export default function Page() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  // 語り口。返す中身は変えず、話し方だけを切り替える
  const [tone, setTone] = useState<Tone>('mentor');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<SidebarView>('chat');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // localStorage（React の外）にあるので外部ストアとして購読する。
  // 履歴は自動で溜まるログ、マイカードは自分で作るものなので別々に持つ
  const records = useSyncExternalStore(
    subscribeRecords,
    getRecordsSnapshot,
    getServerRecordsSnapshot,
  );
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, []);

  /** 完成したやり取りを、その相談の末尾に足す（同じ id があれば差し替える）。 */
  const appendTurn = useCallback((historyId: string, finished: ChatTurn) => {
    updateHistory((entries) =>
      entries.map((entry) => {
        if (entry.id !== historyId) return entry;
        const kept = historyTurns(entry).filter((turn) => turn.id !== finished.id);
        return { ...entry, turns: [...kept, finished], turn: undefined };
      }),
    );
  }, []);

  const handleSubmit = useCallback(
    /**
     * @param options.followUp 「次に聞くとしたら」から来た質問。
     *   新しい相談を立てず、いま開いている相談の続きとして積む。
     * @param options.attachments 相談に添えたファイル。中身は相談の後ろに足して渡す。
     */
    async (query: string, options?: { followUp?: boolean; attachments?: Attachment[] }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // 続きなら履歴は増やさず、開いている相談に足していく
      const continuing = Boolean(options?.followUp && activeHistoryId);
      const historyId = continuing && activeHistoryId ? activeHistoryId : id;
      const startedAt = performance.now();
      // 実際に動いた処理だけを積む。ここに出ないものは走っていない
      const steps: ProcessStep[] = [];
      const step = (label: string, detail?: string) => {
        steps.push({ label, detail, at: Math.round(performance.now() - startedAt) });
        setTurns((prev) =>
          prev.map((turn) => (turn.id === id ? { ...turn, steps: [...steps] } : turn)),
        );
      };

      setTurns((prev) => [
        ...prev,
        {
          id,
          query,
          experiences: [],
          articles: [],
          followups: [],
          status: 'loading',
          steps: [],
        },
      ]);
      step(
        '相談を受け取った',
        `語り口: ${TONE_OPTIONS.find((item) => item.value === tone)?.label ?? tone} ／ モデル: ${model}`,
      );
      // 相談した時点で履歴を1件積む（件数と要約は結果が出たら埋める）。続きのときは積まない
      if (!continuing) {
        updateHistory((prev) => [
          { id, query, model, createdAt: new Date().toISOString(), count: 0 },
          ...prev,
        ]);
        setActiveHistoryId(id);
      }
      setView('chat');
      setLoading(true);
      scrollToBottom();

      /*
       * やり取りが終わったらカードを作る。
       * まず素の見出しで作っておき、要約が返ってきたら差し替える。
       * こうしておくと、要約に失敗してもカード自体は残る。
       */
      const saveCard = async (finished: ChatTurn) => {
        const seen = finished.experiences.map((item) => `${item.title}／${item.point}`);

        updateRecords((prev) => [
          {
            id: `card-${finished.id}`,
            historyId: finished.id,
            title: deriveTitle(finished.query),
            query: finished.query,
            createdAt: new Date().toISOString(),
            count: seen.length,
            summary: seen[0],
            status: 'open',
          },
          ...prev.filter((record) => record.id !== `card-${finished.id}`),
        ]);

        try {
          const response = await fetch('/api/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: finished.query, seen, model }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || typeof data?.title !== 'string') return;
          updateRecords((prev) =>
            prev.map((record) =>
              record.id === `card-${finished.id}`
                ? { ...record, title: data.title, overview: data.overview }
                : record,
            ),
          );
        } catch {
          // 見出し付けに失敗しても、素の見出しのカードは残る
        }
      };

      /**
       * やり取りから「次に聞きそうなこと」を先回りする。
       * 出せなくても本体は止めない（その場合は候補が出ないだけ）。
       */
      const askFollowups = async (seen: string[]): Promise<string[]> => {
        const result = await postJson<{ followups: string[] }>('/api/followups', {
          query,
          seen,
          model,
        }).catch(() => ({ followups: [] }));

        if (result.followups.length > 0) {
          step('次に聞きそうなことを考えた', `${result.followups.length}件`);
        }
        return result.followups;
      };

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, model, tone, attachments: options?.attachments ?? [] }),
        });

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => null);
          throw new Error((data as { error?: string } | null)?.error ?? '取得に失敗しました');
        }

        // SSE を読みながら、届いた分だけカードに反映していく
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamError: string | null = null;
        let firstChunk = true;
        // 受け取った最新の中身。完成したターンはここから組み立てる
        let latestExperiences: Experience[] = [];

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const line = event.split('\n').find((item) => item.startsWith('data:'));
            if (!line) continue;

            const payload = JSON.parse(line.slice(5).trim()) as ChatEvent;

            if (payload.type === 'error') {
              streamError = payload.error;
              continue;
            }

            const status = payload.type === 'done' ? 'done' : 'streaming';
            latestExperiences = payload.experiences;

            setTurns((prev) =>
              prev.map((turn) =>
                turn.id === id ? { ...turn, status, experiences: payload.experiences } : turn,
              ),
            );

            if (firstChunk) {
              firstChunk = false;
              step('モデルが応答を返し始めた');
            }

            if (payload.type === 'done') {
              // カードの要約には最初の1件の見出しを使う
              const count = payload.experiences.length;
              const summary = payload.experiences[0]?.title;
              step('経験を選び終えた', `${count}件`);
              updateHistory((prev) =>
                prev.map((entry) =>
                  entry.id === historyId
                    ? // 見出し用の要約は最初の質問のものを残す
                      { ...entry, count, summary: continuing ? entry.summary : summary }
                    : entry,
                ),
              );
            }
          }
        }

        if (streamError) throw new Error(streamError);


        // 記事と「次に聞きたいこと」はストリーミングが終わってから。互いに独立なので並べて取る
        const [articles, followups] = await Promise.all([
          postJson<{ articles: Article[] }>('/api/articles', { query, model }).catch(() => ({
            articles: [],
          })),
          askFollowups(latestExperiences.map((item) => `${item.title}／${item.point}`)),
        ]);
        step('関連記事を選んだ', `12本から${articles.articles.length}件`);

        const finished: ChatTurn = {
          id,
          query,
          experiences: latestExperiences,
          articles: articles.articles,
          followups,
          status: 'done',
          steps: [...steps],
        };
        setTurns((prev) => prev.map((turn) => (turn.id === id ? finished : turn)));
        // 履歴から開き直せるように、完成したターンを履歴に持たせる。
        // 副作用は更新関数の外で行う（更新関数はレンダー中に再実行されうるため）
        appendTurn(historyId, finished);
        // カードは相談ごとに1枚。続きのときは作り直さない
        if (!continuing) void saveCard(finished);
      } catch (error) {
        const message = error instanceof Error ? error.message : '取得に失敗しました';
        steps.push({ label: '失敗した', detail: message, at: Math.round(performance.now() - startedAt) });
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === id ? { ...turn, status: 'error', error: message, steps: [...steps] } : turn,
          ),
        );
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [model, tone, activeHistoryId, appendTurn, scrollToBottom],
  );

  const composer = (docked: boolean) => (
    <InputBar
      onSubmit={(query, attachments) => handleSubmit(query, { attachments })}
      loading={loading}
      model={model}
      onModelChange={setModel}
      tone={tone}
      onToneChange={setTone}
      docked={docked}
    />
  );

  const showCards = view === 'cards';

  return (
    <RecordsProvider records={records}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        view={view}
        onViewChange={setView}
        onNewChat={() => {
          setTurns([]);
          setSelectedRecord(null);
          setActiveHistoryId(null);
          setView('chat');
        }}
        history={history}
        activeHistoryId={activeHistoryId}
        onDeleteHistory={(id) => {
          deleteHistory(id);
          // 開いていた対話を消したら本文も畳む（マイカードには影響しない）
          if (id === activeHistoryId) {
            setActiveHistoryId(null);
            setTurns([]);
          }
        }}
        onClearHistory={() => {
          clearHistory();
          setActiveHistoryId(null);
          setTurns([]);
        }}
        onSelectHistory={(id) => {
          const entry = history.find((item) => item.id === id);
          if (!entry) return;
          setActiveHistoryId(id);
          setView('chat');
          // やり取りが保存されていれば、続きも含めて全部そのまま開く。
          // 無い場合（履歴を分ける前の古い記録）も、打った文面と再実行だけは出す
          const saved = historyTurns(entry);
          setTurns(
            saved.length > 0
              ? saved
              : [
                  {
                    id: entry.id,
                    query: entry.query,
                    experiences: [],
                    articles: [],
                    followups: [],
                    status: 'error',
                    error:
                      'この相談は、やり取りを保存するようになる前のものです。内容は残っていません。',
                    steps: [],
                  },
                ],
          );
        }}
      />

      {/* スマホでサイドバーを開くボタン。PC はサイドバーが常時出ているので不要 */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="サイドバーを開く"
        className="fixed left-4 top-4 z-20 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink lg:hidden"
      >
        メニュー
      </button>

      {/* サイドバーぶんだけ右に寄せる（PC のみ） */}
      <div className="lg:pl-[260px]">
        {view === 'dm' ? (
          // チャットは画面いっぱいを使うので、余白付きの main では包まない
          <DirectMessages />
        ) : showCards ? (
          <main className="mx-auto w-full max-w-[600px] px-5 pt-16 pb-20 lg:pt-10">
            <MyCards
              selectedId={selectedRecord}
              onSelect={setSelectedRecord}
              onAskAgain={(query) => handleSubmit(query)}
              model={model}
            />
          </main>
        ) : turns.length === 0 ? (
          // 会話が始まる前は、名前を左上に置いて入力欄を画面中央に置く
          <main
            className="mx-auto flex w-full max-w-[720px] flex-col px-5 pb-10 pt-16 lg:pt-10"
            // dvh + interactiveWidget で、スマホのキーボードに合わせて中央がせり上がる
            style={{ minHeight: '100dvh' }}
          >
            <div className="flex flex-1 flex-col justify-center gap-5">
              <h1 className="text-center text-[20px] font-medium leading-snug tracking-tight text-ink">
                何か相談してみましょう
              </h1>
              {composer(false)}
            </div>
          </main>
        ) : (
          // 始まったら入力欄は下に固定して、ログを上に伸ばす
          <main className="mx-auto w-full max-w-[600px] px-5 pt-16 pb-64 lg:pt-10">
            <header className="pb-10">
              <h1 className="text-[17px] font-medium tracking-tight text-ink">Brain</h1>
            </header>

            <ChatLog
              turns={turns}
              model={model}
              onRetry={handleSubmit}
              // 「次に聞くとしたら」は新しい相談を立てず、この相談の続きにする
              onAsk={(q) => handleSubmit(q, { followUp: true })}
            />

            <div ref={bottomRef} />

            <ThreadOutline turns={turns} />

            {composer(true)}
          </main>
        )}
      </div>
    </RecordsProvider>
  );
}
