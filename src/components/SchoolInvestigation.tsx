import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Lightbulb, MessageCircle, PlayCircle, School, Shuffle, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRandomSchoolQuestion, type SchoolGrade, type SchoolQuestion } from "@/data/schoolQuestionBank";

const grades: { id: SchoolGrade; label: string; role: string; description: string }[] = [
  { id: "primary", label: "小学生", role: "节粮小侦探", description: "用简单情境找出珍惜食物的好办法。" },
  { id: "junior", label: "初中生", role: "节粮讨论员", description: "从真实原因出发，讨论班级能执行的办法。" },
  { id: "senior", label: "高中生", role: "节粮提案人", description: "把观察、分析和行动组织成一份可检验的提案。" },
];

function askXiaoJian(question: string, grade: SchoolGrade, item: SchoolQuestion) {
  const gradeLabel = grades.find((gradeItem) => gradeItem.id === grade)?.label ?? "当前年级";
  window.dispatchEvent(new CustomEvent("xiaojian:ask", {
    detail: {
      question: `这是课堂题库中的一道${gradeLabel}题。请严格只使用${gradeLabel}能够理解的知识和表达方式回答，不要拔高到其他年级。题目：${item.question} 选项：${item.choices.map((choice, index) => `${String.fromCharCode(65 + index)}、${choice}`).join("；")} 题库标准答案：${String.fromCharCode(65 + item.answer)}、${item.choices[item.answer]}。标准依据：${item.explanation} 请以题库标准答案为准，不要自行改答案；先说正确选项，再用两三句话讲清理由，最后给出一个课堂里马上能做的小行动。不要读出星号或Markdown符号。${question}`,
      schoolGrade: grade,
    },
  }));
}

