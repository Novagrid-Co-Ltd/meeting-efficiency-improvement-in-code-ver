import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import ProjectList from "./pages/ProjectList";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import CriteriaEditor from "./pages/CriteriaEditor";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`text-sm no-underline px-3 py-1 rounded ${
        isActive
          ? "bg-blue-100 text-blue-700 font-medium"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <Link
          to="/projects"
          className="text-xl font-bold text-gray-900 no-underline"
        >
          PJ Hub
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/criteria">採点軸</NavLink>
        </nav>
      </header>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/criteria" element={<CriteriaEditor />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
