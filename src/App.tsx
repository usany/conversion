import { Route, Routes } from 'react-router-dom';
import { ConverterPage } from '@/components/ConverterPage';
import '@/app/globals.css';

export default function App() {
  return (
    <div className="bg-slate-100 text-slate-900 antialiased min-h-screen">
      <Routes>
        <Route path="/" element={<ConverterPage />} />
      </Routes>
    </div>
  );
}
