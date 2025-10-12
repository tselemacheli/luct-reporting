import React, { useState } from 'react';
import api from '../axiosConfig';

export default function Register({onRegister}){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [role,setRole]=useState('student');
  const [err,setErr]=useState('');

  const submit=async(e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/users', { name, email, password, role });
      onRegister(res.data);
    }catch(e){setErr('Unable to register')}
  }

  return (
    <div className="form">
      <h2>Register</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      <form onSubmit={submit}>
        <div className="row"><input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="row"><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="row"><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <div className="row">
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="pl">Program Leader</option>
            <option value="prl">Principal Lecturer</option>
          </select>
        </div>
        <button className="btn" type="submit">Register</button>
      </form>
    </div>
  )
}

