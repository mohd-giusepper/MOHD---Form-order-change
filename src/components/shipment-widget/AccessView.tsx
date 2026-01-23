import type { FormEvent } from 'react';
import type { ApiMode } from './types';

type AccessViewProps = {
  apiMode: ApiMode;
  access: { orderId: string; email: string };
  errors: { orderId?: string; email?: string };
  onUseTestData: () => void;
  onUseMohdData: () => void;
  onUpdateAccess: (nextAccess: { orderId: string; email: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AccessView({
  apiMode,
  access,
  errors,
  onUseTestData,
  onUseMohdData,
  onUpdateAccess,
  onSubmit
}: AccessViewProps) {
  return (
    <div className="sssw-access">
      <div className="sssw-env">
        <span className="sssw-env-label">Ambiente</span>
        <div className="sssw-env-group">
          <button
            type="button"
            className={`sssw-env-button ${apiMode === 'test' ? 'sssw-env-button--active' : ''}`}
            onClick={onUseTestData}
          >
            Test
          </button>
          <button
            type="button"
            className={`sssw-env-button ${apiMode === 'mohd' ? 'sssw-env-button--active' : ''}`}
            onClick={onUseMohdData}
          >
            MOHD
          </button>
        </div>
      </div>

      <form className="sssw-form" onSubmit={onSubmit}>
        <h2 className="sssw-title">Accesso spedizione</h2>
        <p className="sssw-subtitle">Inserisci ordine ed email per recuperare i dati.</p>

        <label className="sssw-field">
          <span>Order ID</span>
          <input
            type="text"
            value={access.orderId}
            onChange={(event) => onUpdateAccess({ ...access, orderId: event.target.value })}
            placeholder="Es. ORD-45892"
          />
          {errors.orderId && <span className="sssw-error">{errors.orderId}</span>}
        </label>

        <label className="sssw-field">
          <span>Email</span>
          <input
            type="email"
            value={access.email}
            onChange={(event) => onUpdateAccess({ ...access, email: event.target.value })}
            placeholder="nome@dominio.it"
          />
          {errors.email && <span className="sssw-error">{errors.email}</span>}
        </label>

        <button type="submit" className="sssw-button sssw-button--primary">
          Accedi
        </button>
      </form>
    </div>
  );
}
