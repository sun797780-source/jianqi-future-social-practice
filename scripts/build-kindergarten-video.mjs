import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDir = join(root, "public");
const workDir = join(root, ".kindergarten-video-build");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const duration = 15;
const scenes = [
  ["你好呀！我是小俭。今天，米粒和水滴要带我们去看看，怎样做一个爱粮节水的小小守护员！", "小俭和朋友们出发啦", "intro"],
  ["瞧，小米粒的家在田野里。农民伯伯把一颗颗种子，轻轻放进松软的泥土。", "一颗种子，住进泥土里", "seed"],
  ["太阳公公送来暖暖的阳光，云朵姐姐送来甜甜的雨水，小苗一点一点长高啦！", "阳光、雨水，陪小苗长大", "grow"],
  ["经过很多天的照顾，绿油油的禾苗变成金灿灿的稻穗。每一粒米，都要慢慢长大。", "一粒米，要经过好久好久", "harvest"],
  ["收割、晾晒、碾米，再坐上小车，白白的米粒才来到我们的餐桌上。", "从田野到餐桌，不容易", "journey"],
  ["午餐时间到！小朋友先想一想：我今天能吃多少呢？吃多少，盛多少。", "吃多少，盛多少", "bowl"],
  ["如果还想吃，别着急，可以再添一点点。这样，饭碗里的每一口都会被好好吃完。", "不够再添，光盘最棒", "finish"],
  ["呀，水龙头在滴答滴答。小水滴说：我可珍贵啦！不用水的时候，请把水龙头关紧。", "滴答滴答，快把我关紧", "tap"],
  ["洗手时，搓手的时候先关一关水。清清的水流，够用就好，不让它偷偷跑掉。", "用水时，够用就好", "wash"],
  ["洗菜的水、洗手的水，也能用来给小花小草喝。小水滴又有了新的任务！", "让每一滴水，都有新用处", "water"],
  ["爱惜粮食，节约用水，不是一件难事。每天做好一小点，地球就会开心一点！", "每天一小点，地球开心点", "earth"],
  ["现在，和小俭一起说：珍惜每一粒米，节约每一滴水！我们都是小小守护员！", "珍惜每一粒米 · 节约每一滴水", "outro"],
];

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cloud(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="#fff" opacity=".92"><circle cx="0" cy="20" r="21"/><circle cx="30" cy="5" r="28"/><circle cx="64" cy="21" r="22"/><rect x="0" y="20" width="65" height="24" rx="12"/></g>`;
}

function grain(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 52C-6 24 2 3 26 -14" fill="none" stroke="#53a45a" stroke-width="6" stroke-linecap="round"/><g fill="#f7c95b"><ellipse cx="18" cy="-4" rx="9" ry="15" transform="rotate(-28 18 -4)"/><ellipse cx="30" cy="11" rx="9" ry="15" transform="rotate(28 30 11)"/><ellipse cx="15" cy="20" rx="9" ry="15" transform="rotate(-28 15 20)"/><ellipse cx="28" cy="34" rx="9" ry="15" transform="rotate(28 28 34)"/></g></g>`;
}

function drop(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 -36C-24 -4 -25 10 -25 23A25 25 0 0 0 25 23C25 10 24 -4 0 -36Z" fill="#48b9e9"/><ellipse cx="-8" cy="10" rx="5" ry="8" fill="#fff" opacity=".85"/><circle cx="-7" cy="15" r="2" fill="#278fc2"/><circle cx="8" cy="15" r="2" fill="#278fc2"/><path d="M-5 26Q0 31 6 26" fill="none" stroke="#278fc2" stroke-width="2" stroke-linecap="round"/></g>`;
}

