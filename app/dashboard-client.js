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
  });
  const [triggering, setTriggering] = useState({});
  const [message, setMessage] = useState(
    "Airtable not configured yet. Add API credentials to Vercel to view live data."
  );

  const refresh = async () => {
    try {
      const res = await fetch("/api/dashboard/data");
      const result = await res.json();
      if (!result.error) {
        setData(result);
        setMessage("");
      }
    } catch (err) {
      console.error("Fetch error:", err);
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
          TIP replies · Insights
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
        {[
          ["research", "Research", "#6366f1"],
          ["generate", "Generate Feed", "#8b5cf6"],
          ["generate-reel", "Generate Reel", "#db2777"],
          ["generate-carousel", "Generate Carousel", "#059669"],
          ["post", "Post Feed/Carousel", "#ec4899"],
          ["post-reel", "Post Reel", "#be185d"],
          ["engage", "Reply TIP comments", "#0ea5e9"],
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
                <p>Queue is empty. Generate a feed post, reel, or carousel.</p>
              </div>
            ) : (
              data.queue.map((post) => (
                <div key={post.id} className="item">
                  <div className="item-title">{post.hook}</div>
                  <div className="item-meta">
                    {typeBadge(post.type)}
                    {post.dayNumber != null && <span>Day {post.dayNumber}</span>}
                    {post.fallbackUsed && (
                      <span className="status-badge" style={{ background: "#ffedd5", color: "#9a3412" }}>
                        Veo fallback
                      </span>
                    )}
                    <span className="status-badge status-ready">{post.status}</span>
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.hook} className="item-image" />
                  )}
                  {post.videoUrl && (
                    <div className="item-caption">Video ready</div>
                  )}
                  <div className="item-caption">{post.caption?.slice(0, 120)}...</div>
                </div>
              ))
            )}
          </div>
          <div className="section-footer">
            Feed/carousel 15:00 UTC · Reels 18:00 UTC · TIP replies 19:00 & 21:00
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
        <h3>Growth engine v2</h3>
        <p>
          Daily Reel at <strong>18:00 UTC</strong>. If Veo fails, a carousel ships the same day.
          Comment <strong>TIP</strong> replies go out at 19:00 & 21:00 UTC.
        </p>
        <p>
          Queue fields: Type, Video URL, Cover URL, First Comment, Slide URLs, Story Text,
          Story Image URL, Day Number, Bonus Prompt, IG Media ID, Reach, Saves, Shares, Plays,
          Replied Comment IDs, Fallback Used, Last Error. Status options: Ready, Posted, Failed.
        </p>
      </div>
    </div>
  );
}
