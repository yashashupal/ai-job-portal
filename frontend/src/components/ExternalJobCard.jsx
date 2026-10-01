import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorText } from "../api";
import { money, timeAgo } from "../utils.js";
import { useAuth } from "../auth.jsx";

export default function ExternalJobCard({ job }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState({ state: "idle", data: null, error: "" });
  const [tracking, setTracking] = useState({ id: job.tracked_id || null, status: job.tracked_status || "", busy: false, error: "" });
  const salary = money(job.salary_min, job.salary_max, job.salary_currency);

  useEffect(() => {
    setTracking({ id: job.tracked_id || null, status: job.tracked_status || "", busy: false, error: "" });
  }, [job.tracked_id, job.tracked_status]);

  const updateTracking = async (status) => {
    setTracking((current) => ({ ...current, busy: true, error: "" }));
    try {
      const response = tracking.id
        ? await api.patch(`/external/tracked/${tracking.id}/`, { status })
        : await api.post("/external/tracked/", { external_id: job.id, job, status });
      setTracking({ id: response.data.id, status: response.data.status, busy: false, error: "" });
    } catch (err) {
      setTracking((current) => ({ ...current, busy: false, error: errorText(err) }));
    }
  };

  const removeTracking = async () => {
    setTracking((current) => ({ ...current, busy: true, error: "" }));
    try {
      await api.delete(`/external/tracked/${tracking.id}/`);
      setTracking({ id: null, status: "", busy: false, error: "" });
    } catch (err) {
      setTracking((current) => ({ ...current, busy: false, error: errorText(err) }));
    }
  };

  const scan = async () => {
    setStack({ state: "loading", data: null, error: "" });
    try {
      const { data } = await api.get("/external/stack/", { params: { domain: job.company_domain } });
      setStack({ state: "done", data, error: "" });
    } catch (err) {
      setStack({ state: "error", data: null, error: errorText(err) });
    }
  };

  return (
    <article className="job">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <div className="job-title" style={{ cursor: "default" }}>{job.title}</div>
          <div className="job-meta">
            {job.company || "Company not listed"}
            {job.location ? ` · ${job.location}` : ""}
          </div>
        </div>
        <span className="small muted">{timeAgo(job.date_posted)}</span>
      </div>

      <div className="tags" style={{ marginTop: 12 }}>
        {job.match_score != null && <span className="tag tag-brand">{job.match_score}% resume match</span>}
        {job.remote && <span className="tag tag-brand">Remote</span>}
        {job.seniority && <span className="tag">{job.seniority.replaceAll("_", " ")}</span>}
        {job.source && <span className="tag">via {job.source}</span>}
        {job.technologies.slice(0, 4).map((t) => <span className="tag" key={t}>{t}</span>)}
      </div>

      {job.match_reason && (
        <div className="stackbox">
          <strong className="small">Why this matches</strong>
          <p className="small" style={{ marginTop: 5 }}>{job.match_reason}</p>
          {!!job.match_gaps?.length && <p className="muted small" style={{ marginTop: 5 }}>Check: {job.match_gaps.join(" · ")}</p>}
        </div>
      )}

      {job.snippet && (
        <>
          <p className={`snippet ${open ? "open" : ""}`}>{job.snippet}</p>
          <button className="btn btn-link small" onClick={() => setOpen(!open)}>
            {open ? "Show less" : "Read more"}
          </button>
        </>
      )}

      {stack.state !== "idle" && (
        <div className="stackbox">
          {stack.state === "loading" && <span className="muted small">Scanning {job.company_domain}…</span>}
          {stack.state === "error" && <span className="small" style={{ color: "var(--bad)" }}>{stack.error}</span>}
          {stack.state === "done" && (
            <>
              <h3>Tech stack at {stack.data.domain}</h3>
              {stack.data.technologies.length === 0 ? (
                <p className="muted small">No technologies detected for this domain.</p>
              ) : (
                <div className="tags">
                  {stack.data.technologies.slice(0, 18).map((t) => (
                    <span className="tag" key={t.name} title={t.category || ""}>
                      {t.name}{t.confidence != null ? ` · ${Math.round(t.confidence)}%` : ""}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="job-foot">
        <span className="salary">{salary || <span className="muted">Salary not listed</span>}</span>
        <div className="row wrap">
          {user?.role === "applicant" && (
            tracking.id ? (
              <>
                <span className="tag tag-brand">{tracking.status === "applied" ? "Applied" : "Saved"}</span>
                {tracking.status !== "applied" && <button className="btn btn-outline btn-sm" disabled={tracking.busy} onClick={() => updateTracking("applied")}>Mark applied</button>}
                <button className="btn btn-outline btn-sm" disabled={tracking.busy} onClick={removeTracking}>Remove</button>
              </>
            ) : (
              <button className="btn btn-outline btn-sm" disabled={tracking.busy} onClick={() => updateTracking("saved")}>Save job</button>
            )
          )}
          {!user && <Link className="btn btn-outline btn-sm" to="/login">Log in to save</Link>}
          {job.company_domain && stack.state === "idle" && (
            <button className="btn btn-outline btn-sm" onClick={scan}>See tech stack</button>
          )}
          {job.apply_url ? (
            <a className="btn btn-primary btn-sm" href={job.apply_url} target="_blank" rel="noreferrer noopener"
              onClick={() => { if (user?.role === "applicant" && !tracking.id) void updateTracking("saved"); }}>
              Apply on source site
            </a>
          ) : null}
        </div>
      </div>
      {tracking.error && <div className="small" style={{ color: "var(--bad)", marginTop: 8 }}>{tracking.error}</div>}
    </article>
  );
}
