import { useRef, useState } from "react";
import { ArrowLeft, Droplets, Leaf, LoaderCircle, MessageCircle, Mic, MicOff, Sprout, Volume2, Wheat, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { canSpeak, speakChinese } from "@/lib/speech";

type RuralTopic = "water" | "grain" | "energy";

type RuralSpeechEvent = Event & { results: ArrayLike<{ 0: { transcript: string } }> };
type RuralSpeechError = Event & { error: string };

const topicOptions: Array<{ id: RuralTopic; label: string; description: string; icon: typeof Droplets }> = [
  { id: "water", label: "灌溉节水", description: "让每一滴水都用在作物上", icon: Droplets },
  { id: "grain", label: "收储减损", description: "把辛苦收成好好保存", icon: Wheat },
  { id: "energy", label: "农资与用能", description: "少投入浪费，多留下产出", icon: Zap },
];

const cropOptions = ["水稻", "小麦", "玉米", "大豆", "花生", "棉花", "油菜", "马铃薯", "红薯", "露地蔬菜", "设施蔬菜", "果树", "茶叶", "中药材", "其他作物"];
const stageOptions = ["整地 / 播种", "育苗期", "苗期 / 分蘖期", "拔节 / 营养生长期", "开花 / 授粉期", "灌浆 / 膨大期", "成熟 / 采收期", "采后储存期"];
const sourceOptions = ["雨水 / 蓄水池", "河渠 / 塘坝", "机井 / 地下水", "自来水 / 集中供水", "电力 / 农机", "烘干 / 仓储", "农资库存", "暂不确定"];

function cleanAssistantText(text: string) {
  return text.replace(/\*\*(.*?)\*\*/gs, "$1").replace(/__(.*?)__/gs, "$1").replace(/^#{1,6}\s*/gm, "").replace(/[*_`~]/g, "").trim();
}

function isSafeRuralAdvice(text: string) {
  const forbidden = /(每亩.{0,12}(公斤|千克|毫升|克|斤)|亩用量|喷施.{0,15}(农药|除草剂|杀虫剂)|保证(增产|不减产)|一定能|节省\s*\d|推荐使用[^。]{0,12}(农药|除草剂|杀虫剂))/;
  const hasStructure = /(资源|优先|记录|农技|检查|核对)/.test(text);
  return text.length >= 90 && hasStructure && !forbidden.test(text);
}

function fallbackAdvice(topic: RuralTopic, crop: string, details: string, acreage: string, stage: string) {
  const advice: Record<RuralTopic, string> = {
    water: `先按地块把${acreage || "这片"}亩${crop}分成“缺水、适中、积水”三类，不要整片地同时灌。${stage}优先检查根区湿度、出水均匀度和沟渠渗漏，先修漏点，再采用分区轮灌；记录每块地的灌溉起止时间，下一次按记录调整。`,
    grain: `先把${acreage || "这片"}亩${crop}的收获、晾晒、入仓分批编号。${stage}优先处理含水量高或已经受潮的批次，其他批次保持离地、通风、避雨并定期检查。不要把有问题的一批和干燥粮食混放，先减少最确定的损耗。`,
    energy: `先按${acreage || "这片"}亩${crop}记录一次完整作业的用电、用油或农资投入。${stage}优先处理漏水、空转、重复施用这类确定的浪费，再根据地块差异安排投入；秸秆和副产物先分类，能还田、堆肥或饲料化的优先利用，避免重复购买和露天焚烧。`,
  };
  return `${advice[topic]}${details ? `\n\n你补充的现场情况是：“${details}”。建议把其中能核对的现象记入田间记录，再根据记录决定下一步，不要只凭感觉增加用水、用药或投入。` : ""}`;
}

export default function RuralActionStation() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<RuralTopic>("water");
  const [crop, setCrop] = useState("水稻");
  const [acreage, setAcreage] = useState("");
  const [stage, setStage] = useState(stageOptions[1]);
  const [resourceSource, setResourceSource] = useState(sourceOptions[0]);
  const [details, setDetails] = useState("");
  const [advice, setAdvice] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [mode, setMode] = useState<"online" | "local">("online");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  const selectTopic = (nextTopic: RuralTopic) => {
    setTopic(nextTopic);
    setAdvice("");
    setStatus("idle");
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("微信内置浏览器通常不提供网页录音识别，请点击输入框，使用微信键盘上的麦克风输入。");
      detailsRef.current?.focus();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: RuralSpeechEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setDetails((current) => current ? `${current} ${transcript}` : transcript);
      setListening(false);
    };
    recognition.onerror = (event: RuralSpeechError) => {
      setVoiceError(event.error === "not-allowed" ? "麦克风权限未开启，请允许浏览器访问麦克风。" : "没有听清，请再试一次或改用文字输入。");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceError("");
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("麦克风启动失败，请改用微信键盘语音输入。");
    }
  };

  const askXiaoJian = async () => {
    setStatus("loading");
    const message = `请作为乡村资源配置顾问，帮助一位种植${crop}的农户。基本情况：面积${acreage ? `${acreage}亩` : "未提供面积"}，生长阶段${stage}，主要资源来源${resourceSource}，当前重点${topicOptions.find((item) => item.id === topic)?.label}。现场补充情况：${details || "暂未补充，请先围绕当前重点给出排查框架"}。请输出五部分：1. 已知资源与问题盘点；2. 资源分配优先级，明确先保障什么、什么可以延后；3. 今天能执行的分区或分批方案；4. 接下来7天要记录的指标；5. 需要当地农技人员确认的风险。请逐条回应我补充的每个问题，只使用我提供的信息，不要编造天气、土壤数据、产量、节省金额或当地政策；涉及病虫害、用药、井水安全和设备安全时必须提醒专业确认。核心目标是合理分配已有资源、减少损耗，不是简单地减少投入。`;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: [],
          page: {
            path: "/practice/rural",
            label: "乡村丰收守护资源诊断",
            ruralContext: { crop, acreage, stage, resourceSource, details },
            practice: {
              audience: "乡村",
              title: "丰收守护行动",
              focus: "珍惜收成与节约用水",
              tasks: ["灌溉节水", "收储减损", "农资与用能"],
            },
          },
        }),
      });
      const data = await response.json() as { reply?: string };
      if (!response.ok || !data.reply) throw new Error("AI unavailable");
      const cleanReply = cleanAssistantText(data.reply);
      if (!isSafeRuralAdvice(cleanReply)) throw new Error("AI reply failed rural safety validation");
      setAdvice(cleanReply);
      setMode("online");
    } catch {
      setAdvice(fallbackAdvice(topic, crop, details, acreage, stage));
      setMode("local");
    } finally {
      setStatus("done");
    }
  };

  return (
    <main className="rural-station">
      <header className="rural-header">
        <button type="button" className="rural-back" onClick={() => navigate("/?stage=audience")}><ArrowLeft size={18} /> 返回场景选择</button>
        <div className="rural-brand"><Wheat size={18} /><span>丰收守护 · 资源诊断站</span></div>
        <span className="rural-status"><span /> 面向农事实际</span>
      </header>

      <section className="rural-hero">
        <div className="rural-hero-image" aria-hidden="true" />
        <div className="rural-hero-copy">
          <span className="rural-eyebrow"><Sprout size={16} /> 乡村节约实践</span>
          <h1>守住一季收成，<em>也守住每一份资源。</em></h1>
          <p>农民是粮食的创造者。小俭不替农户下结论，而是把田间观察、节水减损和日常记录整理成更容易执行的下一步。</p>
          <div className="rural-hero-note"><Leaf size={17} /><span>节约不是少投入，而是让投入真正转化为收成。</span></div>
        </div>
        <div className="rural-hero-stats"><strong>01</strong><span>选择问题</span><strong>02</strong><span>小俭分析</span><strong>03</strong><span>落实记录</span></div>
      </section>

      <section className="rural-workspace">
        <div className="rural-section-intro"><span>01 / 先说说田里的情况</span><h2><span>问题可以很多，</span><span>尽量一次说清。</span></h2><p>不需要扫码，也不用输入隐私。可以把积水、漏水、粮食受潮、设备耗能等多个问题一起写下来，小俭会逐条拆开分析。</p><div className="rural-intro-points"><div><b>先盘点</b><span>看清已有水、地、粮食和设备</span></div><div><b>再分配</b><span>先保障关键环节，避免平均用力</span></div><div><b>后记录</b><span>用真实记录调整下一次投入</span></div></div></div>
        <div className="rural-topic-grid" role="tablist" aria-label="资源实践方向">
          {topicOptions.map(({ id, label, description, icon: Icon }) => <button type="button" role="tab" aria-selected={topic === id} className={topic === id ? "rural-topic active" : "rural-topic"} onClick={() => selectTopic(id)} key={id}><Icon size={21} /><span><strong>{label}</strong><small>{description}</small></span></button>)}
        </div>
        <div className="rural-form-panel">
          <label><span>当前作物</span><select value={crop} onChange={(event) => setCrop(event.target.value)}>{cropOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label><span>种植面积（亩）</span><input inputMode="decimal" value={acreage} onChange={(event) => setAcreage(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="可选，例如 12" /></label>
          <label><span>当前生长阶段</span><select value={stage} onChange={(event) => setStage(event.target.value)}>{stageOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label><span>主要资源来源</span><select value={resourceSource} onChange={(event) => setResourceSource(event.target.value)}>{sourceOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label className="rural-details-field"><span>田里还有哪些具体情况？</span><textarea ref={detailsRef} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} placeholder="例如：东边地块灌完水后积水，西边沟渠有渗漏；去年有一批粮食受潮，今年想知道怎么分开检查。" /></label>
          <div className="rural-voice-row"><button type="button" className={listening ? "rural-voice-button listening" : "rural-voice-button"} onClick={toggleListening} aria-label={listening ? "停止语音输入" : "开始语音输入"} title={listening ? "停止语音输入" : "语音输入"}>{listening ? <MicOff size={18} /> : <Mic size={18} />}<span>{listening ? "正在听，请说完后停止" : "语音补充情况"}</span></button><small>{details.length}/500{voiceError && <b>{voiceError}</b>}</small></div>
          <button type="button" className="rural-ask-button" onClick={askXiaoJian} disabled={status === "loading"}>{status === "loading" ? <LoaderCircle className="rural-spin" size={18} /> : <MessageCircle size={18} />} {status === "loading" ? "小俭正在整理方案" : "生成资源分配方案"}</button>
        </div>
      </section>

      <section className="rural-advice-section">
        <div className="rural-section-heading"><div><span>02 / 小俭的农事建议</span><h2>{advice ? `${crop} · ${topicOptions.find((item) => item.id === topic)?.label}` : "先选择一个问题，再开始诊断"}</h2></div>{advice && <em className={mode === "local" ? "local" : ""}>{mode === "local" ? "本地核验建议" : "小俭 AI 已结合当前问题"}</em>}</div>
        {advice ? <article className="rural-advice-card"><div className="rural-advice-mark"><Wheat size={26} /><span>小俭</span></div><div className="rural-advice-copy"><p>{advice}</p><button type="button" className="rural-speak-button" onClick={() => canSpeak() ? speakChinese(advice) : setVoiceError("当前微信浏览器不支持网页朗读，请在系统浏览器打开后使用语音播报。")} disabled={!canSpeak()}><Volume2 size={16} /> 朗读这份建议</button></div></article> : <div className="rural-advice-empty"><MessageCircle size={22} /><span>例如：选择“灌溉节水”后，小俭会帮你梳理检查漏点、安排分区轮灌和记录用水的方法。</span></div>}
      </section>

    </main>
  );
}
