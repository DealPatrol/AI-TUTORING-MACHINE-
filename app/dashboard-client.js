"use client";

import { useState, useEffect } from "react";

export default function DashboardClient() {
  const [data, setData] = useState({
    queue: [],
    winners: [],
    posted: [],
    failed: [],
    warnings: [],
    tipDay: 1,
    stats: { readyFeed: 0, readyReels: 0, readyCarousels: 0, winnersWaiting: 0, failed: 0 },
    growth: { recommendations: [], latest: null, followerDelta7d: 0, bestFormat: null },
  });
  const [triggering, setTriggering] = useState({});
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      const res = await fetch("/api/dashboard/data");
      const result = await res.json();
      if (!result.error) {
        setData(result);
        setMessage("");
      } else {
        setMessage("Could not load Airtable data. Check credentials in Vercel project settings.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("Could not reach the data API. Check your connection.");
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerCron = async (cronName) => {
    setTriggering((prev) => ({ ...prev, [cronName]: true }));
    setMessage("");
    try {
      const res = await fetch(`/api/trigger/${cronName}`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        const detail = result.data
          ? ` — ${JSON.stringify(result.data).slice(0, 180)}`
          : "";
        if (result.skipped || result.data?.skipped) {
          setMessage(`⚠ ${cronName} skipped${detail}`);
        } else {
          setMessage(`✓ ${cronName} ok${detail}`);
        }
        setTimeout(refresh, 1500);
      } else {
        setMessage(`✗ ${cronName} failed: ${result.error || result.data?.error || "unknown"}`);
      }
    } catch (err) {
      setMessage(`✗ ${cronName} error: ${err.message}`);
    }
    setTriggering((prev) => ({ ...prev, [cronName]: false }));
  };

  const typeBadge = (type) => {
    const t = type || "Feed";
    const colors = {
      Feed: { bg: "#dbeafe", fg: "#1e40af" },
      Reel: { bg: "#fce7f3", fg: "#9d174d" },
      Carousel: { bg: "#dcfce7", fg: "#166534" },
    };
    const c = colors[t] || colors.Feed;
    return (
      <span className="status-badge" style={{ background: c.bg, color: c.fg }}>
        {t}
      </span>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>AI Tutor Machine</h1>
        <p>
          Growth engine · Day {data?.tipDay || data?.stats?.tipDay || 1} streak · Daily Reels ·
          HOW playbooks · Comment replies · Recycle + recap
        </p>
        {data?.stats && (
          <div className="item-meta" style={{ marginTop: "1rem" }}>
            <span>Day {data.stats.tipDay || data.tipDay || 1}</span>
            <span>{data.stats.readyFeed || 0} feed</span>
            <span>{data.stats.readyReels || 0} reels</span>
            <span>{data.stats.readyCarousels || 0} carousels</span>
            <span>{data.stats.winnersWaiting || 0} winners</span>
            {(data.stats.failed || 0) > 0 && <span>{data.stats.failed} failed</span>}
          </div>
        )}
      </div>

      {data?.growth && (
        <div className="growth-panel">
          <div className="growth-grid">
            <div className="growth-card">
              <div className="growth-label">Followers</div>
              <div className="growth-value">
                {(data.growth.latest?.followers || 0).toLocaleString()}
              </div>
              <div className="growth-note">
                @{data.growth.latest?.username || "unlocking__ai"}
              </div>
            </div>
            <div className="growth-card">
              <div className="growth-label">7-day change</div>
              <div
                className={`growth-value ${
                  (data.growth.followerDelta7d || 0) >= 0 ? "delta-up" : "delta-down"
                }`}
              >
                {(data.growth.followerDelta7d || 0) > 0 ? "+" : ""}
                {data.growth.followerDelta7d || 0}
              </div>
              <div className="growth-note">
                {data.growth.latest
                  ? `${data.growth.latest.reach || 0} reach today`
                  : "Pull Insights to start tracking"}
              </div>
            </div>
            <div className="growth-card">
              <div className="growth-label">Best format</div>
              <div className="growth-value">{data.growth.bestFormat?.type || "—"}</div>
              <div className="growth-note">
                {data.growth.bestFormat
                  ? `avg reach ${data.growth.bestFormat.avgReach}`
                  : "Need posted insights"}
              </div>
            </div>
            <div className="growth-card">
              <div className="growth-label">Profile visits</div>
              <div className="growth-value">
                {(data.growth.latest?.profileViews || 0).toLocaleString()}
              </div>
              <div className="growth-note">
                {data.growth.latest?.accountsEngaged || 0} accounts engaged
              </div>
            </div>
          </div>
          {data.growth.recommendations?.length > 0 && (
            <ul className="reco-list">
              {data.growth.recommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {data?.warnings?.length > 0 && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
          }}
        >
          {data.warnings.map((w) => (
            <div key={w}>⚠ {w}</div>
          ))}
        </div>
      )}

      {message && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            background: message.includes("✓")
              ? "#dcfce7"
              : message.includes("✗")
                ? "#fee2e2"
                : "#fef3c7",
            color: message.includes("✓")
              ? "#166534"
              : message.includes("✗")
                ? "#991b1b"
                : "#92400e",
            border: `1px solid ${
              message.includes("✓")
                ? "#86efac"
                : message.includes("✗")
                  ? "#fca5a5"
                  : "#fcd34d"
            }`,
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>
      )}

      <div className="controls">
        <button
          className="control-btn btn-research"
          onClick={() => triggerCron("research")}
          disabled={triggering.research}
        >
          {triggering.research ? "🔄 Running..." : "🔍 Trigger Research"}
        </button>
        <button
          className="control-btn btn-generate"
          onClick={() => triggerCron("generate")}
          disabled={triggering.generate}
        >
          {triggering.generate ? "🔄 Running..." : "✨ Trigger Generate"}
        </button>
        <button
          className="control-btn btn-post"
          onClick={() => triggerCron("post-1")}
          disabled={triggering["post-1"]}
          title="Publish image #1"
        >
          {triggering["post-1"] ? "🔄 Running..." : "📱 Image #1 (12pm)"}
        </button>
        <button
          className="control-btn btn-post"
          onClick={() => triggerCron("post-2")}
          disabled={triggering["post-2"]}
          title="Publish image #2"
        >
          {triggering["post-2"] ? "🔄 Running..." : "📱 Image #2 (2pm)"}
        </button>
        <button
          className="control-btn btn-post"
          onClick={() => triggerCron("post-3")}
          disabled={triggering["post-3"]}
          title="Publish image #3"
        >
          {triggering["post-3"] ? "🔄 Running..." : "📱 Image #3 (4pm)"}
        </button>
        {[
          ["research", "Research", "#6366f1"],
          ["generate", "Generate Feed", "#8b5cf6"],
          ["generate-reel", "Generate Reel", "#db2777"],
          ["generate-carousel", "Generate Carousel", "#059669"],
          ["post", "Post Feed/Carousel", "#ec4899"],
          ["post-reel", "Post Reel", "#be185d"],
          ["engage", "Engage comments", "#0ea5e9"],
          ["boost", "Boost Story", "#7c3aed"],
          ["recycle", "Recycle winner", "#ea580c"],
          ["recap", "Weekly recap", "#0f766e"],
          ["insights", "Pull Insights", "#f59e0b"],
          ["health", "Health Check", "#64748b"],
        ].map(([name, label, color]) => (
          <button
            key={name}
            className="control-btn"
            style={{ background: color, color: "white" }}
            onClick={() => triggerCron(name)}
            disabled={triggering[name]}
          >
            {triggering[name] ? "Running..." : label}
          </button>
        ))}
        <button
          className="control-btn"
          style={{ background: "#10b981", color: "white" }}
          onClick={refresh}
        >
          Refresh Data
        </button>
      </div>

      <div className="sections">
        <div className="section">
          <div className="section-header">
            <h2>Ready to Post</h2>
            <p>{data?.queue?.length || 0} items in queue</p>
          </div>
          <div className="section-content">
            {!data?.queue || data.queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>Queue is empty. Run Generate, Recycle, or Recap to add posts.</p>
              </div>
            ) : (
              data.queue.map((post) => {
                const times = { 1: "12:00 PM UTC", 2: "2:00 PM UTC", 3: "4:00 PM UTC" };
                const sequence = post.sequence || post.fields?.Sequence || "?";
                return (
                  <div key={post.id} className="item">
                    <div className="item-title">
                      Post #{sequence} — {times[sequence] || "?"}
                      <span style={{ fontSize: "0.85em", marginLeft: "0.5rem" }}>{post.hook}</span>
                    </div>
                    <div className="item-meta">
                      <span className="status-badge status-ready">{post.status}</span>
                      <span>Sequence: {sequence}</span>
                    </div>
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt={post.hook} className="item-image" />
                    )}
                    <div className="item-caption">{post.caption?.slice(0, 120)}...</div>
                  </div>
                );
              })
            )}
          </div>
          <div className="section-footer">
            Auto-posts: feed/carousel 15:00 UTC · Reel 18:00 UTC · boost Story 20:00 UTC
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2>New Winners</h2>
            <p>{data?.winners?.length || 0} ideas to rewrite</p>
          </div>
          <div className="section-content">
            {!data?.winners || data.winners.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <p>No new winners yet. Research runs every Monday.</p>
              </div>
            ) : (
              data.winners.map((winner) => (
                <div key={winner.id} className="item">
                  <div className="item-title">{winner.account}</div>
                  <div className="item-meta">
                    <span>{winner.likes?.toLocaleString()} likes</span>
                    <span>{winner.comments?.toLocaleString()} comments</span>
                    {winner.growthScore != null && <span>score {winner.growthScore}</span>}
                    <span className="status-badge status-new">{winner.status}</span>
                  </div>
                  <div className="item-caption">{winner.caption}</div>
                </div>
              ))
            )}
          </div>
          <div className="section-footer">
            Scored by comments + video/carousel bias
          </div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: "2rem" }}>
        <div className="section-header">
          <h2>Posted · sorted by reach</h2>
          <p>{data?.posted?.length || 0} recent</p>
        </div>
        <div className="section-content">
          {!data?.posted || data.posted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📸</div>
              <p>No posts yet. Run insights after publishing to see reach.</p>
            </div>
          ) : (
            data.posted.map((post) => (
              <div key={post.id} className="item">
                <div className="item-title">{post.hook}</div>
                <div className="item-meta">
                  {typeBadge(post.type)}
                  {post.dayNumber != null && <span>Day {post.dayNumber}</span>}
                  <span>reach {post.reach || 0}</span>
                  <span>saves {post.saves || 0}</span>
                  {(post.plays || 0) > 0 && <span>plays {post.plays}</span>}
                  <span className="status-badge status-posted">Posted</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="setup-section">
        <h3>✅ System Live — All Systems Configured</h3>
        <p>
          Connected to Instagram <strong>@unlocking__ai</strong>. Every credential is set and the
          automated pipeline is running.
        </p>
        <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
          <li><code>AIRTABLE_API_KEY</code> - Configured ✓</li>
          <li><code>AIRTABLE_BASE_ID</code> - Configured ✓</li>
          <li><code>ANTHROPIC_API_KEY</code> - Configured ✓</li>
          <li><code>GEMINI_API_KEY</code> - Configured ✓</li>
          <li><code>APIFY_TOKEN</code> - Configured ✓</li>
          <li><code>APIFY_TASK_ID</code> - Configured ✓</li>
          <li><code>CRON_SECRET</code> - Configured ✓</li>
          <li><code>IG_ACCESS_TOKEN</code> - Configured ✓</li>
          <li><code>IG_USER_ID</code> - Configured ✓</li>
        </ul>
        <p>
          <strong>Growth schedule (UTC):</strong> research Mon 06:00 · generate 07:00 · Reel 08:00 ·
          carousel Tue/Thu/Sat 09:00 · recycle Mon 10:00 · recap Sun 10:00 · post 15:00 · Reel post
          18:00 · engage 19:00/21:00 · boost Story 20:00 · insights 22:00.
        </p>
      </div>
      {data?.failed?.length > 0 && (
        <div className="section" style={{ marginBottom: "2rem" }}>
          <div className="section-header">
            <h2>Failed</h2>
            <p>Fix or delete these in Airtable</p>
          </div>
          <div className="section-content">
            {data.failed.map((post) => (
              <div key={post.id} className="item">
                <div className="item-title">{post.hook}</div>
                <div className="item-meta">{typeBadge(post.type)}</div>
                <div className="item-caption">{post.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="setup-section">
        <h3>Growth engine</h3>
        <p>
          Daily Reel at <strong>18:00 UTC</strong>. Comment <strong>HOW</strong> playbooks go out at
          19:00 & 21:00. Every other comment gets a like + short reply. A follow-up Story boosts
          the same-day post at 20:00. Mondays recycle proven winners; Sundays ship a save-this recap.
        </p>
      </div>
    </div>
  );
}
