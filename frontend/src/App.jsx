import Dashboard from "./components/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <header className="p-3 md:p-4 border-b border-gray-800">
          <h1 className="text-xl md:text-2xl font-bold text-center">
            ScaleSim - System Stress Dashboard
          </h1>
        </header>

        <main className="container mx-auto max-w-[1600px] px-3 md:px-4 lg:px-6 py-3 md:py-4">
          <Dashboard />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;

