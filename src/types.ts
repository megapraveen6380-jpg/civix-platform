export interface Coordinates {
  lat: number;
  lng: number;
}

export type ComplaintStatus =
  | 'captured'
  | 'scanning'
  | 'broadcast'
  | 'verified'
  | 'email_draft'
  | 'dispatched'
  | 'acknowledged'
  | 'scheduled'
  | 'repairing'
  | 'repaired_audit'
  | 'resolved';

export interface FundingTransparency {
  itemId: string;
  totalBudget: number;
  materialsCost: number;
  laborCost: number;
  equipmentCost: number;
  materialsBreakdown: Array<{ name: string; cost: number }>;
  invoiceNumber: string;
  clearedByAuditor: boolean;
  meta?: {
    lakeName: string;
    areaHectares: number;
    pollutionLevel: string;
    nearIndustrialZone: boolean;
    totalBudgetCrores: number;
  };
}

export interface EmailAnalysis {
  summary: string;
  sentiment: string;
  actionItems: string[];
  deadlines: string[];
  stage: string;
  extractedSender?: string;
  extractedRecipient?: string;
  extractedSubject?: string;
  extractedContacts?: string[];
  extractedLocation?: string;
  extractedCost?: string;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW';
  pythonConsoleLog?: string;
}

export interface Complaint {
  id: string;
  caseId: string;
  title: string;
  description: string;
  type: string;
  department: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  coordinates: Coordinates;
  image: string; // URL or Base64 string
  images?: string[]; // Multiple proof images support
  repairedImage?: string; // Proof of work
  status: ComplaintStatus;
  upvotes: number;
  totalNeighbors: number;
  requiredUpvotes: number;
  emailTemplate?: string;
  emailBody?: string;
  emailReplyReceived?: boolean;
  emailReplyBody?: string;
  emailReplyReceivedAt?: string;
  departmentDecision?: 'approval' | 'rejection' | 'permission_granted' | 'explanation' | 'acknowledgment_only';
  decisionExplanation?: string;
  permissionDays?: number;
  funding?: FundingTransparency;
  reporterEmail: string;
  reportedAt: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  locationAddress?: string;
  circumstance?: string;
  environmentalImpact?: string;
  userPointsEarned?: number;
  isSingleUser?: boolean;
  completedWithoutProof?: boolean;
  emailAnalysis?: EmailAnalysis;
}

export interface CommunityMessage {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  likes: number;
  departmentFeedback?: {
    deptName: string;
    opinion: string;
  };
}

export interface CommunityThread {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  createdAt: string;
  description: string;
  creatorName: string;
  memberCount: number;
  messages: CommunityMessage[];
  isJoined?: boolean;
  category?: string;
}

export interface Department {
  name: string;
  rating: number;
  responseTime: string;
  resolvedCount: number;
  badges: string[];
  totalFundingAllocated: number;
  performancePoints?: number;
}

export interface CitizenBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

export type LogType =
  | 'SYSTEM'
  | 'AI'
  | 'INFO'
  | 'BROADCAST'
  | 'VERIFY'
  | 'DISPATCH'
  | 'ALERT'
  | 'REWARD';

export interface NotificationLog {
  id: string;
  timestamp: string;
  type: LogType;
  text: string;
}
