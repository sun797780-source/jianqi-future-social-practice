import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AudienceSelector from "@/components/AudienceSelector";
import LaunchCover from "@/components/LaunchCover";
import type { AudienceId } from "@/lib/content";

export default function Home() {
  const [searchParams] = useSearchParams();
  const [launchStage, setLaunchStage] = useState<"cover" | "audience">(() => searchParams.get("stage") === "audience" ? "audience" : "cover");
  const navigate = useNavigate();

  const selectAudience = (audience: AudienceId) => {
    window.sessionStorage.setItem("jianqi:audience", audience);
    navigate(`/practice/${audience}`);
  };

  return (
    <main className="app-shell home-page has-launch-cover">
      {launchStage === "cover"
        ? <LaunchCover onEnter={() => setLaunchStage("audience")} />
        : <AudienceSelector onBack={() => setLaunchStage("cover")} onSelect={selectAudience} />}
    </main>
  );
}
