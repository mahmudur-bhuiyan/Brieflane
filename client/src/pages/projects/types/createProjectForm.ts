export type CreateProjectFormState = {
  acProjectId: string;
  name: string;
  clientName: string;
  clientEmail: string;
};

export const emptyCreateProjectForm: CreateProjectFormState = {
  acProjectId: '',
  name: '',
  clientName: '',
  clientEmail: '',
};
