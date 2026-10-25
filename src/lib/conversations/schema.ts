import { z } from "zod";
import { SearchRequestSchema } from "@/lib/search/request";

/** Critères tels que stockés dans conversations.criteria (forme de Criteria, src/lib/ask/schema.ts). */
export const StoredCriteriaSchema = SearchRequestSchema.shape.criteria;

const tags = z.array(z.string().trim().min(1).max(60)).max(20);

export const CreateConversationSchema = z.object({
  question: z.string().trim().min(2).max(500),
  criteria: StoredCriteriaSchema,
  tags,
});

export const UpdateConversationSchema = z.object({
  criteria: StoredCriteriaSchema,
  tags,
});

/** Préparation d'une demande au réseau : message modifiable et destinataires choisis. */
export const CreateRequestSchema = z.object({
  conversationId: z.guid(),
  message: z.string().trim().min(10).max(1000),
  recipientIds: z.array(z.guid()).min(1).max(8),
});

/** Destinataire prêt à être contacté : un lien privé et un lien wa.me chacun. */
export type PreparedRecipient = { id: string; memberId: string; name: string; link: string; waUrl: string };

export type CreateRequestResponse = { requestId: string; recipients: PreparedRecipient[] };

/** Réponse d'un proche, vue par le demandeur. */
export type ReplySummary = {
  id: string;
  memberName: string;
  placeName: string;
  visited: boolean;
  reusable: boolean;
  createdAt: string;
};
