import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorText } from "../api";
import { useAuth } from "../auth.jsx";
import { JOB_TYPES, WORK_MODES } from "../utils.js";

export default function PostJob() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", company_name: user?.company_name || "", location: "", work_mode: "onsite", job_type: "full_time",
    salary_min: "", salary_max: "", salary_currency: "INR", skills: "", description: "", is_active: true,
  });
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!editing) return;
    api.get(`/jobs/${id}/`).then(({ data }) => {
      setForm({
        title: data.title, company_name: data.company_name, location: data.location, work_mode: data.work_mode,
        job_type: data.job_type, salary_min: data.salary_min ?? "", salary_max: data.salary_max ?? "",
        salary_currency: data.salary_currency, skills: data.skills.join(", "), description: data.description,
        is_active: data.is_active,
      });
      setLoading(false);
    }).catch((e) => { setError(errorText(e)); setLoading(false); });
  }, [id, editing]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      ...form,
      salary_min: form.salary_min === "" ? null : Number(form.salary_min),
      salary_max: form.salary_max === "" ? null : Number(form.salary_max),
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) await api.put(`/jobs/${id}/`, body);
      else await api.post("/jobs/", body);
      navigate("/hirer");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  if (loading) return <div className="container page mid"><div className="skeleton" /></div>;

  return (
    <div className="container page mid">
      <Link to="/hirer" className="back">← My jobs</Link>
      <form className="panel stack" onSubmit={submit}>
        <h2>{editing ? "Edit job" : "Post a job"}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div><label htmlFor="t">Job title</label><input id="t" type="text" required maxLength={160} value={form.title} onChange={set("title")} placeholder="e.g. Senior Django Developer" /></div>
        <div className="field-row">
          <div><label htmlFor="c">Company</label><input id="c" type="text" required value={form.company_name} onChange={set("company_name")} /></div>
          <div><label htmlFor="l">Location</label><input id="l" type="text" required value={form.location} onChange={set("location")} placeholder="e.g. Indore" /></div>
        </div>
        <div className="field-row">
          <div><label htmlFor="wm">Work mode</label>
            <select id="wm" value={form.work_mode} onChange={set("work_mode")}>{WORK_MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label htmlFor="jt">Job type</label>
            <select id="jt" value={form.job_type} onChange={set("job_type")}>{JOB_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div><label htmlFor="smin">Minimum salary / year <span className="muted">(optional)</span></label><input id="smin" type="number" min="0" value={form.salary_min} onChange={set("salary_min")} /></div>
          <div><label htmlFor="smax">Maximum salary / year <span className="muted">(optional)</span></label><input id="smax" type="number" min="0" value={form.salary_max} onChange={set("salary_max")} /></div>
        </div>
        <div style={{ maxWidth: 200 }}><label htmlFor="cur">Currency</label>
          <select id="cur" value={form.salary_currency} onChange={set("salary_currency")}>
            <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
          </select></div>
        <div><label htmlFor="sk">Skills</label><input id="sk" type="text" value={form.skills} onChange={set("skills")} placeholder="Python, Django, React" />
          <p className="hint">Separate skills with commas. Up to 15.</p></div>
        <div><label htmlFor="d">Description</label><textarea id="d" required style={{ minHeight: 220 }} value={form.description} onChange={set("description")}
          placeholder="What will this person do? What do you expect from them?" /></div>
        {editing && (
          <label className="check"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Accepting applications</label>
        )}
        <div className="row">
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish job"}</button>
          <Link to="/hirer" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
