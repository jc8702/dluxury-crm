import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DluxChat from '../ai/DluxChat';

export default function Layout() {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
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
      <DluxChat />
    </div>
  );
}
