import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorText } from "../api";
import StatusBadge from "../components/StatusBadge.jsx";
import { timeAgo } from "../utils.js";

export default function MyApplications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/applications/mine/"), api.get("/external/tracked/")])
      .then(([applications, tracked]) => setData({ applications: applications.data, tracked: tracked.data }))
      .catch((e) => setError(errorText(e)));
  }, []);

  const updateTracked = async (record, status) => {
    setBusyId(record.id);
    setError("");
    try {
      const { data: updated } = await api.patch(`/external/tracked/${record.id}/`, { status });
      setData((current) => ({ ...current, tracked: current.tracked.map((item) => item.id === record.id ? updated : item) }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  const removeTracked = async (record) => {
    setBusyId(record.id);
    setError("");
    try {
      await api.delete(`/external/tracked/${record.id}/`);
      setData((current) => ({ ...current, tracked: current.tracked.filter((item) => item.id !== record.id) }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  const showEmpty = data?.applications.length === 0 && data?.tracked.length === 0;
  const showRecords = data && !showEmpty;

  return (
    <div className="container page mid">
      <div className="page-head">
        <div>
          <h2>My applications</h2>
          <p className="muted">Track where each application stands.</p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && <div className="skeleton" />}
      {showEmpty && (
        <div className="empty">
          <h3>No jobs saved yet</h3>
          <p>Save live listings or apply to a role to keep it here.</p>
          <Link to="/" className="btn btn-primary">Browse jobs</Link>
        </div>
      )}
      {showRecords && (
        <div className="stack">
          {data.tracked.length > 0 && (
            <section>
              <div className="page-head"><div><h3>Live market tracker</h3><p className="muted small">External listings you saved or marked applied.</p></div></div>
              <div className="list">
                {data.tracked.map((record) => (
                  <div className="list-item" key={`external-${record.id}`}>
                    <div className="grow">
                      {record.job.apply_url ? (
                        <a className="job-title" href={record.job.apply_url} target="_blank" rel="noreferrer noopener">{record.job.title}</a>
                      ) : <strong className="job-title">{record.job.title}</strong>}
                      <div className="job-meta">{record.job.company || "Company not listed"}{record.job.location ? ` · ${record.job.location}` : ""} · Saved {timeAgo(record.updated_at).toLowerCase()}</div>
                    </div>
                    <div className="row wrap">
                      <select aria-label={`Tracking status for ${record.job.title}`} value={record.status} disabled={busyId === record.id} onChange={(e) => updateTracked(record, e.target.value)}>
                        <option value="saved">Saved</option>
                        <option value="applied">Applied</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button className="btn btn-outline btn-sm" disabled={busyId === record.id} onClick={() => removeTracked(record)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.applications.length > 0 && (
            <section>
              <div className="page-head"><div><h3>Applications on Tulsa Web Solution</h3><p className="muted small">Submitted directly to employers using this portal.</p></div></div>
              <div className="list">
                {data.applications.map((a) => (
                  <div className="list-item" key={a.id}>
                    <div className="grow">
                      <Link to={`/jobs/${a.job.id}`} className="job-title">{a.job.title}</Link>
                      <div className="job-meta">{a.job.company_name} · {a.job.location} · Applied {timeAgo(a.created_at).toLowerCase()}</div>
                    </div>
                    <StatusBadge status={a.status} label={a.status_label} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
