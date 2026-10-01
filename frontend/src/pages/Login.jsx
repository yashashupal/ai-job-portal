import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorText } from "../api";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from || (user.role === "hirer" ? "/hirer" : "/"), { replace: true });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap container">
      <form className="panel stack" onSubmit={submit}>
        <h2>Log in</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="muted small">New to Tulsa Web Solution? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
