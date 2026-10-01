import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorText } from "../api";
import { useAuth } from "../auth.jsx";
import { money, timeAgo } from "../utils.js";

function ApplyBox({ job, onApplied }) {
  const { user } = useAuth();
  const [cover, setCover] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="stack">
        <h3>Apply for this role</h3>
        <p className="muted">Log in or create an applicant account to apply.</p>
        <Link to="/login" state={{ from: `/jobs/${job.id}` }} className="btn btn-primary btn-block">Log in to apply</Link>
        <Link to="/register" className="btn btn-outline btn-block">Create account</Link>
      </div>
    );
  }
  if (user.role === "hirer") {
    return <p className="muted">You are signed in as a hirer. Applicant accounts can apply to roles.</p>;
  }
  if (job.has_applied) {
    return (
      <div className="stack">
        <div className="alert alert-ok">You applied to this role.</div>
        <Link to="/applications" className="btn btn-outline btn-block">Track your applications</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Attach your resume to apply.");
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("resume", file);
    body.append("cover_letter", cover);
    try {
      await api.post(`/jobs/${job.id}/apply/`, body);
      onApplied();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <h3>Apply for this role</h3>
      <div>
        <label htmlFor="resume">Resume</label>
        <input id="resume" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0] || null)} />
        <p className="hint">PDF, DOC or DOCX, up to 5 MB.</p>
      </div>
      <div>
        <label htmlFor="cover">Cover letter <span className="muted">(optional)</span></label>
        <textarea id="cover" value={cover} maxLength={4000} onChange={(e) => setCover(e.target.value)}
          placeholder="Why are you a good fit?" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>
    </form>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setJob(null);
    api.get(`/jobs/${id}/`).then((r) => setJob(r.data)).catch((e) => setError(e.response?.status === 404 ? "This job is no longer available." : errorText(e)));
  }, [id, user?.id]);

  if (error) return <div className="container page"><div className="empty"><h2>{error}</h2><Link to="/" className="btn btn-outline">Back to jobs</Link></div></div>;
  if (!job) return <div className="container page"><div className="skeleton" /></div>;

  const salary = money(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="container page">
      <Link to="/" className="back">← All jobs</Link>
      <div className="detail">
        <div className="panel">
          <div className="stack">
            <div>
              <h1 style={{ fontSize: 28 }}>{job.title}</h1>
              <p className="muted" style={{ marginTop: 6 }}>{job.company_name} · {job.location} · Posted {timeAgo(job.created_at).toLowerCase()}</p>
            </div>
            <div className="tags">
              <span className="tag tag-brand">{job.work_mode_label}</span>
              <span className="tag">{job.job_type_label}</span>
              {!job.is_active && <span className="tag">Closed</span>}
            </div>
            <dl className="kv">
              <dt>Salary</dt><dd>{salary || "Not listed"}</dd>
              <dt>Applicants</dt><dd>{job.applications_count}</dd>
            </dl>
            {job.skills.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>Skills</h3>
                <div className="tags">{job.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
              </div>
            )}
            <div>
              <h3 style={{ marginBottom: 8 }}>About the role</h3>
              <div className="desc">{job.description}</div>
            </div>
          </div>
        </div>
        <aside className="panel side">
          {job.is_active ? <ApplyBox job={job} onApplied={() => setJob({ ...job, has_applied: true, applications_count: job.applications_count + 1 })} />
            : <p className="muted">This role is closed to new applications.</p>}
        </aside>
      </div>
    </div>
  );
}
