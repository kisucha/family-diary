// GET /api/health — healthcheck + DB 커넥션 풀 warm-up
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: "ok", db: "error", timestamp: new Date().toISOString() });
  }
}
