/**
 * Survey permission helpers (Staff Portal)
 *
 * Only Branch Manager (BM), Assistant Branch Manager (ABM),
 * Assistant Branch Manager (ABM/OTL), System Team Leader (STL) and
 * Operation Team Leader (OTL) are allowed to START/UPDATE surveys.
 * All other roles can only VIEW surveys.
 */

import { getStoredUserDetails } from './auth'

/**
 * Roles allowed to start and submit survey entries.
 */
export const SURVEY_STARTER_ROLES: string[] = [
  'BRANCH MANAGER (BM)',
  'ASSISTANT BRANCH MANAGER (ABM)',
  'ASSISTANT BRANCH MANAGER (ABM/OTL)',
  'SYSTEM TEAM LEADER (STL)',
  'OPERATION TEAM LEADER (OTL)',
]

/**
 * Normalize a role name for comparison (case-insensitive, collapse whitespace
 * so variants like "ASSISTANT BRANCH MANAGER  (ABM/OTL)" still match).
 */
function normalizeRoleName(roleName?: string | null): string {
  return (roleName || '').replace(/\s+/g, ' ').trim().toUpperCase()
}

/**
 * Checks whether the given role is allowed to start surveys.
 */
export function isAllowedSurveyRole(roleName?: string | null): boolean {
  const normalized = normalizeRoleName(roleName)
  return SURVEY_STARTER_ROLES.some(role => normalizeRoleName(role) === normalized)
}

/**
 * Checks whether the currently logged-in user can start/update surveys.
 * The role is read from the persisted user details in localStorage
 * (same source used by Profile / AuthContext).
 */
export function canStartSurvey(userRoleName?: string | null): boolean {
  const roleName = userRoleName ?? getStoredUserDetails()?.role?.roleName
  return isAllowedSurveyRole(roleName)
}