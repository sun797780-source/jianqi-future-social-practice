import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import PracticeScenePage from "@/pages/PracticeScenePage";
import XiaoJianPet from "@/components/XiaoJianPet";
import CommunityResidentSurvey from "@/components/CommunityResidentSurvey";

function RouteTiming() {
  const { pathname } = useLocation();
  useEffect(() => {
    const startedAt = performance.now();
    const frame = window.requestAnimationFrame(() => {
      performance.clearMeasures("jianqi:route:ready");
      performance.measure("jianqi:route:ready", { start: startedAt, duration: performance.now() - startedAt });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

function GlobalAssistant() {
  const { pathname } = useLocation();
  return pathname.startsWith("/practice/community") || pathname === "/practice/rural" ? null : <XiaoJianPet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTiming />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/practice/community/respond" element={<CommunityResidentSurvey />} />
        <Route path="/practice/:audienceId" element={<PracticeScenePage />} />
        <Route path="/action" element={<Navigate to="/" replace />} />
        <Route path="/pledge" element={<Navigate to="/" replace />} />
        <Route path="/impact" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <GlobalAssistant />
    </BrowserRouter>
  );
}
