'use client';

import { Check, FolderKanban, RotateCcw } from 'lucide-react';
import { Button } from '@/core/TrLab/Components/Desktop/Atoms/TrLab/Common/Button/Button';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import useWorkDialogs from '@/core/TrLab/modules/controller/useWorkDialogs';

const ageOptions = [
  ['none', '안함'],
  ['10s', '10대'],
  ['20s', '20대'],
  ['30s', '30대'],
  ['40s', '40대'],
  ['50s', '50대+'],
  ['all', '전 연령']
];

const genderOptions = [
  ['none', '안함'],
  ['all', '전체'],
  ['female', '여성'],
  ['male', '남성']
];

const situationOptions = [
  ['none', '안함'],
  ['saving', '절약'],
  ['selfDev', '자기계발'],
  ['health', '건강'],
  ['parenting', '육아'],
  ['work', '직장생활'],
  ['relationship', '연애/관계'],
  ['hobby', '취미'],
  ['purchase', '구매 고민'],
  ['search', '정보 탐색'],
  ['trend', '트렌드 확인'],
  ['other', '기타']
];

const objectiveOptions = [
  ['none', '안함'],
  ['save', '저장 유도'],
  ['share', '공유 유도'],
  ['purchase', '구매 전환'],
  ['comment', '댓글 유도'],
  ['awareness', '브랜드 인지'],
  ['education', '교육/설명'],
  ['other', '기타']
];

const toneOptions = [
  ['none', '안함'],
  ['empathy', '공감형'],
  ['info', '정보형'],
  ['humor', '유머형'],
  ['expert', '전문형'],
  ['emotional', '감성형'],
  ['hook', '자극적 후킹형'],
  ['other', '기타']
];

const channelOptions = [
  ['none', '안함'],
  ['instagram', '인스타그램'],
  ['blog', '블로그'],
  ['threads', '스레드'],
  ['shorts', '유튜브 쇼츠'],
  ['tiktok', '틱톡'],
  ['other', '기타']
];

