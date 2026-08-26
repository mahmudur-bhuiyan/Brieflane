import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { getApiErrorMessage, useGenerateReportMutation } from '../../../lib/queries/projects';
import type { ProjectRecord } from '../../../types/project';

export function GenerateReportModal({
  project,
  onClose,
  onSuccess,
}: {
  project: ProjectRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const generateReport = useGenerateReportMutation(project.id);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);

    try {
      const result = await generateReport.mutateAsync();
      onSuccess(`Report workflow started (status: ${result.reportRun.status}).`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to trigger report'));
    }
  }

  return (
    <Modal
      title="Generate report"
      description={`Send a client report for "${project.name}" via n8n.`}
      onClose={onClose}
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted">ActiveCollab project</dt>
          <dd className="font-medium text-heading">
            {project.name} (id {project.acProjectId})
          </dd>
        </div>
        <div>
          <dt className="text-muted">Primary recipient</dt>
          <dd className="font-medium text-heading">{project.clientEmail}</dd>
        </div>
        {project.reportRecipients.length > 0 && (
          <div>
            <dt className="text-muted">Additional recipients</dt>
            <dd className="text-heading">{project.reportRecipients.join(', ')}</dd>
          </div>
        )}
      </dl>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={generateReport.isPending}
          className="w-full sm:w-auto"
        >
          {generateReport.isPending ? 'Sending…' : 'Confirm & send'}
        </Button>
      </div>
    </Modal>
  );
}
