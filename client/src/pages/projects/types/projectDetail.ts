export type ProjectFormState = {
  name: string;
  clientName: string;
  clientEmail: string;
  reportRecipients: string;
  customMetadata: string;
  status: 'ACTIVE' | 'ARCHIVED';
};
