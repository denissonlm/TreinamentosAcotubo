import { useState } from 'react';
import { UploadSection } from './components/UploadSection';
import { Dashboard } from './components/Dashboard';
import type { EmployeeStatus } from './types';
import './App.css';

function App() {
  const [data, setData] = useState<EmployeeStatus[] | null>(null);

  return (
    <div className="app-container">
      {!data ? (
        <UploadSection onDataProcessed={setData} />
      ) : (
        <Dashboard data={data} onReset={() => setData(null)} />
      )}
    </div>
  );
}

export default App;
