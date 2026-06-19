CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_feedback_created_at ON feedback (created_at);
CREATE INDEX idx_feedback_ip_created ON feedback (ip, created_at);
