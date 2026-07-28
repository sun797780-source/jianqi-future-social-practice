import { Navigate, useParams } from "react-router-dom";
import CommunityActionStation from "@/components/CommunityActionStation";
import KindergartenStory from "@/components/KindergartenStory";
import RuralActionStation from "@/components/RuralActionStation";
import SchoolInvestigation from "@/components/SchoolInvestigation";
import type { AudienceId } from "@/lib/content";

const audienceIds: AudienceId[] = ["kindergarten", "school", "community", "rural"];

export default function PracticeScenePage() {
  const { audienceId } = useParams();
  if (!audienceId || !audienceIds.includes(audienceId as AudienceId)) return <Navigate to="/" replace />;
  if (audienceId === "kindergarten") return <KindergartenStory />;
  if (audienceId === "school") return <SchoolInvestigation />;
  if (audienceId === "community") return <CommunityActionStation />;
  if (audienceId === "rural") return <RuralActionStation />;
  return <Navigate to="/" replace />;
}
