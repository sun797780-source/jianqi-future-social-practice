import { NavLink } from "react-router-dom";
import { AudioLines, Gauge, Menu, X } from "lucide-react";
import { useState } from "react";
import { useExperienceStore } from "@/lib/experienceStore";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const sound = useExperienceStore((state) => state.soundEnabled);
  const lite = useExperienceStore((state) => state.liteMode);
  const toggleSound = useExperienceStore((state) => state.toggleSound);
  const toggleLiteMode = useExperienceStore((state) => state.toggleLiteMode);
  const audience = window.sessionStorage.getItem("jianqi:audience") || "kindergarten";
  const links = [
    [`/practice/${audience}`, "实践场景"],
  ];
  return (
    <header className="site-header">
      <NavLink to="/" className="brand" aria-label="返回首页">
        <span className="brand-seal">俭</span>
        <span><b>俭启未来</b><small>AI · TIME MACHINE</small></span>
      </NavLink>
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="切换导航">{open ? <X /> : <Menu />}</button>
      <nav className={open ? "nav-links open" : "nav-links"}>
        {links.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? "active" : ""}>{label}</NavLink>)}
      </nav>
      <div className="utility-actions">
        <button className={sound ? "active" : ""} onClick={toggleSound} title={sound ? "关闭声音" : "打开声音"} aria-pressed={sound} aria-label={sound ? "关闭声音" : "打开声音"}><AudioLines size={17} /></button>
        <button className={lite ? "active" : ""} onClick={toggleLiteMode} title={lite ? "恢复特效" : "降低特效"} aria-pressed={lite} aria-label={lite ? "恢复特效" : "降低特效"}><Gauge size={17} /></button>
      </div>
    </header>
  );
}
