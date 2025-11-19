import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css'; // Make sure your CSS supports grid/flex for the cards

export default function PreLoginDashboard() {
  return (
    <div className="pre-dashboard">
      {/* Hero Section */}
      <div className="hero">
        
        {/* Cards Grid */}
        <div className="cards-grid">
          {/* Student Card */}
          <div className="card">
            <h3>Student</h3>
            <p>
              View enrolled classes, access lecturer reports, provide feedback, 
              and download personal report Excel files.
            </p>
          </div>

          {/* Lecturer Card */}
          <div className="card">
            <h3>Lecturer</h3>
            <p>
              Submit weekly lecture reports, mark attendance, monitor students, track feedback and ratings, 
              and export reports to Excel.
            </p>
          </div>

          {/* Program Leader (PL) Card */}
          <div className="card">
            <h3>Program Leader (PL)</h3>
            <p>
              Review lecturer reports, monitor class performance, track course progress, provide feedback, 
              and export consolidated reports.
            </p>
          </div>

          {/* Principal Lecturer (PRL) Card */}
          <div className="card">
            <h3>Principal Lecturer (PRL)</h3>
            <p>
              Oversee programs, manage lecturers and PLs, evaluate lecturer performance, provide high-level feedback, 
              and export detailed reports for analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar / Quick Links */}
      <aside className="module">
      
      </aside>
    </div>
  );
}
