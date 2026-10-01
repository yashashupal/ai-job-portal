import { useState } from "react";
import api, { errorText } from "../api";
import { money, timeAgo } from "../utils.js";

export default function ExternalJobCard({ job }) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState({ state: "idle", data: null, error: "" });
  const salary = money(job.salary_min, job.salary_max, job.salary_currency);

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
        {job.remote && <span className="tag tag-brand">Remote</span>}
        {job.seniority && <span className="tag">{job.seniority.replace(/_/g, " ")}</span>}
        {job.source && <span className="tag">via {job.source}</span>}
        {job.technologies.slice(0, 4).map((t) => <span className="tag" key={t}>{t}</span>)}
      </div>

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
        <div className="row">
          {job.company_domain && stack.state === "idle" && (
            <button className="btn btn-outline btn-sm" onClick={scan}>See tech stack</button>
          )}
          {job.apply_url ? (
            <a className="btn btn-primary btn-sm" href={job.apply_url} target="_blank" rel="noreferrer noopener">
              Apply on source site
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