export default function Metadata() {
  const { currentWork, updateCurrentWork, setView } = useTrLabWorkspace();
  const { createWorkWithDialog } = useWorkDialogs();

  if (!currentWork) {
    return (
      <div className="mx-auto grid min-h-[420px] max-w-2xl place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">작업물을 먼저 만들어 주세요</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">작업물 정보는 파일의 기본 설정처럼 저장됩니다.</p>
          <Button className="mt-5" onClick={() => createWorkWithDialog({ initialTitle: '새 카드뉴스 작업물' })}>새 작업물 만들기</Button>
        </div>
      </div>
    );
  }

  const metadata = currentWork.metadata ?? {};
  const ageSummary = summarizeAges(metadata.ageGroups ?? []);

  const resetMetadata = () => {
    updateCurrentWork((work) => ({
      ...work,
      metadata: defaultMetadata()
    }));
  };

  const completeMetadata = () => {
    setView('planning');
  };

  const updateField = (key) => (event) => {
    const value = event.target.value;
    updateCurrentWork((work) => ({
      ...work,
      metadata: {
        ...(work.metadata ?? {}),
        [key]: value
      }
    }));
  };
  const updateTitle = (event) => {
    const title = event.target.value;
    updateCurrentWork((work) => ({
      ...work,
      title
    }));
  };
  const updateSingle = (key, value) => {
    updateCurrentWork((work) => ({
      ...work,
      metadata: {
        ...(work.metadata ?? {}),
        [key]: value
      }
    }));
  };
  const toggleMulti = (key, value) => {
    updateCurrentWork((work) => {
      const currentValues = Array.isArray(work.metadata?.[key]) ? work.metadata[key] : [];
      const exclusiveValues = ['none', 'all'];
      const nextValues = exclusiveValues.includes(value)
        ? currentValues.includes(value) ? ['none'] : [value]
        : currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues.filter((item) => !exclusiveValues.includes(item)), value];
      return {
        ...work,
        metadata: {
          ...(work.metadata ?? {}),
          [key]: nextValues.length ? nextValues : ['none']
        }
      };
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex h-10 items-center">
        <h1 className="text-xl font-semibold tracking-normal text-slate-950">정보</h1>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <Field label="주제">
            <input id="work-title" name="workTitle" className={inputClass} value={currentWork.title ?? ''} onChange={updateTitle} placeholder="예: 집에서 하는 홈트레이닝 상체 루틴" />
          </Field>
          <Field label="목적">
            <input id="work-goal" name="workGoal" className={inputClass} value={metadata.goal ?? ''} onChange={updateField('goal')} placeholder="예: 저장하고 공유할 만한 절약 루틴 콘텐츠 만들기" />
          </Field>
          <ChoiceGroup label={`연령대${ageSummary ? ` · ${ageSummary}` : ''}`}>
            <CheckboxGrid options={ageOptions} values={metadata.ageGroups ?? []} onToggle={(value) => toggleMulti('ageGroups', value)} />
          </ChoiceGroup>
          <ChoiceGroup label="성별">
            <RadioGrid options={genderOptions} value={metadata.gender ?? 'all'} onChange={(value) => updateSingle('gender', value)} name="metadata-gender" />
          </ChoiceGroup>
          <ChoiceGroup label="관심 상황">
            <CheckboxGrid options={situationOptions} values={metadata.situations ?? []} onToggle={(value) => toggleMulti('situations', value)} />
          </ChoiceGroup>
          <ChoiceGroup label="콘텐츠 목적">
            <RadioGrid options={objectiveOptions} value={metadata.objective ?? 'save'} onChange={(value) => updateSingle('objective', value)} name="metadata-objective" />
          </ChoiceGroup>
          <ChoiceGroup label="톤">
            <RadioGrid options={toneOptions} value={metadata.tone ?? 'empathy'} onChange={(value) => updateSingle('tone', value)} name="metadata-tone" />
          </ChoiceGroup>
          <ChoiceGroup label="채널">
            <RadioGrid options={channelOptions} value={metadata.channel ?? 'instagram'} onChange={(value) => updateSingle('channel', value)} name="metadata-channel" />
          </ChoiceGroup>
          <Field label="대상 추가 설명">
            <input id="work-audience-note" name="workAudienceNote" className={inputClass} value={metadata.audienceNote ?? ''} onChange={updateField('audienceNote')} placeholder="예: 점심값 부담이 큰 수도권 직장인" />
          </Field>
          <Field label="메모">
            <textarea id="work-notes" name="workNotes" className={textareaClass} value={metadata.notes ?? ''} onChange={updateField('notes')} placeholder="레퍼런스, 피해야 할 표현, 채널 톤 등을 적어둡니다." />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-6 z-20 flex justify-center px-4">
        <div className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-xl">
          <Button variant="ghost" onClick={resetMetadata} className="h-9 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950">
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>
          <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
          <Button onClick={completeMetadata} disabled={!currentWork.title.trim()} className="h-9 rounded-full bg-slate-950 px-4 text-xs font-medium text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-slate-800">
            <Check className="h-4 w-4" />
            완료
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputClass = 'h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-indigo-400';
const textareaClass = 'min-h-28 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 outline-none focus:border-indigo-400';

function defaultMetadata() {
  return {
    ageGroups: ['none'],
    gender: 'none',
    situations: ['none'],
    objective: 'none',
    tone: 'none',
    channel: 'none',
    audienceNote: '',
    goal: '',
    notes: ''
  };
}

function Field({ label, children }) {
  return <label className="grid gap-1.5"><span className="text-xs font-semibold text-slate-500">{label}</span>{children}</label>;
}

function ChoiceGroup({ label, children }) {
  return (
    <div className="grid gap-2">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function CheckboxGrid({ options, values, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => {
        const checked = values.includes(value);
        return (
          <label key={value} className={choiceClass(checked)}>
            <input className="sr-only" type="checkbox" checked={checked} onChange={() => onToggle(value)} />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function RadioGrid({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([optionValue, label]) => {
        const checked = value === optionValue;
        return (
          <label key={optionValue} className={choiceClass(checked)}>
            <input className="sr-only" type="radio" name={name} checked={checked} onChange={() => onChange(optionValue)} />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function choiceClass(active) {
  return [
    'cursor-pointer rounded-md border px-3 py-2 text-xs font-medium transition',
    active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950'
  ].join(' ');
}

function summarizeAges(values) {
  if (!values.length) return '';
  if (values.includes('none')) return '안함';
  if (values.includes('all')) return '전 연령';
  const ordered = ageOptions.filter(([value]) => values.includes(value) && value !== 'all');
  const nums = ordered.map(([value]) => Number(value.replace(/\D/g, ''))).filter(Boolean);
  if (!nums.length) return '';
  const contiguous = nums.every((num, index) => index === 0 || num - nums[index - 1] === 10);
  if (contiguous && nums.length > 1) return `${nums[0]}~${nums[nums.length - 1]}대`;
  return ordered.map(([, label]) => label).join(', ');
}
