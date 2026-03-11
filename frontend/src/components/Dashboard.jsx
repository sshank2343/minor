import ControlPanel from "./ControlPanel";
import MetricsChart from "./MetricsChart";
import SystemHealth from "./SystemHealth";
import LogTerminal from "./LogTerminal";
import AIReport from "./AIReport";

function Dashboard() {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Control Panel */}
      <div>
        <ControlPanel />
      </div>

      {/* Main Content: Metrics and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Metrics */}
        <div className="lg:col-span-2">
          <MetricsChart />
        </div>

        {/* System Health + Live Telemetry Stream in right column */}
        <div className="flex flex-col space-y-3 md:space-y-4">
          <SystemHealth />
          <div className="flex-1">
            <LogTerminal />
          </div>
        </div>
      </div>

      {/* AI Report */}
      {/* <div className="lg:col-span-3">
        <AIReport />
      </div> */}
    </div>
  );
}

export default Dashboard;
