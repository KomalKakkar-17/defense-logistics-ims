import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Approve      from './pages/Approve';
import NewRequest   from './pages/NewRequest';
import Inventory    from './pages/Inventory';
import CarbonReport from './pages/CarbonReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Login />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/approve"      element={<Approve />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/inventory"    element={<Inventory />} />
        <Route path="/carbon"       element={<CarbonReport />} />
      </Routes>
    </BrowserRouter>
  );
}