"use client";

import { useState, useEffect } from "react";

export default function DashboardClient() {
  const [data, setData] = useState({ queue: [], winners: [], posted: [] });
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState({});
  const [message, setMessage] = useState("Airtable not configured yet. Add API credentials to Vercel to view live data.");

  // Fetch dashboard data
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

  // Trigger a cron manually
  const triggerCron = async (cronName) => {
    setTriggering((prev) => ({ ...prev, [cronName]: true }));
    setMessage("");
    try {
      const res = await fetch(`/api/trigger/${cronName}`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setMessage(`✓ ${cronName} triggered successfully`);
        setTimeout(() => {
          // Refresh data after trigger
          fetch("/api/dashboard/data").then((r) => r.json()).then((d) => {
            if (!d.error) setData(d);
          });
        }, 1000);
      } else {
        setMessage(`✗ ${cronName} failed: ${result.error}`);
      }
    } catch (err) {
      setMessage(`✗ ${cronName} error: ${err.message}`);
    }
    setTriggering((prev) => ({ ...prev, [cronName]: false }));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🤖 AI Tutor Machine</h1>
        <p>Automated Instagram content system • Research → Copywrite → Design → Post</p>
      </div>

      {message && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            background: message.includes("✓") ? "#dcfce7" : message.includes("✗") ? "#fee2e2" : "#fef3c7",
            color: message.includes("✓") ? "#166534" : message.includes("✗") ? "#991b1b" : "#92400e",
            border: `1px solid ${message.includes("✓") ? "#86efac" : message.includes("✗") ? "#fca5a5" : "#fcd34d"}`,
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
          onClick={() => triggerCron("post")}
          disabled={triggering.post}
        >
          {triggering.post ? "🔄 Running..." : "📱 Trigger Post"}
        </button>
        <button
          className="control-btn"
          style={{ background: "#10b981", color: "white" }}
          onClick={() => fetch("/api/dashboard/data").then((r) => r.json()).then((d) => { if (!d.error) setData(d); })}
          disabled={loading}
        >
          🔄 Refresh Data
        </button>
      </div>

      <div className="sections">
        {/* Queue Section */}
        <div className="section">
          <div className="section-header">
            <h2>📋 Ready to Post</h2>
            <p>{data?.queue?.length || 0} posts in queue</p>
          </div>
          <div className="section-content">
            {!data?.queue || data.queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>Queue is empty. Run the Generate cron to create posts.</p>
              </div>
            ) : (
              data.queue.map((post) => (
                <div key={post.id} className="item">
                  <div className="item-title">{post.hook}</div>
                  <div className="item-meta">
                    <span className="status-badge status-ready">{post.status}</span>
                  </div>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.hook} className="item-image" />
                  )}
                  <div className="item-caption">{post.caption?.slice(0, 120)}...</div>
                </div>
              ))
            )}
          </div>
          <div className="section-footer">
            Auto-posts daily at 3:00 PM UTC
          </div>
        </div>

        {/* Winners Section */}
        <div className="section">
          <div className="section-header">
            <h2>⭐ New Winners</h2>
            <p>{data?.winners?.length || 0} posts to rewrite</p>
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
                    <span>❤️ {winner.likes?.toLocaleString()} likes</span>
                    <span>💬 {winner.comments?.toLocaleString()} comments</span>
                    <span className="status-badge status-new">{winner.status}</span>
                  </div>
                  <div className="item-caption">{winner.caption}</div>
                </div>
              ))
            )}
          </div>
          <div className="section-footer">
            Researches high-performing posts (500+ likes)
          </div>
        </div>
      </div>

      {/* Posted History */}
      <div className="section" style={{ marginBottom: "2rem" }}>
        <div className="section-header">
          <h2>✅ Recently Posted</h2>
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
                  <span>📅 {new Date(post.postedAt).toLocaleDateString()}</span>
                  <span className="status-badge status-posted">Posted</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="setup-section">
        <h3>🔧 Setup Required: Environment Variables</h3>
        <p>
          To get this system fully operational, add these environment variables to your Vercel project settings:
        </p>
        <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
          <li><code>AIRTABLE_API_KEY</code> - Already configured ✓</li>
          <li><code>AIRTABLE_BASE_ID</code> - Already configured ✓</li>
          <li><code>ANTHROPIC_API_KEY</code> - Already configured ✓</li>
          <li><code>GEMINI_API_KEY</code> - Already configured ✓</li>
          <li><code>APIFY_TOKEN</code> - Already configured ✓</li>
          <li><code>APIFY_TASK_ID</code> - Already configured ✓</li>
          <li><code>CRON_SECRET</code> - Already configured ✓</li>
          <li><code>IG_ACCESS_TOKEN</code> - ⚠️ Still needed (Instagram API token)</li>
          <li><code>IG_USER_ID</code> - ⚠️ Still needed (Instagram Business Account ID)</li>
        </ul>
        <p>
          <strong>Next Steps:</strong>
        </p>
        <ol style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
          <li>Follow the <code>SETUP.md</code> guide in the repo for Instagram credential setup</li>
          <li>Add <code>IG_ACCESS_TOKEN</code> and <code>IG_USER_ID</code> to Vercel settings</li>
          <li>Redeploy the project</li>
          <li>The crons will run on schedule (Research: Mondays 9 AM UTC, Generate: Daily 12 PM UTC, Post: Daily 3 PM UTC)</li>
          <li>Use the dashboard buttons above to manually trigger any cron at any time</li>
        </ol>
        <p>
          Once Instagram credentials are added, posts will automatically publish to your Instagram Business Account!
        </p>
      </div>
    </div>
  );
}