function xiaoJian(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="118" rx="45" ry="10" fill="#29435d" opacity=".12"/><path d="M-42 75Q-61 91 -68 75" fill="none" stroke="#f6b965" stroke-width="12" stroke-linecap="round"/><path d="M42 75Q60 61 66 79" fill="none" stroke="#f6b965" stroke-width="12" stroke-linecap="round"/><rect x="-38" y="39" width="76" height="71" rx="28" fill="#6db66e"/><path d="M-18 42Q0 57 18 42V70H-18Z" fill="#f6be68"/><circle cy="15" r="46" fill="#f6c571"/><path d="M-42 8Q-37 -44 0 -44Q38 -44 44 8Q24 -11 0 -10Q-24 -10 -42 8" fill="#56413d"/><circle cx="-16" cy="15" r="4" fill="#4c3d38"/><circle cx="16" cy="15" r="4" fill="#4c3d38"/><path d="M-10 28Q0 37 10 28" fill="none" stroke="#cf725e" stroke-width="3.5" stroke-linecap="round"/><circle cx="-28" cy="26" r="6" fill="#ed9788" opacity=".65"/><circle cx="28" cy="26" r="6" fill="#ed9788" opacity=".65"/></g>`;
}

function riceFriend(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="44" rx="25" ry="8" fill="#29435d" opacity=".12"/><ellipse cy="0" rx="34" ry="46" fill="#fff4ca" transform="rotate(28)"/><circle cx="-7" cy="-4" r="3.5" fill="#604d3e"/><circle cx="10" cy="-4" r="3.5" fill="#604d3e"/><path d="M-5 10Q2 17 9 9" fill="none" stroke="#cf725e" stroke-width="3" stroke-linecap="round"/></g>`;
}

function landscape(type) {
  if (type === "seed" || type === "grow" || type === "harvest") {
    const grown = type === "grow" || type === "harvest";
    const gold = type === "harvest";
    const plants = Array.from({ length: 15 }, (_, index) => grain(170 + index * 66, gold ? 565 : 593, gold ? 1.35 : grown ? 0.95 : 0.45)).join("");
    return `<circle cx="1100" cy="120" r="62" fill="#ffd967"/>${cloud(210, 105, .9)}${cloud(880, 170, .72)}<path d="M0 530Q200 445 400 530T800 530T1280 510V720H0Z" fill="#85c770"/><path d="M0 615Q250 535 500 620T950 590T1280 625V720H0Z" fill="#62af62"/><path d="M0 625Q260 585 520 630T950 615T1280 642V720H0Z" fill="#a95f3f" opacity=".7"/>${plants}`;
  }
  if (type === "journey") return `<path d="M0 540Q235 445 530 535T1280 510V720H0Z" fill="#88c975"/>${grain(180, 520, 1.2)}${grain(260, 530, 1.1)}<path d="M0 595Q360 540 620 600T1280 580V720H0Z" fill="#e5bd75"/><path d="M0 602Q370 553 650 610T1280 590" fill="none" stroke="#fff2cf" stroke-width="13" stroke-dasharray="28 25"/><g transform="translate(750 455)"><rect width="255" height="113" rx="18" fill="#ffbf64"/><rect x="33" y="26" width="112" height="53" rx="8" fill="#bce7f3"/><path d="M150 0v-34h48v34" fill="none" stroke="#d67d49" stroke-width="12"/><circle cx="52" cy="117" r="28" fill="#496173"/><circle cx="207" cy="117" r="28" fill="#496173"/><circle cx="52" cy="117" r="10" fill="#f3d78b"/><circle cx="207" cy="117" r="10" fill="#f3d78b"/></g>`;
  return "";
}

