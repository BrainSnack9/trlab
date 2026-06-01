import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Empty, StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { createContentPlan } from '@/core/TrLab/modules/clients/api';
import { CardNewsMaker } from './CardNewsMaker';

export function CardNewsView({ studio, setView, contentPlans, setContentPlans }) {
  const [refreshToken, setRefreshToken] = useState(0);
  const { plan, loading, error } = useContentPlan(studio, contentPlans, setContentPlans, refreshToken);
  if (!studio) return <Empty title="카드뉴스로 만들 후보가 없습니다" onClick={() => setView('dashboard')} />;
  return (
    <div className="space-y-5">
      <StageHead label="Step 04 · Card News Factory" title={`${studio.label} 카드뉴스 제작`} description="LLM 시나리오를 실제 카드뉴스 초안으로 렌더링하고 PNG/SVG로 내려받습니다.">
        <Button variant="outline" onClick={() => setView('studio')}><ArrowLeft className="h-4 w-4" />스튜디오로</Button>
      </StageHead>
      {loading && !plan && <LoadingBox />}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {plan && <CardNewsMaker studio={studio} plan={plan} regenerating={loading} onRegenerate={() => setRefreshToken((value) => value + 1)} />}
    </div>
  );
}

function LoadingBox() {
  return <div className="flex items-center gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />카드뉴스 시나리오를 불러오는 중입니다.</div>;
}

function useContentPlan(studio, contentPlans, setContentPlans, refreshToken) {
  const key = studio?.id;
  const [state, setState] = useState({ loading: false, error: '' });
  useEffect(() => {
    if (!studio || (contentPlans[key] && refreshToken === 0)) return;
    let active = true;
    setState({ loading: true, error: '' });
    createContentPlan(studio, { refresh: Boolean(refreshToken) })
      .then((data) => active && setContentPlans((plans) => ({ ...plans, [key]: data.plan })))
      .catch((error) => active && setState({ loading: false, error: error.message }))
      .finally(() => active && setState((current) => ({ ...current, loading: false })));
    return () => { active = false; };
  }, [studio, key, contentPlans, setContentPlans, refreshToken]);
  return { plan: contentPlans[key], ...state };
}
