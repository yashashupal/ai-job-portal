import { useCallback, useEffect, useState } from "react";
import api, { errorText } from "../api";
import JobCard from "../components/JobCard.jsx";
import ExternalJobCard from "../components/ExternalJobCard.jsx";
import { JOB_TYPES, WORK_MODES } from "../utils.js";

const COUNTRIES = [
  ["", "Any country"], ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"],
  ["CA", "Canada"], ["DE", "Germany"], ["AU", "Australia"], ["SG", "Singapore"], ["AE", "UAE"],
];

function Skeletons() {
  return (
    <div className="cards">
      {[0, 1, 2].map((i) => <div className="skeleton" key={i} />)}
    </div>
  );
}

export default function Jobs() {
  const [tab, setTab] = useState("platform");
  const [form, setForm] = useState({ q: "", location: "" });
  const [applied, setApplied] = useState({ q: "", location: "" });
  const [filters, setFilters] = useState({ work_mode: "", job_type: "", remote: false, country: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], count: 0, hasNext: false, cursor: null, sandbox: false });
  const [status, setStatus] = useState({ loading: true, loadingMore: false, error: "" });

  const loadPlatform = useCallback(async () => {
    setStatus({ loading: true, loadingMore: false, error: "" });
    try {
      const params = { page, q: applied.q, location: applied.location, work_mode: filters.work_mode, job_type: filters.job_type };
      const { data: res } = await api.get("/jobs/", { params });
      setData({ items: res.results, count: res.count, hasNext: !!res.next, cursor: null, sandbox: false });
      setStatus({ loading: false, loadingMore: false, error: "" });
    } catch (err) {
      setStatus({ loading: false, loadingMore: false, error: errorText(err) });
    }
  }, [page, applied, filters.work_mode, filters.job_type]);

  const loadLive = useCallback(async (cursor = "") => {
    setStatus((s) => ({ ...s, loading: !cursor, loadingMore: !!cursor, error: "" }));
    try {
      const params = {
        q: applied.q, location: applied.location, country: filters.country,
        remote: filters.remote ? 1 : "", cursor,
      };
      const { data: res } = await api.get("/external/jobs/", { params });
      setData((d) => ({
        items: cursor ? [...d.items, ...res.results] : res.results,
        count: res.total ?? 0, hasNext: !!res.next_cursor, cursor: res.next_cursor, sandbox: res.sandbox,
      }));
      setStatus({ loading: false, loadingMore: false, error: "" });
    } catch (err) {
      setStatus({ loading: false, loadingMore: false, error: errorText(err) });
    }
  }, [applied, filters.country, filters.remote]);

  useEffect(() => {
    if (tab === "platform") loadPlatform();
    else loadLive("");
  }, [tab, loadPlatform, loadLive]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({ q: form.q.trim(), location: form.location.trim() });
  };
  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const switchTab = (next) => {
    setTab(next);
    setPage(1);
    setData({ items: [], count: 0, hasNext: false, cursor: null, sandbox: false });
  };

  const live = tab === "live";

  return (
    <div className="container">
      <section className="hero">
        <h1>Find work worth applying for</h1>
        <p>Browse roles posted directly on Tulsa Web Solution, or search live openings collected from 30+ job boards.</p>
        <form className="searchbar" onSubmit={submit} role="search">
          <div className="cell">
            <label htmlFor="q">Role or keyword</label>
            <input id="q" type="text" placeholder="e.g. Django developer" value={form.q}
              onChange={(e) => setForm({ ...form, q: e.target.value })} />
          </div>
          <div className="cell">
            <label htmlFor="loc">Location</label>
            <input id="loc" type="text" placeholder="City or remote" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
      </section>

      <div className="row between wrap">
        <div className="segmented" role="group" aria-label="Job source">
          <button aria-pressed={!live} onClick={() => switchTab("platform")}>On Tulsa Web Solution</button>
          <button aria-pressed={live} onClick={() => switchTab("live")}>Live market</button>
        </div>
        {!status.loading && !status.error && (
          <span className="muted small">
            {live
              ? data.count ? `${data.count.toLocaleString()} matching roles` : `${data.items.length} roles shown`
              : `${data.count} ${data.count === 1 ? "role" : "roles"}`}
          </span>
        )}
      </div>

      <div className="layout">
        <aside className="filters" aria-label="Filters">
          <div className="group-wrap">
            {!live ? (
              <>
                <div className="group">
                  <h3>Work mode</h3>
                  {[{ value: "", label: "Any" }, ...WORK_MODES].map((o) => (
                    <label className="radio" key={o.value}>
                      <input type="radio" name="mode" checked={filters.work_mode === o.value}
                        onChange={() => setFilter("work_mode", o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <div className="group">
                  <h3>Job type</h3>
                  {[{ value: "", label: "Any" }, ...JOB_TYPES].map((o) => (
                    <label className="radio" key={o.value}>
                      <input type="radio" name="type" checked={filters.job_type === o.value}
                        onChange={() => setFilter("job_type", o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="group">
                  <h3>Country</h3>
                  <select value={filters.country} onChange={(e) => setFilter("country", e.target.value)} aria-label="Country">
                    {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="group">
                  <label className="check">
                    <input type="checkbox" checked={filters.remote} onChange={(e) => setFilter("remote", e.target.checked)} />
                    Remote only
                  </label>
                </div>
              </>
            )}
          </div>
        </aside>

        <section aria-live="polite">
          {live && (
            <div className="alert alert-info" style={{ marginBottom: 14 }}>
              {data.sandbox
                ? "Showing sample data because no JobsPipe key is set on the server."
                : "Live listings from other job boards. “Apply” opens the original posting."}
            </div>
          )}
          {status.error && <div className="alert alert-error">{status.error}</div>}
          {status.loading ? (
            <Skeletons />
          ) : data.items.length === 0 && !status.error ? (
            <div className="empty">
              <h3>No roles match your search</h3>
              <p>Try a broader keyword, or clear a filter.</p>
            </div>
          ) : (
            <div className="cards">
              {data.items.map((job) =>
                live ? <ExternalJobCard key={job.id} job={job} /> : <JobCard key={job.id} job={job} />
              )}
            </div>
          )}

          {!status.loading && !live && (page > 1 || data.hasNext) && (
            <div className="pager">
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="muted small">Page {page}</span>
              <button className="btn btn-outline btn-sm" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
          {!status.loading && live && data.hasNext && (
            <div className="pager">
              <button className="btn btn-outline" disabled={status.loadingMore} onClick={() => loadLive(data.cursor)}>
                {status.loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
