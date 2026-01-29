import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-center">
          ScaleSim - System Stress Dashboard
        </h1>
      </header>

      <main className="p-4">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;

