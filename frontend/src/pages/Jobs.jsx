import { useCallback, useEffect, useState } from "react";
import api, { errorText } from "../api";
import ExternalJobCard from "../components/ExternalJobCard.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";

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
  const { user } = useAuth();
  const [form, setForm] = useState({ q: "", location: "" });
  const [applied, setApplied] = useState({ q: "", location: "" });
  const [filters, setFilters] = useState({ remote: false, country: "" });
  const [forYou, setForYou] = useState(user?.role === "applicant");
  const [data, setData] = useState({ items: [], count: 0, hasNext: false, cursor: null, sandbox: false, summary: "" });
  const [status, setStatus] = useState({ loading: true, loadingMore: false, error: "" });

  const loadLive = useCallback(async (cursor = "") => {
    setStatus((s) => ({ ...s, loading: !cursor, loadingMore: !!cursor, error: "" }));
    try {
      const params = {
        q: applied.q, location: applied.location, country: filters.country,
        remote: filters.remote ? 1 : "", cursor,
      };
      const endpoint = forYou ? "/external/jobs/recommended/" : "/external/jobs/";
      const { data: res } = await api.get(endpoint, { params });
      setData((d) => ({
        items: cursor ? [...d.items, ...res.results] : res.results,
        count: res.total ?? 0, hasNext: !!res.next_cursor, cursor: res.next_cursor, sandbox: res.sandbox,
        summary: res.summary || "",
      }));
      setStatus({ loading: false, loadingMore: false, error: "" });
    } catch (err) {
      setStatus({ loading: false, loadingMore: false, error: errorText(err) });
    }
  }, [applied, filters.country, filters.remote, forYou]);

  useEffect(() => {
    loadLive("");
  }, [loadLive]);

  const submit = (e) => {
    e.preventDefault();
    setApplied({ q: form.q.trim(), location: form.location.trim() });
  };
  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const switchMode = (next) => {
    setData({ items: [], count: 0, hasNext: false, cursor: null, sandbox: false, summary: "" });
    setForYou(next);
  };
  let marketMessage = "Live listings from other job boards. “Apply” opens the original posting.";
  if (data.sandbox) marketMessage = "Showing sample data because no JobsPipe key is set on the server.";
  if (forYou && data.summary) marketMessage = data.summary;
  const showEmpty = !status.loading && data.items.length === 0 && !status.error;
  const showResults = !status.loading && data.items.length > 0;
  const suggestedSkill = data.items.find((job) => job.technologies?.length)?.technologies[0];
  const searchPlaceholder = forYou && user?.role === "applicant"
    ? [user.headline, suggestedSkill || data.items[0]?.title].filter(Boolean).join(" · ") || "Skills from your resume"
    : "Role, skill, or keyword";

  return (
    <div className="container">
      <section className="hero">
        <h1>Find work worth applying for</h1>
        <p>Browse live openings or rank them against your resume to find a closer fit.</p>
        <form className="searchbar" onSubmit={submit} role="search">
          <div className="cell">
            <label htmlFor="q">Role or keyword</label>
            <input id="q" type="text" placeholder={searchPlaceholder} value={form.q}
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
        <div className="row wrap">
          {user?.role === "applicant" && (
            <div className="segmented" aria-label="Job recommendations">
              <button aria-pressed={!forYou} onClick={() => switchMode(false)}>All listings</button>
              <button aria-pressed={forYou} onClick={() => switchMode(true)}>For you</button>
            </div>
          )}
          {!user && <Link className="btn btn-outline btn-sm" to="/login">Log in for resume matches</Link>}
          {!status.loading && !status.error && <span className="muted small">{data.count ? `${data.count.toLocaleString()} matching roles` : `${data.items.length} roles shown`}</span>}
        </div>
      </div>

      <div className="layout">
        <aside className="filters" aria-label="Filters">
          <div className="group-wrap">
            <div className="group">
              <h3>Country</h3>
              <select value={filters.country} onChange={(e) => setFilter("country", e.target.value)} aria-label="Country">
                {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="group">
              <label className="check">
                <input type="checkbox" checked={filters.remote} onChange={(e) => setFilter("remote", e.target.checked)} />
                <span>Remote only</span>
              </label>
            </div>
          </div>
        </aside>

        <section aria-live="polite">
          <div className="alert alert-info" style={{ marginBottom: 14 }}>
            {marketMessage}
          </div>
          {status.error && <div className="alert alert-error">{status.error}{forYou && status.error.toLowerCase().includes("upload your resume") && <> <Link to="/profile">Upload your resume in Profile</Link></>}</div>}
          {status.loading && <Skeletons />}
          {showEmpty && (
            <div className="empty"><h3>No roles match your search</h3><p>Try a broader keyword, or clear a filter.</p></div>
          )}
          {showResults && (
            <div className="cards">
              {data.items.map((job) => <ExternalJobCard key={job.id} job={job} />)}
            </div>
          )}

          {!status.loading && data.hasNext && (
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
