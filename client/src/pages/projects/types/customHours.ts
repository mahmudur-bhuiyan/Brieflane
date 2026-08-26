export type CustomHoursType = 'pm' | 'custom';

export type CustomHoursEntry = {
  id: string;
  type: CustomHoursType;
  userName: string;
  jobType: string;
  description: string;
  hours: number;
};

export type CustomHoursFormState = {
  type: CustomHoursType;
  userName: string;
  jobType: string;
  description: string;
  hours: string;
};
