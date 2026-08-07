import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "@/components/Shell";
import Home from "@/pages/Home";
import ProjectsList from "@/pages/ProjectsList";
import ProjectWorkspace from "@/pages/ProjectWorkspace";
import Team from "@/pages/Team";
import Account from "@/pages/Account";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectWorkspace />} />
          <Route path="/team" element={<Team />} />
          <Route path="/account" element={<Account />} />
          {/* legacy: chat is subsumed into projects */}
          <Route path="/chat" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
