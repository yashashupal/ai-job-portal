import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorText } from "../api";
import { useAuth } from "../auth.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("applicant");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", company_name: "", headline: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await register({ ...form, role });
      navigate(user.role === "hirer" ? "/hirer/jobs/new" : "/", { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap container">
      <form className="panel stack" onSubmit={submit}>
        <h2>Create your account</h2>
        <div className="segmented" role="group" aria-label="Account type" style={{ display: "flex" }}>
          <button type="button" style={{ flex: 1 }} aria-pressed={role === "applicant"} onClick={() => setRole("applicant")}>I want a job</button>
          <button type="button" style={{ flex: 1 }} aria-pressed={role === "hirer"} onClick={() => setRole("hirer")}>I'm hiring</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field-row">
          <div><label htmlFor="fn">First name</label><input id="fn" type="text" required value={form.first_name} onChange={set("first_name")} /></div>
          <div><label htmlFor="ln">Last name</label><input id="ln" type="text" value={form.last_name} onChange={set("last_name")} /></div>
        </div>
        {role === "hirer" ? (
          <div><label htmlFor="co">Company name</label><input id="co" type="text" required value={form.company_name} onChange={set("company_name")} /></div>
        ) : (
          <div><label htmlFor="hl">Headline <span className="muted">(optional)</span></label>
            <input id="hl" type="text" placeholder="e.g. Full-stack developer, 2 yrs" value={form.headline} onChange={set("headline")} /></div>
        )}
        <div><label htmlFor="em">Email</label><input id="em" type="email" required autoComplete="email" value={form.email} onChange={set("email")} /></div>
        <div>
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <p className="hint">At least 8 characters.</p>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="muted small">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
