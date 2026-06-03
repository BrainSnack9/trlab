import { enrichTrendsWithAI } from '#trlab/modules/services/ai/ai-trend-analyzer';
import { getSignalsForAnalysis, saveKeywordSnapshots } from '#trlab/modules/services/signals/signal-store';
import { getBusinessDateAnalysisWindow, resolveTrendAnalysisWindow } from '#trlab/modules/services/ranking/analysis-window';
import { rankTrendSignals } from '#trlab/modules/services/ranking/trend-ranker';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { trendRankQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const params = parseSearchParams(request, trendRankQuerySchema);
    const limit = params.limit;
    const verify = params.verify;
    const verifyLimit = verify ? params.verifyLimit : 0;
    const ai = params.ai;
    const aiLimit = ai ? params.aiLimit : 0;
    const reason = params.analysisDate ? `${params.reason}-${params.analysisDate}` : params.reason;
    const analysisWindow = params.analysisDate
      ? getBusinessDateAnalysisWindow(params.analysisDate)
      : resolveTrendAnalysisWindow(params.window);
    const signals = await getSignalsForAnalysis({
      limit: params.signalLimit,
      since: analysisWindow.from,
      until: analysisWindow.to
    });
    const ranked = await rankTrendSignals(signals, { limit, verifyLimit });
    const { trends: enrichedTrends, meta: aiMeta } = await enrichTrendsWithAI(ranked, { limit: aiLimit });
    const trends = enrichedTrends
      .filter((trend) => (trend.production?.score ?? 0) >= 66 && trend.production?.tier !== '제외 후보')
      .map((trend, index) => ({ ...trend, rank: index + 1 }));

    if (params.save === '1' || reason.startsWith('scheduled-')) {
      await saveKeywordSnapshots(trends.slice(0, 30), reason);
    }

    return Response.json({
      processedAt: new Date().toISOString(),
      inputCount: signals.length,
      candidateCount: trends.length,
      verifiedCount: trends.filter((trend) => trend.searchVerification).length,
      analysisWindow: {
        ...analysisWindow,
        inputCount: signals.length,
        signalLimit: params.signalLimit
      },
      ai: aiMeta,
      rankingPolicy: {
        crossCheck: '복수 출처, 반복 감지, 원문 문맥 우대',
        searchVerify: verify ? `상위 ${verifyLimit}개 Google/Naver/검색 API 검증` : '비활성',
        aiAnalyze: aiMeta.enabled ? `${aiMeta.provider} 상위 ${aiMeta.analyzed}개 콘텐츠성 평가` : '비활성 또는 실패',
        riskFilter: '성인, 정치, 루머성 표현 감점'
      },
      trends
    });
  } catch (error) {
    if (error?.name === 'ZodError') return badRequest(error);
    return Response.json({
      error: 'trend_rank_failed',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
