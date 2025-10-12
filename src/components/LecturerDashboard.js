import React, { useEffect, useState } from 'react';
import api from '../axiosConfig';
import * as XLSX from 'xlsx';
import '../App.css';

const LecturerDashboard = ({ user }) => {
  const [state, setState] = useState({
    courses: [],
    students: {},         // { courseId: [{id, name}] }
    reports: [],
    ratings: [],          // from lecturerRatings
    expandedReports: {},
    error: '',
    loading: false,
  });

  const [report, setReport] = useState({
    courseId: '',
    courseName: '',
    week: '',
    date: '',
    topic: '',
    venue: '',
    time: '',
    outcomes: '',
    recommendations: '',
    presentStudents: []
  });

  const setStateField = (field, value) => setState(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    fetchData();
    fetchReports();
    fetchRatings();
  }, []);

  // Fetch courses, students
  const fetchData = async () => {
    try {
      const [coursesRes, enrollRes, usersRes] = await Promise.all([
        api.get('/courses'),
        api.get('/enrollments'),
        api.get('/users')
      ]);

      const studentsMap = {};
      enrollRes.data.forEach(enr => {
        const studentUser = usersRes.data.find(u => u.id === enr.userId);
        const studentName = studentUser?.name || `Student ${enr.userId}`;
        if (!studentsMap[enr.courseId]) studentsMap[enr.courseId] = [];
        studentsMap[enr.courseId].push({ id: enr.userId, name: studentName });
      });

      setState(prev => ({
        ...prev,
        courses: coursesRes.data || [],
        students: studentsMap
      }));
    } catch (err) {
      setStateField('error', 'Error fetching data: ' + (err.response?.data?.message || err.message));
    }
  };

  // Fetch only this lecturer's reports
  const fetchReports = async () => {
    try {
      const res = await api.get('/reports'); // get all reports
      const lecturerReports = res.data.filter(r => r.lecturerId === user.id);
      setStateField('reports', lecturerReports || []);
    } catch (err) {
      setStateField('error', 'Error fetching reports: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchRatings = async () => {
    try {
      const res = await api.get('/lecturerRatings');
      setStateField('ratings', res.data.filter(r => r.lecturerId === user.id));
    } catch (err) {
      setStateField('error', 'Error fetching ratings: ' + (err.response?.data?.message || err.message));
    }
  };

  const submitReport = async () => {
    if (!report.courseId || !report.topic || !report.date) {
      alert('Please fill all required fields (Course, Topic, Date)');
      return;
    }

    setStateField('loading', true);
    try {
      const res = await api.post('/reports', {
        ...report,
        lecturerId: user.id,
        present: report.presentStudents.length,
        total: state.students[report.courseId]?.length || 0,
        createdAt: new Date().toISOString()
      });

      const reportId = res.data.id;

      // Send attendance records individually to prevent 500 error
      for (const studentId of report.presentStudents) {
        await api.post('/attendance', {
          reportId,
          studentId,
          courseId: report.courseId,
          date: report.date,
          status: 'present'
        });
      }

      alert('Report and attendance submitted successfully!');
      fetchReports();
      resetReport();
    } catch (err) {
      setStateField('error', 'Error submitting report: ' + (err.response?.data?.message || err.message));
    } finally {
      setStateField('loading', false);
    }
  };

  const resetReport = () => {
    setReport({
      courseId: '',
      courseName: '',
      week: '',
      date: '',
      topic: '',
      venue: '',
      time: '',
      outcomes: '',
      recommendations: '',
      presentStudents: []
    });
  };

  const toggleReportDetails = (id) => {
    setState(prev => ({
      ...prev,
      expandedReports: { ...prev.expandedReports, [id]: !prev.expandedReports[id] }
    }));
  };

  const handleAttendanceToggle = (studentId) => {
    const current = report.presentStudents;
    setReport(prev => ({
      ...prev,
      presentStudents: current.includes(studentId)
        ? current.filter(id => id !== studentId)
        : [...current, studentId]
    }));
  };

  const downloadReports = () => {
    const workbook = XLSX.utils.book_new();

    const wsReports = XLSX.utils.json_to_sheet(
      state.reports.map(r => ({
        Course: state.courses.find(c => c.id === r.courseId)?.name || '',
        Week: r.week,
        Date: r.date,
        Topic: r.topic,
        Venue: r.venue,
        Time: r.time,
        Outcomes: r.outcomes,
        Recommendations: r.recommendations,
        Present: r.present,
        Total: r.total
      }))
    );

    XLSX.utils.book_append_sheet(workbook, wsReports, 'Reports');

    const wsRatings = XLSX.utils.json_to_sheet(
      state.ratings.map(r => ({
        Student: r.studentName,
        Course: state.courses.find(c => c.id === r.courseId)?.name || '',
        Rating: r.rating,
        Comment: r.comment
      }))
    );

    XLSX.utils.book_append_sheet(workbook, wsRatings, 'Ratings');

    XLSX.writeFile(workbook, `${user.name.replace(/\s+/g,'_')}_dashboard.xlsx`);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
      {state.error && <div style={{ color: 'red', marginBottom: '0.5rem', width: '100%' }}>{state.error}</div>}

      {/* Left Column: Submit Report */}
      <div style={{ flex: 1, minWidth: '350px' }}>
        <div style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Submit Lecture Report</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <select
              value={report.courseId}
              onChange={(e) => {
                const selectedCourse = state.courses.find(c => c.id == e.target.value);
                setReport(prev => ({
                  ...prev,
                  courseId: selectedCourse?.id || '',
                  courseName: selectedCourse?.name || '',
                  presentStudents: []
                }));
              }}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            >
              <option value="">Select Course</option>
              {state.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input type="text" placeholder="Week of Reporting" value={report.week} onChange={e => setReport(prev => ({ ...prev, week: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <input type="date" value={report.date} onChange={e => setReport(prev => ({ ...prev, date: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <input type="text" placeholder="Topic" value={report.topic} onChange={e => setReport(prev => ({ ...prev, topic: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <input type="text" placeholder="Venue" value={report.venue} onChange={e => setReport(prev => ({ ...prev, venue: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <input type="time" value={report.time} onChange={e => setReport(prev => ({ ...prev, time: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <textarea placeholder="Learning Outcomes" value={report.outcomes} onChange={e => setReport(prev => ({ ...prev, outcomes: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>
            <textarea placeholder="Recommendations" value={report.recommendations} onChange={e => setReport(prev => ({ ...prev, recommendations: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}/>

            {/* Attendance */}
            {report.courseId && state.students[report.courseId] && (
              <div>
                <p><strong>Mark Attendance:</strong></p>
                {state.students[report.courseId].map(student => (
                  <label key={student.id} style={{ display: 'block' }}>
                    <input type="checkbox" checked={report.presentStudents.includes(student.id)} onChange={() => handleAttendanceToggle(student.id)} />
                    {student.name}
                  </label>
                ))}
                <p>Present: {report.presentStudents.length} / {state.students[report.courseId].length}</p>
              </div>
            )}

            <button onClick={submitReport} disabled={state.loading} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }}>
              {state.loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Previous Reports & Ratings */}
      <div style={{ flex: 1, minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Previous Reports */}
        <div style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            My Previous Reports
            <button onClick={downloadReports} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', backgroundColor: '#28a745', color: '#fff', cursor: 'pointer' }}>Export Excel</button>
          </div>
          <div>
            {state.reports.length === 0 && <p style={{ color: '#888' }}>No reports submitted yet</p>}
            {state.reports.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{state.courses.find(c => c.id === r.courseId)?.name}</strong> - Week {r.week} | {r.date}
                  </div>
                  <button onClick={() => toggleReportDetails(r.id)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }}>
                    {state.expandedReports[r.id] ? 'Hide' : 'View'}
                  </button>
                </div>
                {state.expandedReports[r.id] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p><strong>Topic:</strong> {r.topic}</p>
                    <p><strong>Venue:</strong> {r.venue}</p>
                    <p><strong>Time:</strong> {r.time}</p>
                    <p><strong>Outcomes:</strong> {r.outcomes}</p>
                    <p><strong>Recommendations:</strong> {r.recommendations}</p>
                    <p><strong>Attendance:</strong> {r.present}/{r.total}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ratings */}
        <div style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Student Feedback & Ratings</div>
          <div>
            {state.ratings.length === 0 && <p style={{ color: '#888' }}>No feedback yet</p>}
            {state.ratings.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                <strong>{r.studentName}</strong> {state.courses.find(c => c.id === r.courseId)?.name}: {r.rating} ★ — {r.comment}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
