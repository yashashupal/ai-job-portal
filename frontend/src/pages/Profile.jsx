import { useEffect, useState } from "react";
import api, { errorText } from "../api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", headline: "", company_name: "" });
  const [resumeFile, setResumeFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/auth/me/").then(({ data }) => {
      setProfile(data);
      setForm({ first_name: data.first_name || "", last_name: data.last_name || "", headline: data.headline || "", company_name: data.company_name || "" });
    }).catch((err) => setError(errorText(err)));
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch("/auth/me/", form);
      setProfile((current) => ({ ...current, ...data }));
      setNotice("Profile updated.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadResume = async (event) => {
    event.preventDefault();
    if (!resumeFile) return;
    setBusy(true);
    setError("");
    setNotice("");
    const body = new FormData();
    body.append("resume", resumeFile);
    try {
      const { data } = await api.post("/auth/me/resume/", body);
      setProfile((current) => ({ ...current, ...data }));
      setResumeFile(null);
      event.target.reset();
      setNotice("Resume uploaded and text extracted for job matching.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const downloadResume = async () => {
    setError("");
    try {
      const { data } = await api.get("/auth/me/resume/", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = profile.resume_name || "resume";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const removeResume = async () => {
    if (!window.confirm("Remove your stored resume and its extracted matching data?")) return;
    setBusy(true);
    setError("");
    try {
      await api.delete("/auth/me/resume/");
      setProfile((current) => ({ ...current, resume_name: "", resume_uploaded_at: null, has_resume: false }));
      setNotice("Resume removed.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return <div className="container page mid">{error ? <div className="alert alert-error">{error}</div> : <div className="skeleton" />}</div>;

  return (
    <div className="container page mid">
      <div className="page-head">
        <div><h2>Your profile</h2><p className="muted">Manage your details and the resume used for job matching.</p></div>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
      {notice && <div className="alert alert-ok" style={{ marginBottom: 14 }}>{notice}</div>}

      <section className="panel stack">
        <h3>Profile details</h3>
        <form className="stack" onSubmit={saveProfile}>
          <div className="field-row">
            <div><label htmlFor="first-name">First name</label><input id="first-name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><label htmlFor="last-name">Last name</label><input id="last-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div><label htmlFor="profile-email">Email</label><input id="profile-email" type="email" value={profile.email} disabled /></div>
          {profile.role === "hirer" ? (
            <div><label htmlFor="company-name">Company</label><input id="company-name" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          ) : (
            <div><label htmlFor="headline">Professional headline</label><input id="headline" maxLength={160} placeholder="e.g. Backend engineer · Python, Django" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
          )}
          <button className="btn btn-primary" disabled={busy}>Save profile</button>
        </form>
      </section>

      {profile.role === "applicant" && (
        <section className="panel stack" style={{ marginTop: 18 }}>
          <div>
            <h3>Resume</h3>
            <p className="muted small" style={{ marginTop: 6 }}>PDF or DOCX, up to 5 MB. The original stays private; extracted text is sent to Google Gemini only when you request job matches.</p>
          </div>
          {profile.has_resume ? (
            <div className="row between wrap">
              <div><strong>{profile.resume_name}</strong><div className="muted small">Uploaded {new Date(profile.resume_uploaded_at).toLocaleDateString()}</div></div>
              <div className="row wrap">
                <button type="button" className="btn btn-outline btn-sm" onClick={downloadResume}>View / download</button>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={removeResume}>Remove</button>
              </div>
            </div>
          ) : <p className="muted">No resume uploaded.</p>}
          <form className="stack" onSubmit={uploadResume}>
            <div><label htmlFor="resume-file">{profile.has_resume ? "Replace resume" : "Upload resume"}</label><input id="resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} /></div>
            <button className="btn btn-primary" disabled={busy || !resumeFile}>{busy ? "Working…" : "Upload resume"}</button>
          </form>
        </section>
      )}
    </div>
  );
}