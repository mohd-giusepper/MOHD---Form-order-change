type StepHeaderProps = {
  title: string;
  helper?: string;
  onBack?: () => void;
};

export default function StepHeader({ title, helper, onBack }: StepHeaderProps) {
  return (
    <div className="sssw-step-header">
      {onBack && (
        <div className="sssw-step-back-row">
          <button type="button" className="sssw-link-button sssw-back-link" onClick={onBack}>
            <span className="sssw-back-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d="M10.5 3 6 7.5 10.5 12" />
              </svg>
            </span>
            Indietro
          </button>
        </div>
      )}
      <p className="sssw-step-title">{title}</p>
      {helper && <p className="sssw-step-helper">{helper}</p>}
    </div>
  );
}
