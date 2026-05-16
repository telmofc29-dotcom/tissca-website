/**
 * Feedback Management Utilities
 * Handles submission, storage, and retrieval of feedback/reviews/bug reports
 */

export type FeedbackType = 'help' | 'issue' | 'suggestion' | 'review' | 'cancellation';
export type FeedbackStatus = 'new' | 'in-progress' | 'done';
export type FeedbackSection = 'homepage' | 'pricing' | 'download' | 'signin' | 'member-app' | 'quotes-invoices' | 'leads-jobs' | 'billing' | 'settings' | 'support' | 'calculators' | 'guides' | 'docs' | 'admin' | 'other' | 'subscription';
export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export type CancellationContext = 'subscription_cancel' | 'account_delete';

export interface FeedbackSubmission {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  section: FeedbackSection;
  headline: string;
  description: string;
  userEmail?: string;
  url: string;
  timestamp: string;
  deviceType: DeviceType;
  userAgent?: string;
  rating?: number; // For reviews 1-5
  cancellationReasons?: string[]; // For cancellation type
  cancellationContext?: CancellationContext; // subscription_cancel or account_delete
  isBlocked?: boolean; // For help/issue types
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackFilter {
  type?: FeedbackType;
  status?: FeedbackStatus;
  section?: FeedbackSection;
  search?: string;
}

/**
 * Generate unique ID for feedback submission
 */
export function generateFeedbackId(): string {
  return `FB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent?: string): DeviceType {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Get section from URL path
 */
export function getSectionFromUrl(url: string): FeedbackSection {
  if (url.includes('/pricing')) return 'pricing';
  if (url.includes('/download')) return 'download';
  if (url.includes('/sign-in') || url.includes('/login') || url.includes('/register') || url.includes('/sign-up')) return 'signin';
  if (url.includes('/quotes') || url.includes('/invoices')) return 'quotes-invoices';
  if (url.includes('/leads') || url.includes('/jobs')) return 'leads-jobs';
  if (url.includes('/subscription') || url.includes('/billing')) return 'billing';
  if (url.includes('/settings')) return 'settings';
  if (url.includes('/support') || url.includes('/faq') || url.includes('/contact')) return 'support';
  if (url.includes('/calculators')) return 'calculators';
  if (url.includes('/guides')) return 'guides';
  if (url.includes('/docs')) return 'docs';
  if (url.includes('/admin')) return 'admin';
  if (url.includes('/app')) return 'member-app';
  if (url === '/' || url.includes('/homepage')) return 'homepage';
  return 'other';
}

/**
 * Create a new feedback submission
 */
export function createFeedbackSubmission(
  type: FeedbackType,
  headline: string,
  description: string,
  url: string,
  options?: {
    userEmail?: string;
    deviceType?: DeviceType;
    userAgent?: string;
    rating?: number;
    section?: FeedbackSection;
    cancellationReasons?: string[];
    cancellationContext?: CancellationContext;
    isBlocked?: boolean;
  }
): FeedbackSubmission {
  const now = new Date().toISOString();
  
  return {
    id: generateFeedbackId(),
    type,
    status: 'new',
    section: options?.section || getSectionFromUrl(url),
    headline,
    description,
    userEmail: options?.userEmail,
    url,
    timestamp: now,
    deviceType: options?.deviceType || detectDeviceType(options?.userAgent),
    userAgent: options?.userAgent,
    rating: options?.rating,
    cancellationReasons: options?.cancellationReasons,
    cancellationContext: options?.cancellationContext,
    isBlocked: options?.isBlocked,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Store feedback submissions (in-memory for now, can be migrated to DB)
 * Uses sessionStorage + server-side fallback
 */
let feedbackStore: FeedbackSubmission[] = [];

/**
 * Add feedback submission to store
 */
export function addFeedbackSubmission(submission: FeedbackSubmission): FeedbackSubmission {
  feedbackStore.push(submission);
  return submission;
}

/**
 * Get all feedback submissions
 */
export function getAllFeedback(): FeedbackSubmission[] {
  return [...feedbackStore];
}

/**
 * Get feedback by ID
 */
export function getFeedbackById(id: string): FeedbackSubmission | undefined {
  return feedbackStore.find(f => f.id === id);
}

/**
 * Update feedback submission
 */
export function updateFeedback(
  id: string,
  updates: Partial<FeedbackSubmission>
): FeedbackSubmission | undefined {
  const index = feedbackStore.findIndex(f => f.id === id);
  if (index === -1) return undefined;
  
  const updated = {
    ...feedbackStore[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  feedbackStore[index] = updated;
  return updated;
}

/**
 * Filter feedback submissions
 */
export function filterFeedback(filters: FeedbackFilter): FeedbackSubmission[] {
  return feedbackStore.filter(feedback => {
    if (filters.type && feedback.type !== filters.type) return false;
    if (filters.status && feedback.status !== filters.status) return false;
    if (filters.section && feedback.section !== filters.section) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesHeadline = feedback.headline.toLowerCase().includes(searchLower);
      const matchesDescription = feedback.description.toLowerCase().includes(searchLower);
      const matchesEmail = feedback.userEmail?.toLowerCase().includes(searchLower);
      if (!matchesHeadline && !matchesDescription && !matchesEmail) return false;
    }
    return true;
  });
}

/**
 * Delete feedback submission
 */
export function deleteFeedback(id: string): boolean {
  const index = feedbackStore.findIndex(f => f.id === id);
  if (index === -1) return false;
  feedbackStore.splice(index, 1);
  return true;
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats() {
  return {
    total: feedbackStore.length,
    byType: {
      help: feedbackStore.filter(f => f.type === 'help').length,
      issue: feedbackStore.filter(f => f.type === 'issue').length,
      suggestion: feedbackStore.filter(f => f.type === 'suggestion').length,
      review: feedbackStore.filter(f => f.type === 'review').length,
      cancellation: feedbackStore.filter(f => f.type === 'cancellation').length,
    },
    byStatus: {
      new: feedbackStore.filter(f => f.status === 'new').length,
      'in-progress': feedbackStore.filter(f => f.status === 'in-progress').length,
      done: feedbackStore.filter(f => f.status === 'done').length,
    },
    bySection: {
      calculators: feedbackStore.filter(f => f.section === 'calculators').length,
      guides: feedbackStore.filter(f => f.section === 'guides').length,
      docs: feedbackStore.filter(f => f.section === 'docs').length,
      admin: feedbackStore.filter(f => f.section === 'admin').length,
      subscription: feedbackStore.filter(f => f.section === 'subscription').length,
      other: feedbackStore.filter(f => f.section === 'other').length,
    },
    avgRating: feedbackStore
      .filter(f => f.rating)
      .reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackStore.filter(f => f.rating).length || 0,
    cancellationReasonCounts: getCancellationReasonCounts(),
  };
}

/**
 * Get cancellation reason aggregation
 */
export function getCancellationReasonCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  feedbackStore
    .filter(f => f.type === 'cancellation' && f.cancellationReasons)
    .forEach(f => {
      f.cancellationReasons!.forEach(reason => {
        counts[reason] = (counts[reason] || 0) + 1;
      });
    });
  return counts;
}

/**
 * Export feedback to CSV format
 */
export function exportFeedbackToCSV(feedback: FeedbackSubmission[]): string {
  const headers = [
    'ID',
    'Type',
    'Status',
    'Section',
    'Blocked',
    'Cancellation Context',
    'Headline',
    'Description',
    'Email',
    'Rating',
    'Cancellation Reasons',
    'Device',
    'URL',
    'Timestamp',
    'Internal Notes',
  ];
  
  const rows = feedback.map(f => [
    f.id,
    f.type,
    f.status,
    f.section,
    f.isBlocked === true ? 'Yes' : f.isBlocked === false ? 'No' : '',
    f.cancellationContext || '',
    `"${f.headline.replace(/"/g, '""')}"`,
    `"${f.description.replace(/"/g, '""')}"`,
    f.userEmail || '',
    f.rating || '',
    `"${(f.cancellationReasons || []).join('; ')}"`,
    f.deviceType,
    f.url,
    f.timestamp,
    `"${(f.internalNotes || '').replace(/"/g, '""')}"`,
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Sample bot questions by type
 */
export const BOT_QUESTIONS: Record<FeedbackType, string[]> = {
  help: [
    'What are you trying to do?',
    'Which part of TISSCA are you using?',
    'Can you describe what happened?',
  ],
  issue: [
    'What went wrong?',
    'Which part of TISSCA?',
    'Can you describe the issue in detail?',
    'What did you expect to happen?',
  ],
  suggestion: [
    'What would you like to see improved?',
    'Which area would you like us to focus on?',
    'How would this improvement help you?',
  ],
  review: [
    'What\'s your overall experience?',
    'What\'s working well?',
    'What could we improve?',
  ],
  cancellation: [
    'Why are you cancelling?',
  ],
};
