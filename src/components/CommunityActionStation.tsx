import { useEffect, useState } from "react";
import { Activity, ArrowLeft, BarChart3, BrainCircuit, Copy, FileText, LoaderCircle, MessageCircle, QrCode, Quote, Radio, RefreshCw, ScanLine, ShieldCheck, Sparkles, Users, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { emptyCommunitySurvey, getCommunityAccessUrl, getCommunitySurvey, subscribeCommunitySurvey, type ApiStatus, type CommunitySurvey } from "@/lib/apiClient";

const surveyId = "COMMUNITY-01";
const chartColors = ["#16c7a1", "#ffb84d", "#ff6f7d", "#6b79ff"];

function percentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function dominantIndex(counts: number[]) {
  return counts.reduce((best, count, index) => count > counts[best] ? index : best, 0);
}

function cleanAnalysisText(text: string) {
  return text.replace(/\*\*(.*?)\*\*/gs, "$1").replace(/__(.*?)__/gs, "$1").replace(/^#{1,6}\s*/gm, "").replace(/^---+$/gm, "").replace(/[*_`~]/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

function isGroundedAnalysis(text: string, survey: CommunitySurvey) {
  const forbidden = /联系.{0,12}(居民|参与者)|留下联系方式|收集联系方式|所在楼栋|这位参与调研的居民|他\/她|手机号|家庭住址|物色.{0,8}人选/;
  const smallSampleOverreach = survey.responseCount < 5 && /反映出|表明其|说明其倾向|显示出.{0,6}(期待|偏好|倾向)|未形成任何维度的多数共识|四个选项均获得/.test(text);
  const chineseNumber = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][survey.responseCount];
  const hasSampleCount = text.includes(`${survey.responseCount}份`) || text.includes(`${survey.responseCount} 份`) || Boolean(chineseNumber && text.includes(`${chineseNumber}份`));
  const handlesMissingSuggestions = survey.suggestions.length > 0 || /暂无.{0,8}建议|没有.{0,8}建议|未收到.{0,8}建议|0\s*条.{0,8}建议/.test(text);
  const hasRequiredSections = text.includes("核心发现") && /七天行动方案|7天行动方案/.test(text) && /评估指标/.test(text);
  const hasExactLeaders = survey.questions.every((question, questionIndex) => {
    const counts = survey.counts[questionIndex] ?? [];
    const maximum = Math.max(...counts);
    if (maximum <= 0) return true;
    return question.options.every((option, optionIndex) => counts[optionIndex] !== maximum || text.includes(option));
  });
  const includesSuggestionEvidence = survey.suggestions.slice(-3).every((suggestion) => text.includes(suggestion.text.slice(0, Math.min(12, suggestion.text.length))));
  return hasSampleCount && handlesMissingSuggestions && hasRequiredSections && hasExactLeaders && includesSuggestionEvidence && !forbidden.test(text) && !smallSampleOverreach;
}

function buildVerifiedFactSummary(survey: CommunitySurvey) {
  return survey.questions.map((question, questionIndex) => {
    const counts = survey.counts[questionIndex] ?? [];
    const maximum = Math.max(...counts);
    const leaders = question.options.filter((_option, optionIndex) => counts[optionIndex] === maximum).map((option) => `“${option}”${maximum}票`).join("、");
    return `${question.dimension}最高项：${leaders}`;
  }).join("；");
}

function buildLocalAnalysis(survey: CommunitySurvey) {
  const findings = survey.questions.map((question, questionIndex) => {
    const counts = survey.counts[questionIndex] ?? question.options.map(() => 0);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const ranked = counts.map((count, index) => ({ count, index })).sort((a, b) => b.count - a.count);
    const first = ranked[0];
    const second = ranked[1];
    if (!first || total === 0) return `${question.dimension}暂无有效选择。`;
    if (second && first.count === second.count) return `${question.dimension}暂未形成单一倾向，最高的多个选项均为${first.count}票。`;
    return `${question.dimension}当前最高倾向为“${question.options[first.index]}”，${first.count}票，占${percentage(first.count, total)}%；次高为“${question.options[second.index]}”，${second.count}票。`;
  });
  const priority = survey.questions[0]?.options[dominantIndex(survey.counts[0] ?? [0])] ?? "当前最高优先事项";
  const mechanism = survey.questions[1]?.options[dominantIndex(survey.counts[1] ?? [0])] ?? "居民与社区协同推进";
  const feedback = survey.questions[3]?.options[dominantIndex(survey.counts[3] ?? [0])] ?? "公开反馈处理进度";
  const voices = survey.suggestions.length > 0 ? survey.suggestions.slice(-5).map((item, index) => `${index + 1}. ${item.text}`).join("\n") : "暂无选填建议，不能据此推断居民未表达的需求。";
  return `核心发现\n当前共有${survey.responseCount}份有效问卷、${survey.suggestions.length}条选填建议。样本仅代表当前参与者，不能直接代表全体居民。\n${findings.join("\n")}\n\n居民建议归纳\n${voices}\n\n七天行动方案\n第1至2天：由社区工作人员与物业围绕“${priority}”建立一份现状清单，记录地点、发生频次和可核对的基线，不先设定虚构的节约量。\n第3至5天：采用“${mechanism}”作为组织方式，选择一个楼栋或公共区域进行小范围试点，明确一名协调人和一次居民反馈时段。\n第6至7天：按照“${feedback}”公开处理进度，对已完成、未完成和暂缓事项分别说明依据，再决定是否扩大试点。\n\n评估指标与风险\n检查问题清单完成率、试点前后同口径记录、居民二次反馈数量和未完成事项说明率。当前样本较少或选项接近时，应继续收集意见，避免把暂时领先误判为稳定共识。`;
}

function buildVerifiedEvidence(survey: CommunitySurvey) {
  return buildLocalAnalysis(survey).split("\n\n七天行动方案")[0];
}

function extractGroundedAiPlan(text: string, survey: CommunitySurvey) {
  const planStart = text.search(/七天行动方案|7天行动方案/);
  if (planStart < 0) return null;
  const plan = text.slice(planStart);
  const forbidden = /联系.{0,12}(已提交|答卷|参与者|这位居民)|留下联系方式|收集联系方式|所在楼栋|手机号|家庭住址/;
  const priorityCounts = survey.counts[0] ?? [];
  const mechanismCounts = survey.counts[1] ?? [];
  const priority = survey.questions[0]?.options[dominantIndex(priorityCounts)];
  const mechanism = survey.questions[1]?.options[dominantIndex(mechanismCounts)];
  const usesVerifiedPriorities = Boolean(priority && mechanism && plan.includes(priority) && plan.includes(mechanism));
  const usesSuggestions = survey.suggestions.length === 0 || survey.suggestions.slice(-3).every((suggestion) => plan.includes(suggestion.text.slice(0, Math.min(12, suggestion.text.length))));
  return !forbidden.test(plan) && /评估指标/.test(plan) && usesVerifiedPriorities && usesSuggestions ? plan : null;
}

export default function CommunityActionStation() {
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<CommunitySurvey>(emptyCommunitySurvey);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [connection, setConnection] = useState<"live" | "reconnecting">("reconnecting");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState(`${window.location.origin}/practice/community/respond?room=${surveyId}`);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "done">("idle");
  const [analysisText, setAnalysisText] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"ai" | "local">("ai");
  const [analysisEventId, setAnalysisEventId] = useState<number | null>(null);

  useEffect(() => {
    getCommunityAccessUrl().then(({ origin }) => setJoinUrl(`${origin}/practice/community/respond?room=${surveyId}`)).catch(() => undefined);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 280, margin: 2, color: { dark: "#102f33", light: "#f7fffc" } }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [joinUrl]);

  useEffect(() => {
    let active = true;
    getCommunitySurvey(surveyId).then((result) => {
      if (!active) return;
      setSurvey(result.data);
      setApiStatus(result.status);
    });
    const unsubscribe = subscribeCommunitySurvey(surveyId, (nextSurvey) => {
      if (!active) return;
      setSurvey(nextSurvey);
      setApiStatus("success");
    }, setConnection);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const copyLink = async () => {
    await navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const priorityCounts = survey.counts[0] ?? [0, 0, 0, 0];
  const priorityTotal = priorityCounts.reduce((sum, count) => sum + count, 0);
  const priorityLeader = dominantIndex(priorityCounts);
  let angle = 0;
  const donutStops = priorityCounts.map((count, index) => {
    const start = angle;
    angle += priorityTotal > 0 ? (count / priorityTotal) * 360 : 0;
    return `${chartColors[index]} ${start}deg ${angle}deg`;
  }).join(", ");

  const generateAnalysis = async () => {
    if (survey.responseCount === 0) return;
    setAnalysisStatus("loading");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 70_000);
    const verifiedFacts = buildVerifiedFactSummary(survey);
    try {
      const requestReport = async (message: string) => {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: [],
            page: {
              path: "/practice/community",
              label: "社区节约治理实时决策图谱",
              communitySurvey: {
                responseCount: survey.responseCount,
                questions: survey.questions.map((question, index) => ({ dimension: question.dimension, options: question.options, counts: survey.counts[index] })),
                suggestions: survey.suggestions.map((item) => item.text),
              },
            },
          }),
          signal: controller.signal,
        });
        const data = await response.json() as { reply?: string };
        if (!response.ok || !data.reply) throw new Error("AI unavailable");
        return cleanAnalysisText(data.reply);
      };
      const attempts: string[] = [];
      let cleanedReply = await requestReport(`请依据结构化社区调研数据生成有深度、可执行的治理分析报告。以下是程序核验过的最高项，报告必须逐字保留选项名称和票数，不得改写：${verifiedFacts}。`);
      attempts.push(cleanedReply);
      if (!isGroundedAnalysis(cleanedReply, survey)) {
        cleanedReply = await requestReport(`请重新生成并严格纠偏：报告必须明确写“当前共有${survey.responseCount}份有效问卷、${survey.suggestions.length}条选填建议”；必须逐字保留这些程序核验事实：${verifiedFacts}。调研完全匿名，不得联系某位参与者、获取联系方式或推断楼栋和身份。完整输出核心发现、居民建议归纳、七天行动方案、评估指标与风险。`);
        attempts.push(cleanedReply);
      }
      if (isGroundedAnalysis(cleanedReply, survey)) {
        setAnalysisText(cleanedReply);
      } else {
        const groundedPlan = attempts.map((attempt) => extractGroundedAiPlan(attempt, survey)).find(Boolean);
        if (!groundedPlan) throw new Error("AI reply exceeded evidence boundaries");
        setAnalysisText(`${buildVerifiedEvidence(survey)}\n\n${groundedPlan}`);
      }
      setAnalysisMode("ai");
    } catch {
      setAnalysisText(buildLocalAnalysis(survey));
      setAnalysisMode("local");
    } finally {
      window.clearTimeout(timeout);
      setAnalysisEventId(survey.eventId);
      setAnalysisStatus("done");
    }
  };
  const analysisStale = analysisEventId !== null && analysisEventId !== survey.eventId;

  return (
    <main className="community-dashboard" aria-label="社区节约调研数据中心">
      <header className="community-dashboard-header">
        <button type="button" className="dashboard-back" onClick={() => navigate("/?stage=audience")}><ArrowLeft size={20} /> 返回场景选择</button>
        <div className="dashboard-brand"><span><Radio size={15} /> COMMUNITY INTELLIGENCE</span><strong>社区节约治理 · 实时决策图谱</strong></div>
        <div className={`dashboard-connection ${connection}`}>
          {connection === "live" ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{apiStatus === "demo" ? "本地演示通道" : connection === "live" ? "数据实时接入" : "正在重新连接"}</span>
        </div>
      </header>

      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker"><ScanLine size={17} /> 居民匿名调研 · 房间 {surveyId}</span>
          <h1><span>让居民表达判断，</span><em>让数据形成行动。</em></h1>
          <p>电脑端只负责收集与分析。居民扫码后进入独立手机问卷，完成四个治理维度的选择，也可以留下具体建议；所有结果实时汇入本页。</p>
        </div>
        <div className="dashboard-metrics" aria-label="调研状态">
          <div><Users size={20} /><span>有效问卷</span><strong>{survey.responseCount}</strong><small>份</small></div>
          <div><Activity size={20} /><span>治理维度</span><strong>{survey.questions.length}</strong><small>项</small></div>
          <div><MessageCircle size={20} /><span>居民建议</span><strong>{survey.suggestions.length}</strong><small>条选填内容</small></div>
          <div><ShieldCheck size={20} /><span>数据方式</span><strong>匿名</strong><small>不采集身份</small></div>
        </div>
      </section>

      <section className="dashboard-command-grid">
        <article className="dashboard-qr-panel">
          <div className="dashboard-panel-title"><span>01 / 居民入口</span><QrCode size={24} /></div>
          <div className="dashboard-qr-body">
            <div className="dashboard-qr-frame">{qrDataUrl ? <img src={qrDataUrl} alt="居民手机答题二维码" /> : <RefreshCw className="dashboard-spin" size={30} />}</div>
            <div className="dashboard-qr-copy">
              <h2>扫码进入独立答题端</h2>
              <p>手机端共 4 题和 1 项选填建议，预计 2 分钟。无需姓名、电话、住址或照片，每台设备只计入一份问卷。</p>
              <div className="dashboard-flow"><span>扫码进入</span><i /><span>逐题判断</span><i /><span>统一提交</span></div>
              <button type="button" onClick={copyLink}><Copy size={16} /> {copied ? "参与链接已复制" : "复制手机答题链接"}</button>
              <small className="dashboard-access-url">手机访问地址：{joinUrl}</small>
            </div>
          </div>
        </article>

        <article className="dashboard-donut-panel">
          <div className="dashboard-panel-title"><span>02 / 核心治理优先级</span><BarChart3 size={24} /></div>
          {priorityTotal === 0 ? (
            <div className="dashboard-empty-chart"><span className="empty-radar" /><strong>等待第一份有效问卷</strong><p>居民提交后，治理优先级分布将在这里实时生成。</p></div>
          ) : (
            <div className="dashboard-donut-content">
              <div className="dashboard-donut" style={{ background: `conic-gradient(${donutStops})` }}><div><strong>{percentage(priorityCounts[priorityLeader], priorityTotal)}%</strong><span>最高倾向</span></div></div>
              <div className="dashboard-donut-legend">{survey.questions[0].options.map((option, index) => <div key={option}><i style={{ background: chartColors[index] }} /><span>{option}</span><strong>{percentage(priorityCounts[index], priorityTotal)}%</strong></div>)}</div>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-analysis-section">
        <div className="dashboard-section-heading"><div><span>03 / 多维意见矩阵</span><h2>四个维度，不把复杂治理压成一道简单选择题</h2></div><small>共 {survey.responseCount} 份有效样本 · {connection === "live" ? "实时更新" : "保留最近结果"}</small></div>
        <div className="dashboard-question-grid">
          {survey.questions.map((question, questionIndex) => {
            const counts = survey.counts[questionIndex] ?? question.options.map(() => 0);
            const total = counts.reduce((sum, count) => sum + count, 0);
            const leader = dominantIndex(counts);
            return <article className="dashboard-question-card" key={question.id}>
              <div className="question-card-head"><span>0{questionIndex + 1}</span><div><small>{question.dimension}</small><h3>{question.title}</h3></div></div>
              <div className="question-bars">{question.options.map((option, optionIndex) => {
                const value = percentage(counts[optionIndex], total);
                return <div className={total > 0 && optionIndex === leader ? "leading" : ""} key={option}><div><span>{option}</span><b>{total > 0 ? `${value}%` : "待采集"}</b></div><i><em style={{ width: `${value}%`, background: chartColors[optionIndex] }} /></i></div>;
              })}</div>
            </article>;
          })}
        </div>
      </section>

      <section className="dashboard-voices-section">
        <div className="dashboard-section-heading"><div><span>04 / 匿名居民建议</span><h2>选项告诉我们倾向，原声补充行动细节</h2></div><small>仅展示匿名选填内容 · 最近 {Math.min(survey.suggestions.length, 8)} 条</small></div>
        {survey.suggestions.length === 0 ? <div className="dashboard-voices-empty"><Quote size={24} /><span><strong>暂未收到选填建议</strong><small>居民可以在四题完成后的确认页补充具体想法。</small></span></div> : <div className="dashboard-voice-grid">{survey.suggestions.slice(-8).reverse().map((suggestion, index) => <blockquote key={`${suggestion.createdAt}-${index}`}><Quote size={16} /><p>{suggestion.text}</p><small>匿名建议 {String(survey.suggestions.length - index).padStart(2, "0")}</small></blockquote>)}</div>}
      </section>

      <section className="dashboard-ai-strip">
        <div><BrainCircuit size={22} /><span><strong>小俭治理分析</strong><small>{survey.responseCount > 0 ? `将分析 ${survey.responseCount} 份选择与 ${survey.suggestions.length} 条建议，输出七天行动方案` : "收到有效问卷后解锁，不使用预设或虚构结论"}</small></span></div>
        <button type="button" disabled={survey.responseCount === 0 || analysisStatus === "loading"} onClick={generateAnalysis}>{analysisStatus === "loading" ? <LoaderCircle className="dashboard-spin" size={17} /> : <Sparkles size={17} />} {analysisStatus === "loading" ? "正在核对数据并生成" : analysisStale ? "数据已更新，重新生成" : survey.responseCount > 0 ? "生成深度治理报告" : "等待居民提交"}</button>
      </section>
      {(analysisStatus === "loading" || analysisText) && <section className="dashboard-ai-report" aria-live="polite">
        <header><div><FileText size={20} /><span><small>05 / AI 治理报告</small><strong>从居民判断到可执行方案</strong></span></div>{analysisStatus === "done" && <em className={analysisMode}>{analysisMode === "ai" ? "核验事实 + AI 生成方案" : "AI 未通过校验 · 本地核验报告"}</em>}</header>
        {analysisStatus === "loading" ? <div className="dashboard-report-loading"><span /><div><strong>正在逐项核对统计与居民建议</strong><p>小俭会区分数据事实、合理解释和行动建议，不会补写不存在的信息。</p></div></div> : <div className="dashboard-report-body">{analysisText}</div>}
        {analysisStale && <p className="dashboard-report-stale">报告生成后又收到了新问卷，请点击“数据已更新，重新生成”以使用最新数据。</p>}
      </section>}
    </main>
  );
}
