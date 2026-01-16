// app/api/workflows/save/route.js
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
    const diagram = body.diagram;
    const meta = body.meta || {};

    if (!workflowId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing workflowId" }), {
        status: 400
      });
    }

    if (!diagram || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing diagram.nodes[] or diagram.edges[]" }),
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "workflows.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    json.content = json.content || {};
    json.content.workflows = json.content.workflows || [];

    const workflows = json.content.workflows;
    const idx = workflows.findIndex((w) => w.id === workflowId);

    const nextWorkflow = {
      id: workflowId,
      category: meta.category || "custom",
      owner: meta.owner || "me",
      title: meta.title || "Untitled workflow",
      summary: meta.summary || "",
      textSteps: Array.isArray(meta.textSteps) ? meta.textSteps : [],
      diagram: {
        grid: 20,
        zoom: typeof diagram.zoom === "number" ? diagram.zoom : 1,
        pan:
          diagram.pan && typeof diagram.pan === "object"
            ? { x: diagram.pan.x ?? 0, y: diagram.pan.y ?? 0 }
            : { x: 0, y: 0 },
        nodes: diagram.nodes,
        edges: diagram.edges
      }
    };

    if (idx === -1) {
      workflows.push(nextWorkflow);
    } else {
      workflows[idx] = {
        ...workflows[idx],
        ...meta,
        diagram: nextWorkflow.diagram
      };
    }

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");

    return new Response(JSON.stringify({ ok: true, workflow: nextWorkflow }), {
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
