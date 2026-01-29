import { useEffect, useRef, useState } from "react";
import useSocket from "../hooks/useSocket";

function LogTerminal() {
  const socket = useSocket();
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("telemetry", (data) => {
      const logLine = `[${new Date().toLocaleTimeString()}] latency=${data.latency_ms}ms status=${data.status_code}`;

      setLogs((prev) => [...prev.slice(-50), logLine]);
    });

    return () => {
      socket.off("telemetry");
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-black text-green-400 font-mono p-4 rounded-lg h-64 overflow-y-auto shadow">
      <h2 className="text-lg font-semibold text-white mb-2">
        Live Log Terminal
      </h2>

      {logs.map((log, index) => (
        <div key={index}>{log}</div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

export default LogTerminal;
