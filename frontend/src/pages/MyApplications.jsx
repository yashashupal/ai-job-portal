import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorText } from "../api";
import StatusBadge from "../components/StatusBadge.jsx";
import { timeAgo } from "../utils.js";

export default function MyApplications() {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/mine/").then((r) => setApps(r.data)).catch((e) => setError(errorText(e)));
  }, []);

  return (
    <div className="container page mid">
      <div className="page-head">
        <div>
          <h2>My applications</h2>
          <p className="muted">Track where each application stands.</p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!apps ? <div className="skeleton" /> : apps.length === 0 ? (
        <div className="empty">
          <h3>You have not applied anywhere yet</h3>
          <p>Find a role that fits and apply with your resume.</p>
          <Link to="/" className="btn btn-primary">Browse jobs</Link>
        </div>
      ) : (
        <div className="list">
          {apps.map((a) => (
            <div className="list-item" key={a.id}>
              <div className="grow">
                <Link to={`/jobs/${a.job.id}`} className="job-title">{a.job.title}</Link>
                <div className="job-meta">{a.job.company_name} · {a.job.location} · Applied {timeAgo(a.created_at).toLowerCase()}</div>
              </div>
              <StatusBadge status={a.status} label={a.status_label} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
