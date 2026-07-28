type RecognitionResultLike = {
  0?: { transcript?: string };
  isFinal?: boolean;
};

type RecognitionEventLike = Event & {
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionErrorLike = Event & {
  error: string;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

type DictationOptions = {
  onText: (text: string) => void;
  onListening: (listening: boolean) => void;
  onError: (message: string) => void;
  maxDurationMs?: number;
};

type SpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
};

let speechRun = 0;

function cleanSpeechText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function chooseYoungChineseVoice(voices: SpeechSynthesisVoice[]) {
  const youngFemale = ["xiaoxiao", "xiaoyi", "xiaohan", "xiaomeng", "xiaorui", "tingting", "lili", "meijia", "sin-ji", "female", "女声"];
  const male = ["yunxi", "yunyang", "yunjian", "yunhao", "kangkang", "male", "男声"];
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("zh"))
    .map((voice) => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      let score = lang === "zh-cn" ? 120 : 90;
      youngFemale.forEach((keyword, index) => {
        if (name.includes(keyword)) score += 100 - index;
      });
      male.forEach((keyword) => {
        if (name.includes(keyword)) score -= 150;
      });
      if (name.includes("natural") || name.includes("online")) score += 25;
      if (voice.localService) score += 3;
      return { voice, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function splitForWeChat(text: string) {
  const sentences = text.match(/[^。！？；\n]+[。！？；\n]?/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  sentences.forEach((sentence) => {
    if (current && current.length + sentence.length > 110) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

export function supportsSpeechRecognition() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function supportsSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function primeSpeechSynthesis() {
  if (!supportsSpeechSynthesis()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();
  const primer = new SpeechSynthesisUtterance("。");
  primer.lang = "zh-CN";
  primer.volume = 0.01;
  primer.rate = 10;
  const voice = chooseYoungChineseVoice(synth.getVoices());
  if (voice) primer.voice = voice;
  synth.speak(primer);
}

export function stopSpeech() {
  speechRun += 1;
  window.speechSynthesis?.cancel();
}

export function speakChineseAutomatically(text: string, options: SpeakOptions = {}) {
  if (!supportsSpeechSynthesis()) {
    options.onEnd?.();
    return;
  }
  const spokenText = cleanSpeechText(text);
  if (!spokenText) {
    options.onEnd?.();
    return;
  }
  const run = ++speechRun;
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();

  const begin = (attempt = 0) => {
    if (run !== speechRun) return;
    const voices = synth.getVoices();
    if (!voices.length && attempt < 8) {
      window.setTimeout(() => begin(attempt + 1), 120);
      return;
    }
    const voice = chooseYoungChineseVoice(voices);
    const chunks = splitForWeChat(spokenText);
    let index = 0;
    const next = () => {
      if (run !== speechRun) return;
      if (index >= chunks.length) {
        options.onEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = "zh-CN";
      utterance.rate = 1.06;
      utterance.pitch = 1.18;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = options.onStart ?? null;
      utterance.onend = next;
      utterance.onerror = () => options.onEnd?.();
      synth.speak(utterance);
    };
    next();
  };
  begin();
}

export function startChineseDictation(options: DictationOptions) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    options.onError("当前微信版本不支持网页语音识别，请更新微信或改用文字输入。");
    return null;
  }

  const maxDurationMs = options.maxDurationMs ?? 15_000;
  const startedAt = Date.now();
  let active = true;
  let recognition: RecognitionLike | null = null;
  let restartTimer: number | null = null;
  let timeoutTimer: number | null = null;
  let transcript = "";

  const finish = (message?: string) => {
    if (!active) return;
    active = false;
    if (restartTimer) window.clearTimeout(restartTimer);
    if (timeoutTimer) window.clearTimeout(timeoutTimer);
    options.onListening(false);
    if (message) options.onError(message);
  };

  const startAttempt = () => {
    if (!active) return;
    if (Date.now() - startedAt >= maxDurationMs) {
      finish("没有听清，请靠近麦克风再试一次或使用文字输入。");
      return;
    }
    recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => options.onListening(true);
    recognition.onresult = (event) => {
      transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join("").trim();
      if (!transcript) return;
      const text = transcript;
      recognition?.stop();
      finish();
      options.onText(text);
    };
    recognition.onerror = (event) => {
      if (!active) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        finish("麦克风权限未开启，请在微信设置中允许使用麦克风。");
        return;
      }
      if (event.error === "audio-capture") {
        finish("微信没有取得麦克风，请检查系统麦克风权限后重试。");
        return;
      }
      if (event.error === "network") {
        finish("微信语音识别服务连接失败，请检查网络后重试。");
      }
    };
    recognition.onend = () => {
      if (!active || transcript) return;
      const remaining = maxDurationMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        finish("没有听清，请靠近麦克风再试一次或使用文字输入。");
        return;
      }
      restartTimer = window.setTimeout(startAttempt, Math.min(350, remaining));
    };
    try {
      recognition.start();
    } catch {
      restartTimer = window.setTimeout(startAttempt, 350);
    }
  };

  options.onError("");
  options.onListening(true);
  timeoutTimer = window.setTimeout(() => {
    recognition?.stop();
    finish("没有听清，请靠近麦克风再试一次或使用文字输入。");
  }, maxDurationMs);
  startAttempt();

  return {
    stop: () => {
      recognition?.stop();
      finish();
    },
  };
}
