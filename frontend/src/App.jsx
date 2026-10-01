import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar.jsx";
import { useAuth } from "./auth.jsx";
import Jobs from "./pages/Jobs.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PostJob from "./pages/PostJob.jsx";
import HirerDashboard from "./pages/HirerDashboard.jsx";
import Applicants from "./pages/Applicants.jsx";
import MyApplications from "./pages/MyApplications.jsx";

function Protected({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/applications" element={<Protected role="applicant"><MyApplications /></Protected>} />
          <Route path="/hirer" element={<Protected role="hirer"><HirerDashboard /></Protected>} />
          <Route path="/hirer/jobs/new" element={<Protected role="hirer"><PostJob /></Protected>} />
          <Route path="/hirer/jobs/:id/edit" element={<Protected role="hirer"><PostJob /></Protected>} />
          <Route path="/hirer/jobs/:id/applicants" element={<Protected role="hirer"><Applicants /></Protected>} />
          <Route path="*" element={<div className="container empty"><h2>Page not found</h2><p>That page does not exist.</p></div>} />
        </Routes>
      </main>
    </>
  );
}
