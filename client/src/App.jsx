import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "@/components/Shell";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Team from "@/pages/Team";
import Projects from "@/pages/Projects";
import Account from "@/pages/Account";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/team" element={<Team />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
