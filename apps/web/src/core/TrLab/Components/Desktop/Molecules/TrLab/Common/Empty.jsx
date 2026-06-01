import { Radar } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import { Card, CardContent } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Card';

export function Empty({ title, onClick }) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-8">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-muted-foreground">트렌드 감지 화면에서 시그널을 수집하고 후보를 선택해 주세요.</p>
        <Button className="w-fit" onClick={onClick}>
          <Radar className="h-4 w-4" />
          레이더로 가기
        </Button>
      </CardContent>
    </Card>
  );
}
