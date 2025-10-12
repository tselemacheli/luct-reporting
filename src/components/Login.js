import React, { useState } from 'react';
import api from '../axiosConfig';

export default function Login({onLogin}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState('');

  const submit=async(e)=>{
    e.preventDefault();
    try{
      const res = await api.get(`/users?email=${email}&password=${password}`);
      if(res.data.length===1){
        onLogin(res.data[0]);
      }else{
        setErr('Invalid credentials');
      }
    }catch(err){setErr('Server error')}
  }

  return (
    <div className="form">
      <h2>Login</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      <form onSubmit={submit}>
        <div className="row"><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="row"><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <button className="btn" type="submit">Login</button>
      </form>
    </div>
  )
}

