import { IUser } from '../models/User';
import { ApiError } from '../utils/apiError';

/** Scope comes only from the authenticated database record, never client filters. */
export function authorityScope(user?: Pick<IUser, 'role' | 'isAdmin' | 'department'>): { assignedDepartment?: string } {
  if (!user || user.role !== 'authority') throw new ApiError(403, 'Authority access required.');
  if (user.isAdmin) return {};
  if (!user.department?.trim()) throw new ApiError(403, 'Your officer account needs a department assignment. Contact your administrator.');
  return { assignedDepartment: user.department.trim() };
}
