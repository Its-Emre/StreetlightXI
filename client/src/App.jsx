import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerForm from "./pages/PlayerForm";
import PlayerPage from "./pages/PlayerPage";
import Teams from "./pages/Teams";
import Auctions from "./pages/Auctions";
import AuctionRoom from "./pages/AuctionRoom";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-display text-2xl font-black italic text-ink-500">
          STREETLIGHT <span className="text-flood-500">XI</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const onAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-ink-950">
      {user && !onAuthPage && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
        <Route
          path="/players"
          element={
            <Protected>
              <Players />
            </Protected>
          }
        />
        <Route
          path="/players/new"
          element={
            <Protected>
              <PlayerForm />
            </Protected>
          }
        />
        <Route
          path="/players/:id"
          element={
            <Protected>
              <PlayerPage />
            </Protected>
          }
        />
        <Route
          path="/players/:id/edit"
          element={
            <Protected>
              <PlayerForm />
            </Protected>
          }
        />
        <Route
          path="/teams"
          element={
            <Protected>
              <Teams />
            </Protected>
          }
        />
        <Route
          path="/auctions"
          element={
            <Protected>
              <Auctions />
            </Protected>
          }
        />
        <Route
          path="/auctions/:id"
          element={
            <Protected>
              <AuctionRoom />
            </Protected>
          }
        />
        <Route
          path="/settings"
          element={
            <Protected>
              <Settings />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
