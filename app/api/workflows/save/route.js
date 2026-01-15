// app/api/workflows/save/route.js
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { workflowId, nodes, zoom } = body;

    if (!workflowId || !Array.isArray(nodes)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing workflowId or nodes[]" }),
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "workflows.json");

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    const workflows = json?.content?.workflows ?? [];
    const idx = workflows.findIndex((w) => w.id === workflowId);

    if (idx === -1) {
      return new Response(
        JSON.stringify({ ok: false, error: "workflowId not found" }),
        { status: 404 }
      );
    }

    const existingNodes = workflows[idx]?.diagram?.nodes ?? [];
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const merged = existingNodes.map((n) => {
      const next = byId.get(n.id);
      if (!next) return n;
      return {
        ...n,
        x: next.x,
        y: next.y,
        w: next.w ?? n.w,
        h: next.h ?? n.h
      };
    });

    workflows[idx].diagram.nodes = merged;

    if (typeof zoom === "number" && Number.isFinite(zoom)) {
      workflows[idx].diagram.zoom = zoom;
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
