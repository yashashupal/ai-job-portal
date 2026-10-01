import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorText } from "../api";
import StatusBadge from "../components/StatusBadge.jsx";
import { timeAgo } from "../utils.js";

export default function HirerDashboard() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get("/jobs/mine/").then((r) => setJobs(r.data)).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, []);

  const toggle = async (job) => {
    try {
      await api.patch(`/jobs/${job.id}/`, { is_active: !job.is_active });
      load();
    } catch (e) { setError(errorText(e)); }
  };
  const remove = async (job) => {
    if (!window.confirm(`Delete “${job.title}”? Its applications will be deleted too.`)) return;
    try {
      await api.delete(`/jobs/${job.id}/`);
      load();
    } catch (e) { setError(errorText(e)); }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h2>My jobs</h2>
          <p className="muted">Roles you have posted and the people who applied.</p>
        </div>
        <Link to="/hirer/jobs/new" className="btn btn-primary">Post a job</Link>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
      {!jobs ? <div className="skeleton" /> : jobs.length === 0 ? (
        <div className="empty">
          <h3>You have not posted a job yet</h3>
          <p>Publish your first role and applicants can start applying right away.</p>
          <Link to="/hirer/jobs/new" className="btn btn-primary">Post a job</Link>
        </div>
      ) : (
        <div className="list">
          {jobs.map((job) => (
            <div className="list-item" key={job.id}>
              <div className="grow">
                <div className="row wrap" style={{ gap: 10 }}>
                  <Link to={`/jobs/${job.id}`} className="job-title">{job.title}</Link>
                  <StatusBadge status={job.is_active ? "open" : "closed"} label={job.is_active ? "Open" : "Closed"} />
                </div>
                <div className="job-meta">{job.location} · {job.work_mode_label} · Posted {timeAgo(job.created_at).toLowerCase()}</div>
              </div>
              <Link to={`/hirer/jobs/${job.id}/applicants`} className="btn btn-outline btn-sm">
                {job.applications_count} {job.applications_count === 1 ? "applicant" : "applicants"}
              </Link>
              <div className="actions">
                <Link to={`/hirer/jobs/${job.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                <button className="btn btn-outline btn-sm" onClick={() => toggle(job)}>{job.is_active ? "Close" : "Reopen"}</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(job)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
