import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import CopilotAssistant from '../ai/CopilotAssistant';
import { useAppContext } from '../../context/AppContext';

export default function Layout() {
  const { user } = useAppContext();

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeTab="dashboard" setActiveTab={() => {}} />
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--background-gradient)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          width: '100%',
          margin: '0 auto', 
          padding: '2rem 2.5rem',
          flex: 1
        }}>
          <Outlet />
        </div>
      </main>
      <CopilotAssistant />
    </div>
  );
}
