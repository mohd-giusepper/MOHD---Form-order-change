type ChoiceListItemProps = {
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function ChoiceListItem({ label, description, onClick, disabled }: ChoiceListItemProps) {
  return (
    <button
      type="button"
      className="sssw-choice-item"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="sssw-choice-text">
        <span className="sssw-choice-label">{label}</span>
        <span className="sssw-choice-description">{description}</span>
      </div>
      <span className="sssw-choice-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </span>
    </button>
  );
}
