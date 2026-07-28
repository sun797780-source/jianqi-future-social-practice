import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getAudiencePractice } from "@/lib/content";
import XiaoJianAvatar3D from "@/components/XiaoJianAvatar3D";

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionLike = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type PetMessage = {
  id: number;
  role: "pet" | "user";
  text: string;
};

type RouteContext = {
  label: string;
  greeting: string;
  suggestions: string[];
};

type PetStatus = "idle" | "thinking" | "listening" | "speaking";

type SchoolGrade = "primary" | "junior" | "senior";

type PetPosition = {
  x: number;
  y: number;
};

function cleanAssistantText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

type DragState = PetPosition & {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const PET_POSITION_KEY = "xiaojian-position-v3";
const PET_WIDTH = 72;
const PET_HEIGHT = 94;

function clampPosition(position: PetPosition): PetPosition {
  return {
    x: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - PET_WIDTH - 8)),
    y: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - PET_HEIGHT - 8)),
  };
}

function getInitialPosition(): PetPosition {
  const fallback = { x: window.innerWidth - PET_WIDTH - 20, y: window.innerHeight - PET_HEIGHT - 18 };
  try {
    const stored = localStorage.getItem(PET_POSITION_KEY);
    return clampPosition(stored ? JSON.parse(stored) as PetPosition : fallback);
  } catch {
    return clampPosition(fallback);
  }
}

