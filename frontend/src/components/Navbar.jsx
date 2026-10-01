import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header className="nav">
      <div className="container">
        <Link to="/" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          Hirelane
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Find jobs</NavLink>
          {user?.role === "applicant" && <NavLink to="/applications">My applications</NavLink>}
          {user?.role === "hirer" && <NavLink to="/hirer">My jobs</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              {user.role === "hirer" && (
                <Link to="/hirer/jobs/new" className="btn btn-primary btn-sm">Post a job</Link>
              )}
              <span className="avatar" title={user.email}>{initials}</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
