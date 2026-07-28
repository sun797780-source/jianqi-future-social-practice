import { useRef, useState } from "react";
import { ArrowLeft, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import "@/kindergarten-play.css";
import { useNavigate } from "react-router-dom";

const videoSource = "/kindergarten-mg-story-web.mp4";

export default function KindergartenStory() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [portrait, setPortrait] = useState(false);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  };

  const replay = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    await video.play();
  };

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await video.requestFullscreen();
  };

  return (
    <main className={`kindergarten-film ${portrait ? "portrait-film" : "landscape-film"}`} aria-label="幼儿园节约主题动画宣讲">
      <header className="kindergarten-film-header">
        <button type="button" className="film-back" onClick={() => navigate("/?stage=audience")}><ArrowLeft size={23} /> 返回场景选择</button>
        <div className="film-title"><span>幼儿园 · 动画宣讲</span><h1>小俭陪你看粮食的故事</h1></div>
        <p>约 2 分 30 秒 · 建议打开声音观看</p>
      </header>

      <section className="kindergarten-film-stage">
        <div className="film-cloud film-cloud-left" aria-hidden="true" />
        <div className="film-cloud film-cloud-right" aria-hidden="true" />
        <div className="film-screen">
          <video
            ref={videoRef}
            src={videoSource}
            poster="/kindergarten-grain-poster.png"
            muted={muted}
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => setPortrait(event.currentTarget.videoHeight > event.currentTarget.videoWidth)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration : 0)}
            aria-label="幼儿园节约主题动画"
          />
          {!playing && <button type="button" className="film-big-play" onClick={togglePlay} aria-label="开始故事"><i className="film-play-spark spark-one" /><i className="film-play-spark spark-two" /><i className="film-play-spark spark-three" /><span className="film-play-icon"><Play fill="currentColor" size={39} /></span><b>开始故事</b></button>}
          <div className="film-controls">
            <button type="button" onClick={togglePlay} aria-label={playing ? "暂停动画" : "播放动画"}>{playing ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}</button>
            <button type="button" onClick={replay} aria-label="从头播放动画"><RotateCcw size={20} /></button>
            <div className="film-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
            <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "打开动画声音" : "关闭动画声音"}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
            <button type="button" onClick={toggleFullscreen} aria-label="全屏播放动画"><Maximize size={20} /></button>
          </div>
        </div>
      </section>

      <footer className="kindergarten-film-footer">
        <span>看完动画，欢迎和 AI 小俭聊一聊你记住了什么。</span>
        <strong>珍惜每一粒米 · 好好吃完每一餐</strong>
      </footer>
    </main>
  );
}
