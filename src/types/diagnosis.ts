/**
 * Diagnostic Test Data Types
 * Types for diagnostic test access tokens and test results
 */

/**
 * Saved word tracking student vocabulary learning
 */
export interface SavedWord {
  word: string;                      // The word text (lowercased, trimmed)
  questionId: string;                // Which question it was found in
  section: 'passage' | 'option' | 'question'; // Where in the UI
  optionId: string | null;           // If from an option, which one (e.g., 'A', 'B', 'C', 'D')
  positionIndex: number;             // Word index in the source text (for uniqueness)
}

/**
 * Access token record linking a token to a student
 */
export interface AccessToken {
  id: string;                    // UUID
  token: string;                 // Unique token (UUID format)
  studentEmail: string;
  studentName: string;
  testId: string;                // e.g., 'diagnostic-test-1'
  expiresAt: string | null;      // ISO timestamp
  usedAt: string | null;         // ISO timestamp of first use
  isActive: boolean;
  createdAt: string;             // ISO timestamp
}

/**
 * Student test result record
 */
export interface TestResult {
  id: string;                          // UUID
  tokenId: string;                     // FK to access_tokens.id
  studentEmail: string;
  studentName: string;
  testId: string;                      // e.g., 'diagnostic-test-1'
  createdAt: string;                   // ISO timestamp (record creation)
  startedAt: string;                   // ISO timestamp (when test started)
  submittedAt: string;                 // ISO timestamp (when submitted)
  totalTimeSeconds: number;            // e.g., 1800 for 30 minutes
  answers: Record<string, string>;     // { questionId: selectedAnswerId }
  confidenceLevels: Record<string, number>;  // { questionId: confidenceLevel (1-5) }
  flaggedQuestions: string[];          // Array of question IDs flagged for review
  questionTimes: Record<string, number>; // { questionId: timeSpentSeconds }
  savedWords?: SavedWord[];            // Words student marked as unknown
}

/**
 * Payload for token validation API request
 */
export interface ValidateTokenRequest {
  token: string;
}

/**
 * Payload for token validation API response
 */
export interface ValidateTokenResponse {
  tokenId: string;
  studentName: string;
  expiresAt: string | null;
}

/**
 * Payload for test submission API request
 */
export interface SubmitTestRequest {
  tokenId?: string;
  studentEmail: string;
  studentName: string;
  testId: string;
  testVersionId?: string;
  startedAt: string;
  submittedAt: string;
  totalTimeSeconds: number;
  answers: Record<string, string>;
  confidenceLevels: Record<string, number>;
  flaggedQuestions: string[];
  questionTimes: Record<string, number>;
  savedWords?: SavedWord[];           // Words student marked as unknown
}

/**
 * Payload for test submission API response
 */
export interface SubmitTestResponse {
  success: boolean;
  resultId: string;
}

/**
 * Payload for admin token generation API request
 */
export interface GenerateTokenRequest {
  studentName: string;
  code?: string;                // Optional 6-digit code (auto-generated if not provided)
  expiresInHours?: number;      // Default 24
}

/**
 * Payload for admin code generation API response
 */
export interface GenerateTokenResponse {
  token: string;                // 6-digit access code
  studentEmail: string;
  studentName: string;
  expiresAt: string;            // ISO timestamp
}