function sceneIllustration(type) {
  if (["seed", "grow", "harvest", "journey"].includes(type)) return landscape(type);
  if (type === "bowl" || type === "finish") return `<path d="M0 535Q270 480 520 550T1280 520V720H0Z" fill="#ffd9a1"/><rect y="570" width="1280" height="150" fill="#f3c782"/><ellipse cx="680" cy="590" rx="230" ry="46" fill="#e3ae65" opacity=".35"/><g transform="translate(620 410)"><path d="M-156 0H156Q132 168 0 168Q-132 168 -156 0" fill="#ff8e64"/><ellipse rx="156" ry="38" fill="#fff5df"/><ellipse rx="112" ry="20" fill="#fff"/><g fill="#f4dfaf"><ellipse cx="-54" cy="-5" rx="25" ry="10"/><ellipse cx="-10" cy="1" rx="28" ry="11"/><ellipse cx="42" cy="-5" rx="27" ry="10"/></g></g>${type === "bowl" ? `<g transform="translate(340 395) rotate(-18)"><rect x="-20" y="-130" width="39" height="150" rx="18" fill="#ca8d58"/><path d="M-52 10Q0 -46 52 10V45Q0 86 -52 45Z" fill="#e4a05c"/><g fill="#f5dfa9"><ellipse cx="-24" cy="15" rx="18" ry="8"/><ellipse cx="9" cy="10" rx="18" ry="8"/><ellipse cx="27" cy="31" rx="17" ry="8"/></g></g>` : `<g transform="translate(310 390)"><circle r="77" fill="#5fb56a"/><path d="M-20 -6l18 18 37-48" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/></g>`}`;
  if (type === "water") return `<path d="M0 585Q320 515 620 578T1280 560V720H0Z" fill="#b8e6df"/><path d="M0 610H1280V720H0Z" fill="#83c7bf"/><g transform="translate(720 465)"><path d="M0 125V10" stroke="#52a657" stroke-width="15" stroke-linecap="round"/><path d="M0 67Q-75 18 -117 60Q-45 110 0 97M0 95Q70 24 119 63Q51 122 0 120" fill="#76c869"/><circle cx="0" cy="0" r="28" fill="#faec78"/><circle cx="-10" cy="-4" r="3"/><circle cx="10" cy="-4" r="3"/><path d="M-7 10Q0 16 8 10" fill="none" stroke="#c77554" stroke-width="2"/></g>${drop(470, 380, 1.5)}${drop(530, 320, .8)}`;
  if (type === "tap" || type === "wash") {
    const waterFlow = type === "tap"
      ? `${drop(220, 151, 1)}${drop(220, 238, .7)}${drop(220, 307, .45)}`
      : `<path d="M195 121Q250 170 220 238" fill="none" stroke="#62c7ef" stroke-width="23" stroke-linecap="round"/><g transform="translate(-190 220)"><path d="M-90 10Q0 -112 90 10V86H-90Z" fill="#ffd481"/><circle cx="-28" cy="-3" r="5"/><circle cx="28" cy="-3" r="5"/><path d="M-22 27Q0 47 22 27" fill="none" stroke="#c7785e" stroke-width="4"/></g>`;
    return `<path d="M0 585Q320 515 620 578T1280 560V720H0Z" fill="#b8e6df"/><path d="M0 610H1280V720H0Z" fill="#83c7bf"/><g transform="translate(665 320)"><path d="M0 10V115H225V70" fill="none" stroke="#8b9daf" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/><path d="M-65 15H55" stroke="#8b9daf" stroke-width="36" stroke-linecap="round"/><path d="M-38 -30V57" stroke="#8b9daf" stroke-width="25" stroke-linecap="round"/><circle cx="-38" cy="-33" r="30" fill="#f6c75d"/><circle cx="220" cy="76" r="20" fill="#738799"/>${waterFlow}</g>`;
  }
  if (type === "earth") return `<circle cx="640" cy="350" r="185" fill="#62bde4"/><path d="M520 245q73-85 125-25q54 5 90 77q-20 58-89 60q-42 63-123 15q-46-64-3-127" fill="#78c86d"/><path d="M711 409q96-49 101 43q-68 104-157 64q-19-59 56-107" fill="#78c86d"/>${grain(385, 485, 1.5)}${drop(895, 440, 1.5)}${xiaoJian(645, 505, 1.12)}`;
  if (type === "intro" || type === "outro") return `${cloud(164, 134, 1)}${cloud(956, 120, .9)}<path d="M0 560Q250 475 470 553T890 535T1280 544V720H0Z" fill="#91cc79"/>${xiaoJian(610, 475, 1.28)}${riceFriend(385, 514, 1.25)}${drop(890, 475, 1.18)}${type === "outro" ? `<g transform="translate(634 160)"><path d="M0 -50l13 35 37 1-30 22 11 36L0 22-31 44-20 8-50-14l37-1Z" fill="#ffd15d"/><text y="100" text-anchor="middle" font-size="31" font-weight="700" fill="#fff">小小守护员</text></g>` : ""}`;
  return "";
}

function buildSvg(index, [voice, caption, type]) {
  const title = type === "intro" ? "米粒和水滴的守护约定" : type === "outro" ? "一起守护美好地球" : "小俭的节约小课堂";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#beeefe"/><stop offset="1" stop-color="#fff4d9"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#587087" flood-opacity=".2"/></filter></defs><rect width="1280" height="720" fill="url(#sky)"/>${sceneIllustration(type)}<g filter="url(#shadow)"><rect x="88" y="56" width="272" height="50" rx="25" fill="#fff" opacity=".92"/><text x="224" y="89" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="24" font-weight="700" fill="#4a6d73">${title}</text></g><g filter="url(#shadow)"><rect x="124" y="610" width="1032" height="68" rx="34" fill="#fff" opacity=".94"/><text x="640" y="654" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="31" font-weight="700" fill="#40666c">${escapeXml(caption)}</text></g><g transform="translate(1175 70)"><circle r="28" fill="#fff" opacity=".9"/><text y="8" text-anchor="middle" font-family="Arial" font-size="19" font-weight="700" fill="#56a669">${String(index + 1).padStart(2, "0")}</text></g></svg>`;
}

