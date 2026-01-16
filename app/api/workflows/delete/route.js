// app/api/workflows/delete/route.js
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeId(id) {
  return String(id || "").trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const workflowId = safeId(body.workflowId);

    if (!workflowId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing workflowId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }

    const filePath = path.join(process.cwd(), "data", "workflows.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    json.content = json.content || {};
    json.content.workflows = json.content.workflows || [];

    const before = json.content.workflows.length;
    json.content.workflows = json.content.workflows.filter((w) => w.id !== workflowId);
    const after = json.content.workflows.length;

    if (before === after) {
      return new Response(JSON.stringify({ ok: false, error: "Workflow not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");

    return new Response(JSON.stringify({ ok: true, deletedId: workflowId }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      }
    );
  }
}
