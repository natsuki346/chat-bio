import QueryBubble from './QueryBubble';
import ExperienceCard from './ExperienceCard';
import ArticleRefs from './ArticleRefs';
import FollowUps from './FollowUps';
import LoadingDots from './LoadingDots';
import ProcessTrail from './ProcessTrail';
import { turnAnchorId } from './ThreadOutline';
import { withAttachments } from '@/lib/attachments';
import type { ChatTurn, ModelId } from '@/types';

export default function ChatLog({
  turns,
  model,
  onRetry,
  onAsk,
}: {
  turns: ChatTurn[];
  model: ModelId;
  onRetry?: (query: string) => void;
  /** 「次に聞きたいこと」を押したときに、そのまま次の相談として送る */
  onAsk?: (query: string) => void;
}) {
  return (
    <div className="space-y-10">
      {turns.map((turn) => (
        // 右の一覧から飛べるように、質問ごとに目印を付ける。
        // scroll-mt は上に固定されているヘッダーぶんの余白
        <section key={turn.id} id={turnAnchorId(turn.id)} className="scroll-mt-6 space-y-4">
          <QueryBubble query={turn.query} />

          <ProcessTrail steps={turn.steps} />

          {turn.status === 'loading' && <LoadingDots />}

          {turn.status === 'error' && (
            <div className="rounded-lg border border-line bg-white px-3 py-2.5">
              <p className="text-[13px] leading-relaxed text-muted">
                {turn.error ?? '取得に失敗しました。もう一度試してください'}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(turn.query)}
                  className="mt-2 rounded-full border border-line-strong bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-accent-strong"
                >
                  もう一度相談する
                </button>
              )}
            </div>
          )}

          {/*
            近い経験が1件も無かったとき。黙って空にすると失敗に見えるので、
            「まだ無い」ことをそのまま伝える（この相談は unmatched_logs に残る）
          */}
          {turn.status === 'done' && turn.experiences.length === 0 && (
            <div className="rounded-lg border border-line bg-white px-3 py-2.5">
              <p className="text-[13px] leading-relaxed text-muted">
                今のところ、この悩みに近い経験を持つ人がまだ登録されていません。
                <br />
                同じことを経験した人が加わったときに、届けられるようにしておきます。
              </p>
            </div>
          )}

          {(turn.status === 'streaming' || turn.status === 'done') && turn.experiences.length > 0 && (
            <>
              <p className="text-[11px] tracking-wide text-muted">同じ経験をした人の話</p>
              <div className="space-y-3">
                {turn.experiences.map((experience, index) => (
                  <ExperienceCard
                    key={`${turn.id}-${index}`}
                    experience={experience}
                    streaming={turn.status === 'streaming'}
                    // 添えたカードの中身も含めて渡す。レポート作成（チャットする／繋がる）が
                    // 打った一言だけで悩みを判断してしまわないように
                    query={withAttachments(turn.query, turn.attachments ?? [])}
                    model={model}
                    reactionKey={`${turn.id}:${index}`}
                  />
                ))}
              </div>
              {turn.status === 'done' && <ArticleRefs articles={turn.articles} />}
            </>
          )}

          {turn.status === 'done' && onAsk && (
            <FollowUps followups={turn.followups} onAsk={onAsk} />
          )}
        </section>
      ))}
    </div>
  );
}
