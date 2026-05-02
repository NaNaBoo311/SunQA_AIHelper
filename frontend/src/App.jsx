import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import DocumentUploader from './components/Upload/DocumentUploader';
import DocumentManager from './components/Documents/DocumentManager';

const Navigation = () => {
  const handleClearSession = async () => {
    if (window.confirm("Are you sure you want to clear all data and start a new session?")) {
      try {
        await fetch('http://localhost:8000/api/documents/clear', { method: 'DELETE' });
        window.location.reload();
      } catch (err) {
        console.error("Failed to clear session:", err);
      }
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-md border-b border-blue-700/50 backdrop-blur-md text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">Game QA Docs</span>
          </div>
          <div className="flex items-center">
            <button 
              onClick={handleClearSession}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              Start New Session
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 selection:bg-blue-500 selection:text-white">
      <Navigation />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
      <footer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm py-6 border-t border-blue-100 dark:border-slate-800 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="text-blue-600 dark:text-blue-400">Game QA Document Retriever System</span> &copy; 2026
      </footer>
    </div>
  );
};

const Dashboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-12">
      <DocumentUploader onUploadComplete={handleUploadComplete} />
      <div className="border-t border-blue-100 dark:border-slate-800 pt-10">
        <DocumentManager refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700',
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />
      <Layout>
        <Dashboard />
      </Layout>
    </>
  );
}

export default App;
