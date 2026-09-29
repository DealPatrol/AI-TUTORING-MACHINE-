import { list, put } from "@vercel/blob";

export const PIPELINE_OPERATIONS = [
  "generate",
  "generate-reel",
  "generate-carousel",
  "post",
  "post-reel",
];

const PIPELINE_FAILURE_OUTCOMES = new Set(["failed"]);

function statusPath(operation) {
  if (!PIPELINE_OPERATIONS.includes(operation)) {
    throw new Error(`Unknown pipeline operation: ${operation}`);
  }
  return `pipeline-status/${operation}.json`;
}

function sanitizeDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const sanitized = {};
  for (const [key, value] of Object.entries(details)) {
    if (value == null) continue;
    if (typeof value === "boolean" || typeof value === "number") {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 180);
    }
  }
  return Object.keys(sanitized).length ? sanitized : null;
}

export function isPipelineFailure(status) {
  return Boolean(status && PIPELINE_FAILURE_OUTCOMES.has(status.outcome) && status.error);
}

export function pipelineFailureWarning(status) {
  if (!isPipelineFailure(status)) return null;
  return `Last ${status.operation} ${status.outcome} at ${status.recordedAt}: ${status.error}`;
}

// Observability must never become another reason generation or publishing
// fails, so status persistence is deliberately best-effort.
export async function recordPipelineStatus(operation, { outcome, error = null, details = null }) {
  try {
    const status = {
      operation,
      outcome,
      error: error ? String(error).slice(0, 1000) : null,
      details: sanitizeDetails(details),
      recordedAt: new Date().toISOString(),
    };
    await put(statusPath(operation), JSON.stringify(status), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return status;
  } catch (statusError) {
    console.warn(`Could not persist ${operation} pipeline status:`, statusError.message);
    return null;
  }
}

export async function loadPipelineStatuses() {
  try {
    const { blobs } = await list({ prefix: "pipeline-status/", limit: 20 });
    const statuses = {};
    await Promise.all(
      (blobs || []).map(async (blob) => {
        try {
          const response = await fetch(blob.url);
          if (!response.ok) return;
          const status = await response.json();
          if (
            PIPELINE_OPERATIONS.includes(status.operation) &&
            (!statuses[status.operation] ||
              String(status.recordedAt) > String(statuses[status.operation].recordedAt))
          ) {
            statuses[status.operation] = status;
          }
        } catch (error) {
          console.warn(`Could not read pipeline status ${blob.pathname}:`, error.message);
        }
      })
    );
    return statuses;
  } catch (error) {
    console.warn("Pipeline status unavailable:", error.message);
    return {};
  }
}
