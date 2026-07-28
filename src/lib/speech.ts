function chooseChineseVoice(voices: SpeechSynthesisVoice[]) {
  return [...voices]
    .filter((voice) => voice.lang.toLowerCase().startsWith("zh"))
    .sort((a, b) => Number(b.localService) - Number(a.localService) || Number(b.default) - Number(a.default))[0];
}

export function cleanSpeechText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakChinese(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!canSpeak()) return false;
  const spokenText = cleanSpeechText(text);
  if (!spokenText) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume();
  const chunks = spokenText.match(/[\s\S]{1,180}(?:。|！|？|；|\.|!|\?|;|$)/g) ?? [spokenText];
  let index = 0;
  const speakNext = () => {
    if (index >= chunks.length) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
    utterance.lang = "zh-CN";
    utterance.rate = 1.05;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    const voice = chooseChineseVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.onstart = onStart;
    utterance.onend = speakNext;
    utterance.onerror = onEnd;
    synth.speak(utterance);
  };
  speakNext();
  return true;
}
