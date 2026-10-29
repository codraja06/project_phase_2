import { User } from '../models/User';
import { DepartmentRule } from '../models/DepartmentRule';
import { AdministrationAudit } from '../models/AdministrationAudit';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Only a bootstrap template. Operational routing always reads editable MongoDB rules.
const template = z.object({ municipality: z.string().min(2).max(160), verificationStatus: z.literal('proposed'),
  sourceNote: z.string().max(500), mappings: z.record(z.string().min(2).max(80), z.string().min(2).max(100)) })
  .parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/municipalities/avadi.provisional.json'), 'utf8')));
export const provisionalMunicipality = template.municipality;
export const proposedAvadiMappings: Record<string, string> = template.mappings;

export async function configureProvisionalMunicipality(options: { apply: boolean; administratorId?: string }) {
  const officers = await User.find({ role: 'authority' }).select('_id isAdmin').lean();
  const officer = options.administratorId ? officers.find(user => String(user._id) === options.administratorId)
    : officers.length === 1 ? officers[0] : undefined;
  if (!officer) throw new Error('Select an existing authority account by ID. No account or email is invented.');
  const plannedCategories = Object.keys(proposedAvadiMappings);
  if (!options.apply) return { mode: 'preview', authorityAccounts: officers.length, selectedAdministratorId: String(officer._id),
    administratorAlreadyAuthorized: !!officer.isAdmin, municipality: provisionalMunicipality, verificationStatus: 'proposed', plannedCategories };
  // This function is invoked only by the local operator CLI, never by a public API.
  if (!officer.isAdmin) {
    await User.updateOne({ _id: officer._id, role: 'authority', isAdmin: { $ne: true } }, { $set: { isAdmin: true } });
    await AdministrationAudit.create({ action: 'administrator-authorized', subject: officer._id,
      reason: 'User authorized the existing authority account to configure provisional municipal mappings.', source: 'local-operator-setup' });
  }
  let created = 0;
  for (const [category, department] of Object.entries(proposedAvadiMappings)) {
    const result = await DepartmentRule.updateOne({ category }, { $setOnInsert: { category, department, enabled: true,
      updatedBy: officer._id, municipality: provisionalMunicipality, verificationStatus: 'proposed',
      sourceNote: template.sourceNote } }, { upsert: true });
    created += result.upsertedCount;
  }
  return { mode: 'applied', municipality: provisionalMunicipality, verificationStatus: 'proposed',
    selectedAdministratorId: String(officer._id), createdMappings: created, existingMappingsPreserved: plannedCategories.length - created };
}
