import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { downloadResume, errorText } from "../api";
import StatusBadge from "../components/StatusBadge.jsx";
import { timeAgo } from "../utils.js";

const STATUSES = [
  ["applied", "Applied"], ["shortlisted", "Shortlisted"], ["rejected", "Rejected"], ["hired", "Hired"],
];

export default function Applicants() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [apps, setApps] = useState(null);
  const [error, setError] = useState("");
  const [openCover, setOpenCover] = useState({});

  useEffect(() => {
    Promise.all([api.get(`/jobs/${id}/`), api.get(`/jobs/${id}/applications/`)])
      .then(([j, a]) => { setJob(j.data); setApps(a.data); })
      .catch((e) => setError(errorText(e)));
  }, [id]);

  const setStatus = async (app, status) => {
    try {
      await api.patch(`/applications/${app.id}/`, { status });
      setApps((list) => list.map((x) => (x.id === app.id ? { ...x, status, status_label: STATUSES.find((s) => s[0] === status)[1] } : x)));
    } catch (e) { setError(errorText(e)); }
  };

  return (
    <div className="container page mid">
      <Link to="/hirer" className="back">← My jobs</Link>
      <div className="page-head">
        <div>
          <h2>Applicants</h2>
          {job && <p className="muted">{job.title} · {job.location}</p>}
        </div>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
      {!apps ? <div className="skeleton" /> : apps.length === 0 ? (
        <div className="empty"><h3>No applications yet</h3><p>When someone applies, they will show up here with their resume.</p></div>
      ) : (
        <div className="list">
          {apps.map((a) => (
            <div className="list-item" key={a.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="grow">
                <div className="row wrap" style={{ gap: 10 }}>
                  <h3>{a.applicant_name}</h3>
                  <StatusBadge status={a.status} label={a.status_label} />
                </div>
                <div className="job-meta">
                  <a href={`mailto:${a.applicant_email}`}>{a.applicant_email}</a>
                  {a.applicant_headline ? ` · ${a.applicant_headline}` : ""} · Applied {timeAgo(a.created_at).toLowerCase()}
                </div>
                {a.cover_letter && (
                  <>
                    <button className="btn btn-link small" onClick={() => setOpenCover({ ...openCover, [a.id]: !openCover[a.id] })}>
                      {openCover[a.id] ? "Hide cover letter" : "Read cover letter"}
                    </button>
                    {openCover[a.id] && <div className="cover">{a.cover_letter}</div>}
                  </>
                )}
              </div>
              <div className="actions" style={{ alignItems: "center" }}>
                <button className="btn btn-outline btn-sm" onClick={() => downloadResume(a).catch((e) => setError(errorText(e)))}>Download resume</button>
                <select aria-label={`Status for ${a.applicant_name}`} value={a.status} onChange={(e) => setStatus(a, e.target.value)} style={{ width: "auto" }}>
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
