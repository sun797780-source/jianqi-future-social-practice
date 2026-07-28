import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Wheat } from "lucide-react";
import { audiencePractices, type AudienceId } from "@/lib/content";

type AudienceSelectorProps = {
  onBack: () => void;
  onSelect: (audience: AudienceId) => void;
};

export default function AudienceSelector({ onBack, onSelect }: AudienceSelectorProps) {
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  return (
    <section className="audience-selector" aria-labelledby="audience-selector-title">
      <div className="audience-background-art" aria-hidden="true">
        <span className="audience-waterline audience-waterline-one" />
        <span className="audience-waterline audience-waterline-two" />
        <span className="audience-waterline audience-waterline-three" />
        <Wheat className="audience-rice-mark audience-rice-mark-left" />
        <Wheat className="audience-rice-mark audience-rice-mark-right" />
      </div>
      <header className="audience-selector-header">
        <button type="button" className="audience-back" onClick={onBack}><ArrowLeft size={16} /> 返回封面</button>
        <h1 id="audience-selector-title">
          <span>这次时光机</span>
          <span>要和谁一起出发？</span>
        </h1>
      </header>
      <div className="audience-grid">
        {audiencePractices.map(({ id, label, eyebrow: detail, image, icon: Icon }, index) => (
          <button
            type="button"
            className="audience-tile"
            key={id}
            style={{ "--audience-image": `url('${image}')`, "--audience-index": index } as React.CSSProperties}
            onClick={() => onSelect(id)}
          >
            <span className="audience-tile-index">0{index + 1}</span>
            <span className="audience-tile-content"><i><Icon size={22} /></i><strong>{label}</strong><small>{detail}</small></span>
            <ArrowRight className="audience-tile-arrow" size={22} />
          </button>
        ))}
      </div>
    </section>
  );
}
