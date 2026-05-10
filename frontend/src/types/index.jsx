export interface Candidate {
  full_name: string;
  contact_number: string;
  alternate_contact?: string;
  email_id: string;
  address: string;
  work_experience: 'yes' | 'no';
  company_name?: string;
  total_experience?: string;
  current_salary?: string;
}

export interface TestAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect?: boolean;
}

export interface TestResult {
  score: number;
  totalQuestions: number;
  answers: TestAnswer[];
}

export interface AdminStats {
  total_pin_verified: number;
  total_forms_completed: number;
  total_tests_started: number;
  average_score: number | string;
}

export interface CandidateWithStatus {
  session_id: string;
  full_name?: string;
  contact_number?: string;
  email_id?: string;
  current_status: string;
  pin_verified_time?: string;
  form_completed: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  redirect?: string;
}