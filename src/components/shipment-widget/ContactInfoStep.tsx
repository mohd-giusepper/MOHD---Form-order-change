import StepHeader from './StepHeader';

type ContactInfoStepProps = {
  contactEmail: string;
  contactPhone: string;
  isPaid: boolean;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
};

export default function ContactInfoStep({
  contactEmail,
  contactPhone,
  isPaid,
  onBack,
  onChangeEmail,
  onChangePhone
}: ContactInfoStepProps) {
  return (
    <div className="sssw-wizard-body">
      <StepHeader
        title="Modifica informazioni"
        helper="Aggiorna i riferimenti di contatto associati all'ordine."
        onBack={onBack}
      />
      <div className="sssw-fieldset">
        <label className="sssw-field">
          <span>Email</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => onChangeEmail(event.target.value)}
            disabled={!isPaid}
          />
        </label>
        <label className="sssw-field">
          <span>Telefono</span>
          <input
            type="tel"
            value={contactPhone}
            onChange={(event) => onChangePhone(event.target.value)}
            disabled={!isPaid}
          />
        </label>
      </div>
    </div>
  );
}
