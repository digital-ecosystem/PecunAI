export interface Session {
  id: string
  userId: string
  status: SessionStatus
  token: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  user: User,
  personalInfo: PersonalInfo
}

export interface PersonalInfo {
  firstName: string
  lastName: string
  // age: number
  qaSessionId: string
}
export interface User {
  id: string
  email: string
  name: string
  isActive: boolean
  created_at: string
  updatedAt: string
  sessionStatus: SessionStatus // Optional, if not always present
}

export enum SessionStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface Question {
  maxValue: undefined
  minValue: undefined
  id: string
  text: string
  questionType?: string // "choice" or "text"
  created_at: string
  options: Option[]
  questionOrder: number
  footnote?: string
  inputPlaceholder?: string
  showIf?: {
    questionOrder: number;
    condition: "equals" | "notEquals";
    value: string;
  };
}

export interface Option {
  id: string
  questionId: string
  label: string
  value: string
  created_at: string
}

export interface UserUpdate {
  first_name: string
  last_name: string
  // age: number
  dob?: string
}

export interface DashboardQuestions {
  id: number
  text: string
  options: Option[]
  selectedValue: string
}

export interface Option {
  label: string
  value: string
}

export enum Role {
  customer = 'customer',
  assistant = 'assistant'
}

export interface Product {
  id: string
  name: string
  shortName: string
  description: string
  keyFeatures: string[]
  created_at: string
  updatedAt: string
}

export interface TermsAndConditions {
  id: string;
  title: string;
  content: string;
  version: string;
  termsType: string;
  isActive: boolean;
  createdBy?: string;       // optional because it can be empty
  createdAt: string;        // ISO date string or formatted date string
  updatedAt: string;        // ISO date string or formatted date string
}


export interface PersonalInfoFormData {
  firstName: string;
  lastName: string;
  birthPlace: string;
  birthCountry?: string;
  nationality: string;
  birthDate: string;
  maritalStatus: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;
  phone: string;
  email: string;
  education: string;
  currentJob: string;
  industry: string;
  occupation: string;
  documentType: string;
  documentNumber: string;
  issuingAuthority: string;
  issuedOn: string;
  validUntil: string;
  iban: string;
  bic: string;
  bankName: string;
  isPEP: boolean | null;
  isTaxResidentAT: boolean | null;
  isTaxResidentOther: boolean | null;
  gender: string;
  isSelfEmployed: boolean | null;
  taxResidencyCountry: string;
  residenceAbroad: boolean;
  magicFlow: boolean;
  actingFor: string;
}

export interface Message {
  id?: string
  role: Role.customer | 'assistant'
  content: string
  timestamp: Date
  index?: number
  audioFileId?: string
  audioFile?: {
    id: string
    fileName: string
    filePath: string
    mimeType: string
    transcript?: string
    createdAt: Date
  }
}

export interface Answer {
  id: string;
  value?: string;
  answeredAt?: Date;
  createdAt?: Date;
  qaSessionId?: string;
  questionId?: string;
  questionOptions?: Record<string, string> | null;
  questionText?: string | null;
  questionType?: string | null;

  // Relations
  // qaSession?: ;
  // question?: Question;
}


export enum RiskType {
  KONSERVATIV = "KONSERVATIV",
  AUSGEWOHGEN = "AUSGEWOHGEN",
  GEWINNORIENTIERT = "GEWINNORIENTIERT"
}