type SelectableCardProps = {
  selected: boolean;
  title: string;
  lines: string[];
  badge?: string;
  onClick: () => void;
};

export default function SelectableCard({
  selected,
  title,
  lines,
  badge,
  onClick
}: SelectableCardProps) {
  return (
    <button
      type="button"
      className={`sssw-select-card ${selected ? 'sssw-select-card--active' : ''}`}
      onClick={onClick}
      role="radio"
      aria-checked={selected}
    >
      <span className={`sssw-select-card-radio ${selected ? 'sssw-select-card-radio--active' : ''}`}>
        <span className="sssw-select-card-radio-dot" />
      </span>
      <div className="sssw-select-card-content">
        <div className="sssw-select-card-header">
          <span className="sssw-select-card-title">{title}</span>
        </div>
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="sssw-select-card-line">
            {line}
          </span>
        ))}
        {badge && <span className="sssw-select-card-badge">{badge}</span>}
      </div>
    </button>
  );
}
