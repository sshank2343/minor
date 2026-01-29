import { useState } from "react";
import api from "../services/api";

function ControlPanel() {
  const [targetUrl, setTargetUrl] = useState("http://target-server:3000/healthy");
  const [users, setUsers] = useState(10);
  const [spawnRate, setSpawnRate] = useState(2);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const startTest = async () => {
    try {
      setLoading(true);
      await api.post("/start-test", {
        targetUrl,
        users,
        spawnRate,
        duration,
      });
    } catch (error) {
      console.error("Failed to start test", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Control Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          className="p-2 rounded bg-gray-700"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Target URL"
        />

        <input
          type="number"
          className="p-2 rounded bg-gray-700"
          value={users}
          onChange={(e) => setUsers(Number(e.target.value))}
          placeholder="Users"
        />

        <input
          type="number"
          className="p-2 rounded bg-gray-700"
          value={spawnRate}
          onChange={(e) => setSpawnRate(Number(e.target.value))}
          placeholder="Spawn Rate"
        />

        <input
          type="number"
          className="p-2 rounded bg-gray-700"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          placeholder="Duration (s)"
        />
      </div>

      <button
        onClick={startTest}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Test"}
      </button>
    </div>
  );
}

export default ControlPanel;