function selectSunnyFemaleVoice(voices: SpeechSynthesisVoice[]) {
  const preferredNames = ["xiaoxiao", "xiaoyi", "xiaohan", "xiaomeng", "xiaorui", "tingting", "lili", "meijia", "sin-ji", "female", "女声"];
  const maleNames = ["yunxi", "yunyang", "yunjian", "yunhao", "kangkang", "male", "男声"];
  return [...voices]
    .map((voice) => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      let score = lang === "zh-cn" ? 100 : lang.startsWith("zh") ? 70 : 0;
      preferredNames.forEach((keyword, index) => {
        if (name.includes(keyword)) score += 70 - index;
      });
      maleNames.forEach((keyword) => {
        if (name.includes(keyword)) score -= 80;
      });
      if (name.includes("natural") || name.includes("online")) score += 12;
      if (voice.localService) score += 4;
      if (voice.default) score += 2;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

const routeContexts: Record<string, RouteContext> = {
  home: {
    label: "实践入口",
    greeting: "你好呀，我是小俭！选择幼儿园、中小学、社区或乡村，我会陪你从一件小事开始实践。",
    suggestions: ["四个场景有什么不同？", "帮我选一个实践场景", "给我一个今日节约建议"],
  },
  practice: {
    label: "实践场景",
    greeting: "场景已经准备好了。选一件最适合现在做的事，完成后我会陪你确认行动。",
    suggestions: ["本页重点是什么？", "推荐一项任务", "我该怎么记录观察？"],
  },
};

function getContext(pathname: string): RouteContext {
  if (pathname === "/") return routeContexts.home;
  if (pathname.startsWith("/practice/")) return routeContexts.practice;
  return routeContexts.home;
}

function createReply(question: string, pathname: string) {
  const text = question.trim();
  const audienceId = pathname.startsWith("/practice/") ? pathname.split("/")[2] : window.sessionStorage.getItem("jianqi:audience") || "kindergarten";
  const currentPractice = getAudiencePractice(audienceId);

  if (/你好|你是谁|小俭/.test(text)) return "你好，我是节约文明 AI 讲解员小俭。你可以问我页面内容、节约方法，也可以让我推荐下一站。";
  if (/开始|怎么走|时光之旅/.test(text)) return "点击“开启时光机”后，先选择实践对象，再进入对应的任务场景。选好一件任务，就可以到“我的行动”确认。";
  if (/四个场景|场景有什么|选.*场景/.test(text)) return "幼儿园从认识粮食和水开始；中小学聚焦校园资源；社区带动家庭和邻里；乡村关注收成与灌溉。先选离你最近的生活场景就好。";
  if (/本页重点/.test(text)) return `当前是“${currentPractice.label}”场景，重点是${currentPractice.focus}。你可以先试试“${currentPractice.tasks[0].title}”。`;
  if (/推荐.*任务|做什么|下一步/.test(text)) return `我推荐“${currentPractice.tasks[0].title}”：${currentPractice.tasks[0].detail}`;
  if (/记录|观察/.test(text)) return `完成后可以这样记录：${currentPractice.observation} 不用写很长，留下真实的一句话就够了。`;
  if (/选择行动|做什么|下一步/.test(text)) return "先选最容易连续做七天的一项：按需取餐、离开关灯、缩短用水时间，或自带水杯。小而稳定，比一次做很多更有效。";
  if (/光盘/.test(text)) return "光盘行动可以从少量多次取餐开始：先取七分饱，不够再添；不喜欢的菜提前少取，也能减少浪费。";
  if (/节水|用水/.test(text)) return "洗手打湿后先关水再涂洗手液，发现滴漏及时报告，接水时不让水龙头空流，都是容易坚持的节水动作。";
  if (/数据|代表/.test(text)) return "成果页用参与人次、文明行动次数和实践场次展示集体影响。当前是原型演示口径，资源节约量属于科普估算。";
  if (/有用|个人行动/.test(text)) return "当然有用。个人行动会形成习惯，习惯会影响同伴；当许多人持续做同一件小事，就会形成可见的集体改变。";
  if (/邀请|参与/.test(text)) return "可以这样说：请选择一项你愿意坚持的节约行动，让今天的承诺化作一束能量，共同点亮未来城市。";
  if (/建议|今日/.test(text)) return "今日小建议：离开一个空间前，回头看一眼灯、空调和水龙头。只用三秒，就能避免一次无谓消耗。";
  return `关于“${text}”，我建议从当前的“${getContext(pathname).label}”继续观察。你也可以问我本页重点、节约方法，或让我推荐下一步。`;
}

const statusLabels: Record<PetStatus, string> = {
  idle: "随时待命",
  thinking: "正在思考",
  listening: "正在聆听",
  speaking: "正在播报",
};

export default function XiaoJianPet() {
  const location = useLocation();
  const context = useMemo(() => getContext(location.pathname), [location.pathname]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<PetStatus>("idle");
  const [speechEnabled, setSpeechEnabled] = useState(() => localStorage.getItem("xiaojian-speech") !== "off");
  const [voiceError, setVoiceError] = useState("");
  const [aiMode, setAiMode] = useState<"online" | "local">("online");
  const [position, setPosition] = useState<PetPosition>(getInitialPosition);
  const [messages, setMessages] = useState<PetMessage[]>([{ id: 1, role: "pet", text: context.greeting }]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messageId = useRef(2);
  const replyTimerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<(question: string) => void>(() => undefined);
  const previousPathRef = useRef(location.pathname);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const recognitionSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const busy = status === "thinking";
  const dockLeft = position.x < window.innerWidth / 2;
  const dialogWidth = Math.min(390, window.innerWidth - 32);
  const dialogHeight = Math.min(610, window.innerHeight - 130);
  const dialogPosition = {
    left: Math.min(Math.max(16, dockLeft ? position.x + PET_WIDTH + 14 : position.x - dialogWidth - 14), window.innerWidth - dialogWidth - 16),
    top: Math.min(Math.max(16, position.y + PET_HEIGHT - dialogHeight), window.innerHeight - dialogHeight - 16),
  };

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    setMessages((current) => [...current, { id: messageId.current++, role: "pet", text: context.greeting }]);
    setVoiceError("");
  }, [context, location.pathname]);

  useEffect(() => {
    const updateVoice = () => {
      voiceRef.current = selectSunnyFemaleVoice(window.speechSynthesis?.getVoices() ?? []) ?? null;
    };
    updateVoice();
    window.speechSynthesis?.addEventListener("voiceschanged", updateVoice);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", updateVoice);
  }, []);

  useEffect(() => {
    const keepInViewport = () => setPosition((current) => clampPosition(current));
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, []);

  useEffect(() => {
    localStorage.setItem("xiaojian-speech", speechEnabled ? "on" : "off");
    if (!speechEnabled) {
      window.speechSynthesis?.cancel();
      setStatus((current) => current === "speaking" ? "idle" : current);
    }
  }, [speechEnabled]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, status]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    if (!speechSupported) setVoiceError("当前浏览器不支持语音播报，文字回复仍可正常使用。请用 Chrome 或 Edge 体验清脆语音。")
  }, [speechSupported]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => () => {
    if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    recognitionRef.current?.stop();
    requestRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    const spokenText = cleanAssistantText(text);
    if (!speechEnabled || !speechSupported) {
      setStatus("idle");
      return;
    }
    if (!spokenText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = "zh-CN";
    utterance.rate = 1.08;
    utterance.pitch = 1.16;
    utterance.volume = 0.92;
    setStatus("speaking");
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    const voice = voiceRef.current ?? selectSunnyFemaleVoice(window.speechSynthesis.getVoices());
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const answer = async (question: string) => {
    const cleaned = question.trim();
    if (!cleaned || status === "thinking") return;
    window.speechSynthesis?.cancel();
    setVoiceError("");
    const history = messages.slice(-8);
    setMessages((current) => [...current, { id: messageId.current++, role: "user", text: cleaned }]);
    setInput("");
    setStatus("thinking");
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const audienceId = location.pathname.startsWith("/practice/") ? location.pathname.split("/")[2] : window.sessionStorage.getItem("jianqi:audience") || "kindergarten";
      const currentPractice = getAudiencePractice(audienceId);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleaned,
          history: history.map((message) => ({
            role: message.role === "pet" ? "assistant" : "user",
            content: message.text,
          })),
          page: {
            path: location.pathname,
            label: context.label,
            schoolGrade: location.pathname === "/practice/school" ? window.sessionStorage.getItem("jianqi:school-grade") || undefined : undefined,
            schoolAnswer: location.pathname === "/practice/school" ? window.sessionStorage.getItem("jianqi:school-answer") || undefined : undefined,
            practice: {
              audience: currentPractice.label,
              title: currentPractice.title,
              focus: currentPractice.focus,
              tasks: currentPractice.tasks.map((task) => task.title),
            },
          },
        }),
        signal: controller.signal,
      });
      const data = await response.json() as { success?: boolean; reply?: string };
      if (!response.ok || !data.reply) throw new Error("AI unavailable");
      const cleanReply = cleanAssistantText(data.reply);
      setAiMode("online");
      setMessages((current) => [...current, { id: messageId.current++, role: "pet", text: cleanReply }]);
      speak(cleanReply);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const reply = createReply(cleaned, location.pathname);
      setAiMode("local");
      setMessages((current) => [...current, { id: messageId.current++, role: "pet", text: reply }]);
      setVoiceError("AI 服务未配置或暂时不可用，当前使用本地知识回答。");
      speak(reply);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  answerRef.current = answer;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    answer(input);
  };

  useEffect(() => {
    const handleClassroomQuestion = (event: Event) => {
      const detail = (event as CustomEvent<{ question?: string; schoolGrade?: SchoolGrade }>).detail;
      const question = detail?.question?.trim();
      if (!question) return;
      if (detail?.schoolGrade) window.sessionStorage.setItem("jianqi:school-grade", detail.schoolGrade);
      const answerMatch = question.match(/题库标准答案：([A-C]、[^。]+)/);
      if (answerMatch) window.sessionStorage.setItem("jianqi:school-answer", answerMatch[1]);
      setOpen(true);
      answerRef.current(question);
    };
    window.addEventListener("xiaojian:ask", handleClassroomQuestion);
    return () => window.removeEventListener("xiaojian:ask", handleClassroomQuestion);
  }, []);

  const toggleListening = () => {
    if (!recognitionSupported) {
      setVoiceError("当前浏览器不支持语音识别，请使用文字输入。Chrome 或 Edge 的支持通常更好。");
      return;
    }
    if (status === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    if (status === "thinking") return;

    window.speechSynthesis?.cancel();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      setStatus("idle");
      answer(transcript);
    };
    recognition.onerror = (event) => {
      setVoiceError(event.error === "not-allowed" ? "麦克风权限未开启，请在浏览器设置中允许访问。" : "没有听清，请再试一次或使用文字输入。");
      setStatus("idle");
    };
    recognition.onend = () => setStatus((current) => current === "listening" ? "idle" : current);
    recognitionRef.current = recognition;
    setVoiceError("");
    setStatus("listening");
    recognition.start();
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (open || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: position.x,
      y: position.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (!state.moved && Math.hypot(deltaX, deltaY) > 5) state.moved = true;
    if (state.moved) {
      event.preventDefault();
      setPosition(clampPosition({ x: state.x + deltaX, y: state.y + deltaY }));
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    suppressClickRef.current = state.moved;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (state.moved) {
      const nextPosition = clampPosition({
        x: state.x + event.clientX - state.startX,
        y: state.y + event.clientY - state.startY,
      });
      setPosition(nextPosition);
      localStorage.setItem(PET_POSITION_KEY, JSON.stringify(nextPosition));
    }
  };

  const toggleOpen = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <aside className={`xiaojian-pet ${open ? "open" : ""} ${dockLeft ? "dock-left" : "dock-right"} status-${status}${location.pathname === "/practice/kindergarten" ? " kindergarten-pet" : ""}`} style={{ left: position.x, top: position.y }} aria-label="小俭智能桌宠">
      {open && (
        <section className="pet-dialog" style={dialogPosition} aria-label="与小俭对话">
          <header className="pet-dialog-header">
            <div><span><Sparkles size={13} /> 小俭在线 <em className={`pet-ai-mode ${aiMode}`}>{aiMode === "online" ? "AI" : "本地"}</em></span><strong>{context.label}</strong></div>
            <div className="pet-dialog-actions">
              <button disabled={!speechSupported} onClick={() => setSpeechEnabled((value) => !value)} aria-pressed={speechEnabled} aria-label={!speechSupported ? "当前浏览器不支持语音播报" : speechEnabled ? "关闭语音播报" : "开启语音播报"} title={!speechSupported ? "当前浏览器不支持语音播报" : speechEnabled ? "关闭语音播报" : "开启语音播报"}>{speechEnabled ? <Volume2 /> : <VolumeX />}</button>
              <button onClick={() => setOpen(false)} aria-label="收起小俭"><ChevronDown /></button>
            </div>
          </header>
          <div className="pet-status-line" role="status"><i />{statusLabels[status]}</div>
          <div className="pet-message-log" ref={logRef} aria-live="polite">
            {messages.slice(-10).map((message) => <div key={message.id} className={`pet-message ${message.role}`}><span>{message.role === "pet" ? "小俭" : "你"}</span><p>{message.text}</p></div>)}
            {status === "thinking" && <div className="pet-message pet pet-thinking"><span>小俭</span><p><i /><i /><i /></p></div>}
          </div>
          <div className="pet-quick-questions">
            {context.suggestions.map((question) => <button key={question} disabled={busy} onClick={() => answer(question)}>{question}</button>)}
          </div>
          {voiceError && <p className="pet-voice-error" role="alert">{voiceError}</p>}
          <form className="pet-input-row" onSubmit={submit}>
            <button type="button" className={status === "listening" ? "listening" : ""} onClick={toggleListening} disabled={status === "thinking"} aria-label={status === "listening" ? "停止语音识别" : "开始语音识别"} title={recognitionSupported ? "语音提问" : "浏览器不支持语音识别"}>{status === "listening" ? <MicOff /> : <Mic />}</button>
            <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={status === "listening" ? "正在聆听…" : "问问小俭…"} maxLength={120} disabled={status === "thinking"} aria-label="输入问题" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="发送问题"><Send /></button>
          </form>
        </section>
      )}
      <button className="pet-character-button" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={toggleOpen} aria-expanded={open} aria-label={open ? "关闭小俭对话" : "打开小俭对话，可拖动调整位置"}>
        <span className="pet-speech-tip">{open ? statusLabels[status] : "问问小俭"}</span>
        <XiaoJianAvatar3D status={status} />
        {open && <X className="pet-close-mark" />}
      </button>
    </aside>
  );
}
