"use client";

import { useState, useEffect } from "react";

export default function DashboardClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState({});
  const [message, setMessage] = useState("");

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard/data");
      if (!res.ok) throw new Error("Failed to fetch data");
      const result = await res.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("Error loading dashboard data");
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
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
        setTimeout(() => fetchData(), 1000);
      } else {
        setMessage(`✗ ${cronName} failed: ${result.error}`);
      }
    } catch (err) {
      setMessage(`✗ ${cronName} error: ${err.message}`);
    }
    setTriggering((prev) => ({ ...prev, [cronName]: false }));
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
            background: message.startsWith("✓") ? "#dcfce7" : "#fee2e2",
            color: message.startsWith("✓") ? "#166534" : "#991b1b",
            border: `1px solid ${message.startsWith("✓") ? "#86efac" : "#fca5a5"}`,
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
          onClick={fetchData}
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
        <h3>🔧 Setup Required: Instagram Credentials</h3>
        <p>
          To enable automatic Instagram posting, add these environment variables to your Vercel project:
        </p>
        <ul style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
          <li><code>IG_ACCESS_TOKEN</code> - Long-lived Instagram API access token</li>
          <li><code>IG_USER_ID</code> - Your Instagram Business account ID</li>
        </ul>
        <p>
          <strong>Steps:</strong>
        </p>
        <ol style={{ marginLeft: "2rem", marginBottom: "1rem" }}>
          <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">Meta Developers</a></li>
          <li>Create a new app (or use existing) and set up Instagram Basic Display + Graph API</li>
          <li>Generate a long-lived access token for your Business Account</li>
          <li>Find your Instagram Business Account ID (usually the number in Instagram URLs)</li>
          <li>Add both to Vercel project settings → Environment Variables</li>
          <li>Redeploy the project</li>
        </ol>
        <p>
          Once set, the Post cron will automatically publish from the Queue daily at 3:00 PM UTC.
        </p>
      </div>
    </div>
  );
}
