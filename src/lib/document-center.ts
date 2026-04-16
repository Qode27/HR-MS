import { DocumentType } from "@prisma/client";

export const DOCUMENT_CATEGORY_BY_TYPE: Record<DocumentType, string> = {
  OFFER_LETTER: "contract",
  APPOINTMENT_LETTER: "contract",
  EXPERIENCE_LETTER: "contract",
  RELIEVING_LETTER: "contract",
  PAYSLIP: "payslip",
  ID_PROOF: "identity",
  ADDRESS_PROOF: "identity",
  EDUCATION: "certificate",
  BANK: "miscellaneous",
  OTHER: "miscellaneous"
};

export function documentScope(input: { employeeId?: string | null; candidateId?: string | null }) {
  if (input.employeeId) return "employee";
  if (input.candidateId) return "candidate";
  return "company";
}

export function documentTypeLabel(type: DocumentType) {
  return type.replaceAll("_", " ");
}
