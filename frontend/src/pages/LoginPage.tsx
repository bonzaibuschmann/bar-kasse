import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (isLoggedIn()) {
    navigate("/config");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch<{ token: string; user: { username: string; role: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      );
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/config");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen no-select">
      <div className="w-full max-w-sm p-8 bg-bar-mid rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-bar-gold">
          🔐 Admin Login
        </h1>

        {error && (
          <div className="bg-red-900 text-white p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-bar-dark border border-gray-600 rounded-lg text-white text-lg"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-bar-dark border border-gray-600 rounded-lg text-white text-lg"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-bar-accent hover:bg-red-500 text-white rounded-lg font-bold text-lg touch-button"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Zurück zur Kasse
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Standard: siehe .env
        </p>
      </div>
    </div>
  );
}
