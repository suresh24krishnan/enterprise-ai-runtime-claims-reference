export type ClaimStatus = 'Open' | 'In Progress' | 'Pending' | 'Closed' | 'Completed' | 'Running' | 'Awaiting Approval' | 'Returned' | 'Rejected';

export interface Claim {
  id: string;
  claimantName: string;
  lossType: string;
  status: ClaimStatus;
  assignedAdjuster: string;
  dateOfLoss: string;
  policyNumber: string;
  reserve: number;
  initialReserve: number;
  slaDaysRemaining: number;
}

export type MessageSender = 'user' | 'ai';
export type MessageType = 'text' | 'status' | 'result' | 'action';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  type: MessageType;
  content: string;
  results?: CoverageResult[];
  actions?: ChatAction[];
  followUp?: string;
}

export interface CoverageResult {
  label: string;
  value: string;
  confirmed: boolean;
}

export interface ChatAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary';
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}