mkdirSync(workDir, { recursive: true });

for (let index = 0; index < scenes.length; index += 1) {
  const svgPath = join(workDir, `scene-${index + 1}.svg`);
  const pngPath = join(workDir, `scene-${index + 1}.png`);
  const clipPath = join(workDir, `clip-${index + 1}.mp4`);
  if (!existsSync(clipPath)) {
    writeFileSync(svgPath, buildSvg(index, scenes[index]), "utf8");
    run(edge, ["--headless", "--disable-gpu", "--hide-scrollbars", "--screenshot=" + pngPath, "--window-size=1280,720", "file:///" + svgPath.replaceAll("\\", "/")]);
    run(ffmpeg, ["-y", "-loop", "1", "-i", pngPath, "-t", String(duration), "-vf", "scale=1280:720,zoompan=z='min(zoom+0.00038,1.055)':x='iw/2-(iw/zoom/2)+sin(on/35)*6':y='ih/2-(ih/zoom/2)+cos(on/41)*4':d=450:s=1280x720:fps=30,fade=t=in:st=0:d=0.65,fade=t=out:st=14.25:d=0.75", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-an", clipPath]);
  }
}

writeFileSync(join(workDir, "clips.txt"), scenes.map((_, index) => `file 'clip-${index + 1}.mp4'`).join("\n"), "utf8");
if (!existsSync(join(workDir, "video.mp4"))) run(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", join(workDir, "clips.txt"), "-c", "copy", join(workDir, "video.mp4")]);

const narrationData = scenes.map(([line]) => Buffer.from(line, "utf8").toString("base64"));
const narrationScript = `$ErrorActionPreference = 'Stop'\nAdd-Type -AssemblyName System.Speech\n$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer\n$speaker.SelectVoice('Microsoft Huihui Desktop')\n$speaker.Rate = -1\n$speaker.Volume = 100\n$lines = @(${narrationData.map((line) => `'${line}'`).join(",")})\nfor ($index = 0; $index -lt $lines.Count; $index++) { $text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($lines[$index])); $speaker.SetOutputToWaveFile((Join-Path $PSScriptRoot ('voice-' + ($index + 1) + '.wav'))); $speaker.Speak($text); $speaker.SetOutputToNull() }`;
const narrationPath = join(workDir, "make-narration.ps1");
writeFileSync(narrationPath, `\uFEFF${narrationScript}`, "utf8");
run("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", narrationPath]);

const audioInputs = ["-f", "lavfi", "-t", "180", "-i", "aevalsrc=0.012*sin(2*PI*261.63*t)+0.009*sin(2*PI*329.63*t)+0.007*sin(2*PI*392*t):s=44100"];
for (let index = 0; index < scenes.length; index += 1) audioInputs.push("-i", join(workDir, `voice-${index + 1}.wav`));
const voiceFilters = scenes.map((_, index) => `[${index + 1}:a]adelay=${index * duration + 2200}|${index * duration + 2200},volume=1.35[v${index}]`).join(";");
const audioMix = `[0:a]volume=0.50[music];${voiceFilters};[music]${scenes.map((_, index) => `[v${index}]`).join("")}amix=inputs=${scenes.length + 1}:duration=first:dropout_transition=2,alimiter=limit=0.95[a]`;
run(ffmpeg, ["-y", ...audioInputs, "-filter_complex", audioMix, "-map", "[a]", "-c:a", "aac", "-b:a", "160k", join(workDir, "audio.m4a")]);
run(ffmpeg, ["-y", "-i", join(workDir, "video.mp4"), "-i", join(workDir, "audio.m4a"), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", "-shortest", join(outputDir, "kindergarten-mg-story.mp4")]);

console.log(`Created ${join(outputDir, "kindergarten-mg-story.mp4")}`);
