import StepHeader from './StepHeader';

type CancelStepProps = {
  cancelConfirmed: boolean;
  isPaid: boolean;
  onBack: () => void;
  onToggle: (nextValue: boolean) => void;
};

export default function CancelStep({
  cancelConfirmed,
  isPaid,
  onBack,
  onToggle
}: CancelStepProps) {
  return (
    <div className="sssw-wizard-body">
      <StepHeader
        title="Cancella ordine"
        helper="La richiesta annulla l'ordine e invia una conferma via email."
        onBack={onBack}
      />
      <div className="sssw-cancel">
        <label className="sssw-cancel-check">
          <input
            type="checkbox"
            checked={cancelConfirmed}
            onChange={(event) => onToggle(event.target.checked)}
            disabled={!isPaid}
          />
          <span>Confermo di voler cancellare l'ordine.</span>
        </label>
      </div>
    </div>
  );
}
