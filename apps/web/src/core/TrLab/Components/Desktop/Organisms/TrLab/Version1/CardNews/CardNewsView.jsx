import { ArrowLeft } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Empty, StageHead } from '@/core/TrLab/Components/Desktop/Molecules/TrLab/Common';
import { CardNewsMaker } from './CardNewsMaker';

export function CardNewsView({ studio, setView, contentPlans }) {
  const plan = studio?.id ? contentPlans[studio.id] : null;
  if (!studio) return <Empty title="카드뉴스로 만들 후보가 없습니다" onClick={() => setView('dashboard')} />;
  return (
    <div className="space-y-5">
      <StageHead title={`${studio.label} 카드뉴스 제작`}>
        <Button variant="outline" onClick={() => setView('plan')}><ArrowLeft className="h-4 w-4" />콘텐츠 설계로</Button>
      </StageHead>
      {plan ? <CardNewsMaker studio={studio} plan={plan} /> : <Empty title="먼저 콘텐츠 설계에서 기획안을 작성해주세요" onClick={() => setView('plan')} />}
    </div>
  );
}
