import QueryBubble from './QueryBubble';
import ExperienceCard from './ExperienceCard';
import PersonCard from './PersonCard';
import ArticleRefs from './ArticleRefs';
import LoadingDots from './LoadingDots';
import ProcessTrail from './ProcessTrail';
import type { ChatTurn, ModelId } from '@/types';

export default function ChatLog({
  turns,
  model,
  onRetry,
}: {
  turns: ChatTurn[];
  model: ModelId;
  onRetry?: (query: string) => void;
}) {
  return (
    <div className="space-y-10">
      {turns.map((turn) => (
        <section key={turn.id} className="space-y-4">
          <QueryBubble query={turn.query} />

          <ProcessTrail steps={turn.steps} />

          {turn.status === 'loading' && <LoadingDots />}

          {turn.status === 'error' && (
            <div className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2.5">
              <p className="text-[13px] leading-relaxed text-[#666666]">
                {turn.error ?? '取得に失敗しました。もう一度試してください'}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(turn.query)}
                  className="mt-2 rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[12px] text-black transition-colors hover:border-black"
                >
                  もう一度相談する
                </button>
              )}
            </div>
          )}

          {(turn.status === 'streaming' || turn.status === 'done') &&
            (turn.mode === 'person' ? (
              <>
                <p className="text-[11px] tracking-wide text-[#666666]">こう言っている人がいる</p>
                <div className="border-t border-[#e5e5e5]">
                  {turn.people.map((hit, index) => (
                    <PersonCard
                      key={`${turn.id}-${index}`}
                      hit={hit}
                      streaming={turn.status === 'streaming'}
                      query={turn.query}
                      model={model}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] tracking-wide text-[#666666]">同じ経験をした人の話</p>
                <div className="border-t border-[#e5e5e5]">
                  {turn.experiences.map((experience, index) => (
                    <ExperienceCard
                      key={`${turn.id}-${index}`}
                      experience={experience}
                      streaming={turn.status === 'streaming'}
                      query={turn.query}
                      model={model}
                    />
                  ))}
                </div>
                {turn.status === 'done' && <ArticleRefs articles={turn.articles} />}
              </>
            ))}
        </section>
      ))}
    </div>
  );
}
