"use client";

import { useState, useEffect } from "react";

export default function DashboardClient() {
  const [data, setData] = useState({
    queue: [],
    winners: [],
    posted: [],
    stats: { readyFeed: 0, readyReels: 0, readyCarousels: 0, winnersWaiting: 0 },
  });
  const [triggering, setTriggering] = useState({});
  const [message, setMessage] = useState(
    "Airtable not configured yet. Add API credentials to Vercel to view live data."
  );

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerCron = async (cronName) => {
    setTriggering((prev) => ({ ...prev, [cronName]: true }));
    setMessage("");
    try {
      const res = await fetch(`/api/trigger/${cronName}`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setMessage(`✓ ${cronName} triggered successfully`);
        setTimeout(() => {
          fetch("/api/dashboard/data")
            .then((r) => r.json())
            .then((d) => {
              if (!d.error) setData(d);
            });
        }, 1000);
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
      <span
        className="status-badge"
        style={{ background: c.bg, color: c.fg }}
      >
        {t}
      </span>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>AI Tutor Machine</h1>
        <p>
          Growth engine · Feed + daily Reels + save-magnet carousels · Research → Write → Design → Post
        </p>
        {data?.stats && (
          <div className="item-meta" style={{ marginTop: "1rem" }}>
            <span>{data.stats.readyFeed || 0} feed ready</span>
            <span>{data.stats.readyReels || 0} reels ready</span>
            <span>{data.stats.readyCarousels || 0} carousels ready</span>
            <span>{data.stats.winnersWaiting || 0} winners waiting</span>
          </div>
        )}
      </div>

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
          {triggering.research ? "Running..." : "Trigger Research"}
        </button>
        <button
          className="control-btn btn-generate"
          onClick={() => triggerCron("generate")}
          disabled={triggering.generate}
        >
          {triggering.generate ? "Running..." : "Generate Feed"}
        </button>
        <button
          className="control-btn"
          style={{ background: "#db2777", color: "white" }}
          onClick={() => triggerCron("generate-reel")}
          disabled={triggering["generate-reel"]}
        >
          {triggering["generate-reel"] ? "Running..." : "Generate Reel"}
        </button>
        <button
          className="control-btn"
          style={{ background: "#059669", color: "white" }}
          onClick={() => triggerCron("generate-carousel")}
          disabled={triggering["generate-carousel"]}
        >
          {triggering["generate-carousel"] ? "Running..." : "Generate Carousel"}
        </button>
        <button
          className="control-btn btn-post"
          onClick={() => triggerCron("post")}
          disabled={triggering.post}
        >
          {triggering.post ? "Running..." : "Post Feed/Carousel"}
        </button>
        <button
          className="control-btn"
          style={{ background: "#be185d", color: "white" }}
          onClick={() => triggerCron("post-reel")}
          disabled={triggering["post-reel"]}
        >
          {triggering["post-reel"] ? "Running..." : "Post Reel"}
        </button>
        <button
          className="control-btn"
          style={{ background: "#10b981", color: "white" }}
          onClick={() =>
            fetch("/api/dashboard/data")
              .then((r) => r.json())
              .then((d) => {
                if (!d.error) setData(d);
              })
          }
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
                    <span className="status-badge status-ready">{post.status}</span>
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.hook} className="item-image" />
                  )}
                  {post.videoUrl && (
                    <div className="item-caption">Video ready · {post.videoUrl.slice(0, 48)}…</div>
                  )}
                  <div className="item-caption">{post.caption?.slice(0, 120)}...</div>
                </div>
              ))
            )}
          </div>
          <div className="section-footer">
            Feed/carousel ~3pm UTC · Reels daily ~6pm UTC
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
            Scored by comments + video/carousel bias (not just likes)
          </div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: "2rem" }}>
        <div className="section-header">
          <h2>Recently Posted</h2>
          <p>Last {data?.posted?.length || 0} posts</p>
        </div>
        <div className="section-content">
          {!data?.posted || data.posted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📸</div>
              <p>No posts yet. Complete a full cycle to see history.</p>
            </div>
          ) : (
            data.posted.map((post) => (
              <div key={post.id} className="item">
                <div className="item-title">{post.hook}</div>
                <div className="item-meta">
                  {typeBadge(post.type)}
                  <span>
                    {post.postedAt ? new Date(post.postedAt).toLocaleDateString() : "—"}
                  </span>
                  <span className="status-badge status-posted">Posted</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="setup-section">
        <h3>Growth setup checklist</h3>
        <p>
          Add these Queue fields in Airtable (see <code>AIRTABLE_SETUP.md</code>):{" "}
          <code>Type</code>, <code>Video URL</code>, <code>Cover URL</code>,{" "}
          <code>First Comment</code>, <code>Slide URLs</code>.
        </p>
        <p>
          Daily schedule: research Mon 6:00 UTC · feed generate 7:00 · reel generate 8:00 ·
          carousel Tue/Thu/Sat 9:00 · feed/carousel post 15:00 · <strong>reel post 18:00 UTC</strong>.
          Each publish also pushes a Story for profile visits.
        </p>
        <p>
          Reels use Gemini Veo (<code>VEO_MODEL</code> optional, default{" "}
          <code>veo-3.1-fast-generate-preview</code>). Needs a paid Gemini key with Veo access.
          Add Queue fields: Type, Video URL, Cover URL, First Comment, Slide URLs, Story Text, Story Image URL.
        </p>
      </div>
    </div>
  );
}
