import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PreLoginDashboard from './components/PreLoginDashboard';
import Login from './components/Login';
import Register from './components/Register';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import PLDashboard from './components/PLDashboard';
import PRLDashboard from './components/PRLDashboard';

function App(){
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(()=>{
    const raw = localStorage.getItem('luct_user');
    if(raw) setUser(JSON.parse(raw));
  },[]);

  const logout = ()=>{
    localStorage.removeItem('luct_user');
    setUser(null);
    navigate('/');
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">Limkokwing University</div>
        <nav>
          {!user && <Link to="/">Home</Link>}
          {!user && <Link to="/login">Login</Link>}
          {!user && <Link to="/register">Register</Link>}
          {user && <span className="welcome">Welcome, {user.name} ({user.role})</span>}
          {user && <button className="btn small" onClick={logout}>Logout</button>}
        </nav>
      </header>

      <main className="main-container">
        <Routes>
          <Route path="/" element={<PreLoginDashboard />} />
          <Route path="/login" element={<Login onLogin={(u)=>{setUser(u); localStorage.setItem('luct_user', JSON.stringify(u)); navigate(`/dashboard/${u.role}`);}}/>} />
          <Route path="/register" element={<Register onRegister={(u)=>{setUser(u); localStorage.setItem('luct_user', JSON.stringify(u)); navigate(`/dashboard/${u.role}`);}}/>} />

          <Route path="/dashboard/student" element={<StudentDashboard user={user} />} />
          <Route path="/dashboard/lecturer" element={<LecturerDashboard user={user} />} />
          <Route path="/dashboard/pl" element={<PLDashboard user={user} />} />
          <Route path="/dashboard/prl" element={<PRLDashboard user={user} />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div>© {new Date().getFullYear()} Limkokwing University Of Creative Technology</div>
      </footer>
    </div>
  )
}

export default App;

