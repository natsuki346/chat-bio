import QueryBubble from './QueryBubble';
import ExperienceCard from './ExperienceCard';
import PersonCard from './PersonCard';
import ArticleRefs from './ArticleRefs';
import FollowUps from './FollowUps';
import LoadingDots from './LoadingDots';
import ProcessTrail from './ProcessTrail';
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
        <section key={turn.id} className="space-y-4">
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

          {(turn.status === 'streaming' || turn.status === 'done') &&
            (turn.mode === 'person' ? (
              <>
                <p className="text-[11px] tracking-wide text-muted">こう言っている人がいる</p>
                <div className="border-t border-line">
                  {turn.people.map((hit, index) => (
                    <PersonCard
                      key={`${turn.id}-${index}`}
                      hit={hit}
                      streaming={turn.status === 'streaming'}
                      query={turn.query}
                      model={model}
                      reactionKey={`${turn.id}:${index}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] tracking-wide text-muted">同じ経験をした人の話</p>
                <div className="border-t border-line">
                  {turn.experiences.map((experience, index) => (
                    <ExperienceCard
                      key={`${turn.id}-${index}`}
                      experience={experience}
                      streaming={turn.status === 'streaming'}
                      query={turn.query}
                      model={model}
                      reactionKey={`${turn.id}:${index}`}
                    />
                  ))}
                </div>
                {turn.status === 'done' && <ArticleRefs articles={turn.articles} />}
              </>
            ))}

          {turn.status === 'done' && onAsk && (
            <FollowUps followups={turn.followups} onAsk={onAsk} />
          )}
        </section>
      ))}
    </div>
  );
}
