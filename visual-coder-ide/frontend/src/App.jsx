import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import Editor from './components/Editor';
import './index.css'; 

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ide_token'));
  const [view, setView] = useState(token ? 'dashboard' : 'login'); 
  const [activeProject, setActiveProject] = useState(null);

  const handleLogin = (newToken) => {
    localStorage.setItem('ide_token', newToken);
    setToken(newToken);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('ide_token');
    setToken(null);
    setView('login');
    setActiveProject(null);
  };

  const handleOpenProject = (project) => {
    setActiveProject(project);
    setView('editor');
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
    setView('dashboard');
  };

  if (view === 'login') return <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />;
  if (view === 'signup') return <Signup onSwitchToLogin={() => setView('login')} />;
  
  if (view === 'dashboard') {
    return <Dashboard token={token} onLogout={handleLogout} onOpenProject={handleOpenProject} />;
  }

  if (view === 'editor') {
    return (
      <Editor 
        project={activeProject} 
        token={token} 
        onBack={handleBackToDashboard} 
      />
    );
  }

  return null;
}