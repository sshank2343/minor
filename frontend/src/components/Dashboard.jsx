import ControlPanel from "./ControlPanel";
import MetricsChart from "./MetricsChart";
import SystemHealth from "./SystemHealth";
import LogTerminal from "./LogTerminal";

function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Control Panel */}
      <div className="lg:col-span-3">
        <ControlPanel />
      </div>

      {/* Metrics */}
      <div className="lg:col-span-2">
        <MetricsChart />
      </div>

      {/* System Health */}
      <div>
        <SystemHealth />
      </div>

      {/* Logs */}
      <div className="lg:col-span-3">
        <LogTerminal />
      </div>
    </div>
  );
}

export default Dashboard;