export default function SchoolInvestigation() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<SchoolGrade>("primary");
  const [watched, setWatched] = useState(false);
  const [question, setQuestion] = useState<SchoolQuestion>(() => getRandomSchoolQuestion("primary"));
  const [choice, setChoice] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const gradeInfo = grades.find((item) => item.id === grade) ?? grades[0];
  const progress = [watched, choice !== null, submitted].filter(Boolean).length;

  const changeGrade = (nextGrade: SchoolGrade) => {
    setGrade(nextGrade);
    setQuestion(getRandomSchoolQuestion(nextGrade));
    setChoice(null);
    setSubmitted(false);
  };

  const changeQuestion = () => {
    setQuestion(getRandomSchoolQuestion(grade, question.id));
    setChoice(null);
    setSubmitted(false);
  };

  const ask = (extra: string) => askXiaoJian(extra, grade, question);
  const correct = choice === question.answer;

  return (
    <main className="school-observatory classroom-page" aria-label="中小学课堂节粮实践室">
      <header className="school-observatory-header">
        <button type="button" className="school-back" onClick={() => navigate("/?stage=audience")}><ArrowLeft size={21} /> 返回场景选择</button>
        <div className="school-brand"><span><School size={15} /> 中小学 · 课堂实践</span><strong>课堂节粮实践室</strong></div>
        <div className="school-header-note"><span>看懂一粒米，做好一件事</span><small>视频 · 抽题 · 小组行动</small></div>
      </header>

      <section className="school-hero classroom-hero">
        <div className="school-hero-copy">
          <span className="school-eyebrow"><Sparkles size={15} /> 今天，我们和小俭一起上节粮课</span>
          <h1>看完视频，和小俭<br /><em>一起完成课堂挑战。</em></h1>
          <p>老师播放视频，班级按实际年级抽取题目。小组讨论后提交答案，再让小俭用对应年级的方式讲解。</p>
          <div className="school-step-line"><span className="active">01 看视频</span><i /><span>02 随机抽题</span><i /><span>03 小组行动</span></div>
        </div>
        <div className="school-hero-card classroom-progress"><Users size={22} /><strong>课堂进度 {progress} / 3</strong><span>看懂 → 讨论 → 行动</span></div>
      </section>

      <section className="school-video-card classroom-video-card" aria-labelledby="school-video-title">
        <div className="school-section-label"><span>01 / 先看视频</span><h2 id="school-video-title">一粒米，怎样来到我们的餐桌？</h2><small>视频播放结束后，解锁课堂题目。</small></div>
        <div className="classroom-video-wrap">
          <video className="school-video" src="/kindergarten-mg-story.mp4" poster="/kindergarten-grain-poster.png" controls playsInline preload="metadata" onEnded={() => setWatched(true)} aria-label="粮食主题课堂宣讲视频" />
          {!watched && <div className="video-hint"><PlayCircle size={16} /> 看完视频，解锁课堂挑战</div>}
          {watched && <div className="video-done"><Check size={16} /> 视频看完了，开始抽取课堂题目</div>}
        </div>
      </section>

      <section className="school-survey-section classroom-section" aria-labelledby="classroom-title">
        <div className="school-survey-heading">
          <div><span className="school-section-kicker"><Lightbulb size={15} /> 02 / 年级题库 · 每个年级 50 题</span><h2 id="classroom-title">选择年级，随机抽一道课堂题</h2></div>
          <div className="school-mode-switch" role="tablist" aria-label="课堂年级路线">
            {grades.map((item) => <button key={item.id} type="button" className={grade === item.id ? "active" : ""} onClick={() => changeGrade(item.id)} role="tab" aria-selected={grade === item.id}>{item.label}</button>)}
          </div>
        </div>

        <div className="classroom-role-card"><div><span>当前课堂身份</span><strong>{gradeInfo.role}</strong></div><p>{gradeInfo.description}<br />小俭回答时会严格按照{gradeInfo.label}的知识水平解释。</p><button type="button" className="classroom-ai-button" onClick={() => ask("请先讲一讲这道题。") }><MessageCircle size={16} /> 让小俭先讲一讲</button></div>

        <div className="classroom-challenge-grid">
          <div className="classroom-question-card">
            <div className="question-title"><span>题目 {question.id}</span><b>小组讨论 1 分钟</b></div>
            <h3>{question.question}</h3>
            <div className="classroom-choices">{question.choices.map((item, index) => <button type="button" key={item} className={choice === index ? "selected" : ""} onClick={() => { setChoice(index); setSubmitted(false); }}><span>{String.fromCharCode(65 + index)}</span>{item}</button>)}</div>
            <div className="classroom-question-actions"><button type="button" className="classroom-new-question" onClick={changeQuestion}><Shuffle size={16} /> 换一道题</button><button type="button" className="classroom-submit" disabled={!watched || choice === null} onClick={() => setSubmitted(true)}>{watched ? "提交小组答案" : "看完视频后解锁"}<ChevronRight size={17} /></button></div>
          </div>
          <aside className={`classroom-feedback ${submitted ? "show" : ""}`} aria-live="polite"><div><Sparkles size={17} /> 小俭课堂反馈</div>{!submitted ? <><strong>讨论后提交你们的选择</strong><p>每次换题都会从当前年级的 50 道题中重新抽取，不同年级不会混用题目。</p></> : <><strong>{correct ? "判断得很好！" : "再想一想"}</strong><p>{correct ? question.explanation : `小俭提示：${question.explanation}`}</p><button type="button" onClick={() => ask("请展开解释这道题，并告诉我们为什么其他选项不合适。")}><MessageCircle size={15} /> 让小俭展开解释</button></>}</aside>
        </div>
      </section>

      <section className="school-action-strip classroom-action"><div><span>03 / 班级行动卡</span><h2>{submitted ? question.action : "把小组答案变成全班都能做到的一件事"}</h2><p>老师可以请每组说出一个理由，最后由全班共同确定今天的节粮约定。</p></div><div className="school-action-mark">✓</div></section>
    </main>
  );
}
