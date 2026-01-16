// app/api/workflows/route.js
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "workflows.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    return new Response(JSON.stringify({ ok: true, data: json }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
