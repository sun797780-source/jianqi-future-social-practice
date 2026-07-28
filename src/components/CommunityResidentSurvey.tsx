import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, Clock3, LockKeyhole, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { emptyCommunitySurvey, getCommunitySurvey, submitCommunitySurvey, type CommunitySurvey } from "@/lib/apiClient";

export default function CommunityResidentSurvey() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRoom = searchParams.get("room")?.toUpperCase() || "COMMUNITY-01";
  const roomId = /^[A-Z0-9-]{4,30}$/.test(requestedRoom) ? requestedRoom : "COMMUNITY-01";
  const [survey, setSurvey] = useState<CommunitySurvey>(emptyCommunitySurvey);
  const [screen, setScreen] = useState(-1);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "complete" | "error">("loading");
  const [error, setError] = useState("");
  const [deduplicated, setDeduplicated] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    getCommunitySurvey(roomId, false).then((result) => {
      setSurvey(result.data);
      setAnswers(result.data.questions.map(() => null));
      setStatus("ready");
    }).catch(() => {
      setError("暂时无法进入本次调研，请确认现场大屏仍在运行后重试。");
      setStatus("error");
    });
  }, [roomId]);

  const questionCount = survey.questions.length;
  const isQuestion = screen >= 0 && screen < questionCount;
  const isReview = screen === questionCount;
  const currentAnswer = isQuestion ? answers[screen] : null;

  const chooseAnswer = (optionIndex: number) => {
    setAnswers((current) => current.map((answer, index) => index === screen ? optionIndex : answer));
  };

  const submit = async () => {
    if (answers.some((answer) => answer === null)) return;
    setStatus("submitting");
    setError("");
    try {
      const result = await submitCommunitySurvey(roomId, answers as number[], suggestion.trim() || undefined);
      setDeduplicated(result.deduplicated);
      setStatus("complete");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后重试。");
      setStatus("ready");
    }
  };

  if (status === "loading") {
    return <main className="resident-survey resident-loading"><span className="resident-loader" /><strong>正在连接社区调研房间</strong><p>请稍候，不需要填写任何个人信息。</p></main>;
  }

  if (status === "error") {
    return <main className="resident-survey resident-error"><LockKeyhole size={36} /><h1>暂时无法进入</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>重新连接</button></main>;
  }

  if (status === "complete") {
    return <main className="resident-survey resident-complete">
      <div className="resident-complete-mark"><CheckCircle2 size={58} /></div>
      <span>COMMUNITY RESPONSE RECEIVED</span>
      <h1>{deduplicated ? "这台设备已经参与过本次调研" : "您的判断已汇入现场大屏"}</h1>
      <p>{deduplicated ? "为保证结果公平，每台设备只计入一份问卷，之前的提交结果仍然有效。" : "页面没有收集姓名、电话、住址或精确位置。感谢您为社区治理提供一份真实判断。"}</p>
      <div className="resident-complete-meta"><ShieldCheck size={18} /><span>匿名提交</span><i /><Check size={18} /><span>四个维度已完成</span></div>
      <button type="button" onClick={() => navigate("/")}><ArrowLeft size={17} /> 返回实践首页</button>
    </main>;
  }

  return <main className="resident-survey">
    <header className="resident-header">
      <button type="button" aria-label="退出调研" onClick={() => navigate("/")}><ChevronLeft size={23} /></button>
      <div><span>邻里节约治理调研</span><small>房间 {roomId}</small></div>
      <ShieldCheck size={23} />
    </header>

    {screen === -1 && <section className="resident-intro">
      <div className="resident-orbit" aria-hidden="true"><span /><i /><em /></div>
      <span className="resident-eyebrow"><Sparkles size={15} /> 您的判断将实时进入现场大屏</span>
      <h1><span>不是简单打卡，</span><em><span>而是共同决定</span><span>社区先做什么。</span></em></h1>
      <p>本次调研围绕治理优先级、协同机制、参与动力和反馈闭环展开。没有标准答案，请按您的真实判断选择。</p>
      <div className="resident-intro-facts"><span><Clock3 size={18} /><strong>约 2 分钟</strong><small>共 4 道题</small></span><span><ShieldCheck size={18} /><strong>完全匿名</strong><small>不采集个人资料</small></span></div>
      <button type="button" className="resident-primary" onClick={() => setScreen(0)}>开始社区调研 <ArrowRight size={19} /></button>
      <small className="resident-consent">点击开始即表示您自愿参与匿名意见收集，每台设备仅计入一份结果。</small>
    </section>}

    {isQuestion && <section className="resident-question-page">
      <div className="resident-progress-head"><span>QUESTION {String(screen + 1).padStart(2, "0")}</span><strong>{screen + 1} / {questionCount}</strong></div>
      <div className="resident-progress"><i style={{ width: `${((screen + 1) / questionCount) * 100}%` }} /></div>
      <span className="resident-dimension">{survey.questions[screen].dimension}</span>
      <h1>{survey.questions[screen].title}</h1>
      <p>{survey.questions[screen].description}</p>
      <div className="resident-options" role="radiogroup" aria-label={survey.questions[screen].title}>
        {survey.questions[screen].options.map((option, optionIndex) => <button key={option} type="button" role="radio" aria-checked={currentAnswer === optionIndex} className={currentAnswer === optionIndex ? "selected" : ""} onClick={() => chooseAnswer(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option}</strong><i>{currentAnswer === optionIndex && <Check size={16} />}</i></button>)}
      </div>
      <div className="resident-navigation"><button type="button" className="resident-secondary" onClick={() => setScreen(screen - 1)}><ArrowLeft size={18} /> 上一步</button><button type="button" className="resident-primary" disabled={currentAnswer === null} onClick={() => setScreen(screen + 1)}>{screen === questionCount - 1 ? "核对答案" : "下一题"} <ArrowRight size={18} /></button></div>
    </section>}

    {isReview && <section className="resident-review">
      <span className="resident-eyebrow"><CheckCircle2 size={16} /> 提交前确认</span>
      <h1>四个维度已经完成</h1>
      <p>请核对您的选择。提交后将只进入匿名汇总，不展示单份答卷。</p>
      <div className="resident-review-list">{survey.questions.map((question, index) => <button type="button" key={question.id} onClick={() => setScreen(index)}><span>0{index + 1}</span><div><small>{question.dimension}</small><strong>{answers[index] === null ? "尚未选择" : question.options[answers[index] as number]}</strong></div><ChevronLeft size={18} /></button>)}</div>
      <label className="resident-suggestion"><span><strong>再说一句您的建议</strong><small>选填 · 最多 200 字</small></span><p>例如：社区还可以通过哪些制度、设施或邻里协作减少浪费？真实、具体的建议会帮助小俭生成更有依据的方案。</p><textarea value={suggestion} onChange={(event) => setSuggestion(event.target.value)} maxLength={200} placeholder="我建议社区……" /><em>{suggestion.length} / 200</em></label>
      {error && <p className="resident-submit-error">{error}</p>}
      <div className="resident-navigation"><button type="button" className="resident-secondary" onClick={() => setScreen(questionCount - 1)}><ArrowLeft size={18} /> 返回修改</button><button type="button" className="resident-primary" disabled={status === "submitting"} onClick={submit}><Send size={18} /> {status === "submitting" ? "正在安全提交" : "确认并匿名提交"}</button></div>
    </section>}
  </main>;
}
