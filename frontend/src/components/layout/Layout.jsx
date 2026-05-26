import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
