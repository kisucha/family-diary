// GET /api/health — Docker healthcheck 엔드포인트
export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
