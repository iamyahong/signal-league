import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateAuditLogParams {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      before: params.before as Prisma.InputJsonValue,
      after: params.after as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
