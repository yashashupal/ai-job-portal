import { Link } from "react-router-dom";
import { money, timeAgo } from "../utils.js";

export default function JobCard({ job }) {
  const salary = money(job.salary_min, job.salary_max, job.salary_currency);
  return (
    <article className="job">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <Link to={`/jobs/${job.id}`} className="job-title">{job.title}</Link>
          <div className="job-meta">{job.company_name} · {job.location}</div>
        </div>
        <span className="small muted">{timeAgo(job.created_at)}</span>
      </div>
      <div className="tags" style={{ marginTop: 12 }}>
        <span className="tag tag-brand">{job.work_mode_label}</span>
        <span className="tag">{job.job_type_label}</span>
        {job.skills.slice(0, 4).map((s) => <span className="tag" key={s}>{s}</span>)}
      </div>
      <div className="job-foot">
        <span className="salary">{salary || <span className="muted">Salary not listed</span>}</span>
        <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-sm">
          {job.has_applied ? "Applied" : "View role"}
        </Link>
      </div>
    </article>
  );
}
