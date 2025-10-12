import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import * as XLSX from 'xlsx';
import '../App.css';

export default function StudentDashboard({ user }) {
  const [state, setState] = useState({
    courses: [],
    enrollments: [],
    lecturers: [],
    lecturerRatings: {},
    ratings: [],
    courseId: '',
    error: '',
    success: '',
    search: '',
  });

  const [loading, setLoading] = useState({
    courses: false,
    enrollments: false,
    lecturers: false,
    ratings: false,
  });

  const setStateField = (field, value) => setState(prev => ({ ...prev, [field]: value }));
  const setLoadingField = (field, value) => setLoading(prev => ({ ...prev, [field]: value }));

  const showMessage = (type, message, duration = 3000) => {
    setStateField(type, message);
    setTimeout(() => setStateField(type, ''), duration);
  };

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
    fetchLecturers();
    fetchRatings();
  }, []);

  const fetchCourses = async () => {
    setLoadingField('courses', true);
    try {
      const res = await api.get('/courses');
      setStateField('courses', res.data || []);
    } catch (err) {
      showMessage('error', 'Error fetching courses: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('courses', false);
    }
  };

  const fetchEnrollments = async () => {
    setLoadingField('enrollments', true);
    try {
      const res = await api.get('/enrollments');
      const myEnrollments = res.data.filter(e => e.userId === user?.id);
      setStateField('enrollments', myEnrollments);
    } catch (err) {
      showMessage('error', 'Error fetching enrollments: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('enrollments', false);
    }
  };

  const fetchLecturers = async () => {
    setLoadingField('lecturers', true);
    try {
      const [usersRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/users'),
        api.get('/courses'),
        api.get('/enrollments'),
      ]);

      const enrolledCourseIds = enrollmentsRes.data
        .filter(e => e.userId === user?.id)
        .map(e => e.courseId);

      const lecturers = coursesRes.data
        .filter(c => enrolledCourseIds.includes(c.id))
        .map(c => {
          const lecturer = usersRes.data.find(u => u.id === c.lecturerId && u.role === 'lecturer');
          if (lecturer) return { ...lecturer, courseName: c.name, courseCode: c.code, courseId: c.id };
          return null;
        })
        .filter(Boolean);

      setStateField('lecturers', lecturers);
    } catch (err) {
      showMessage('error', 'Error fetching lecturers: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('lecturers', false);
    }
  };

  const fetchRatings = async () => {
    setLoadingField('ratings', true);
    try {
      const res = await api.get('/lecturerRatings');
      setStateField('ratings', res.data.filter(r => r.userId === user?.id));
    } catch (err) {
      showMessage('error', 'Error fetching ratings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('ratings', false);
    }
  };

  const handleEnroll = async () => {
    if (!state.courseId) {
      showMessage('error', 'Please select a course to enroll');
      return;
    }

    setLoadingField('enrollments', true);
    try {
      const res = await api.get('/enrollments');
      const existing = res.data.find(
        e => e.userId === user?.id && e.courseId === Number(state.courseId)
      );

      if (existing) {
        showMessage('error', 'Already enrolled in this course');
        setLoadingField('enrollments', false);
        return;
      }

      const newEnrollment = {
        id: Date.now(),
        userId: user?.id,
        courseId: Number(state.courseId),
      };

      await api.post('/enrollments', newEnrollment);
      showMessage('success', 'Enrolled successfully');
      fetchEnrollments();
      fetchLecturers();
      setStateField('courseId', '');
    } catch (err) {
      showMessage('error', 'Error enrolling: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('enrollments', false);
    }
  };

  const downloadReports = () => {
    const workbook = XLSX.utils.book_new();
    const data = state.ratings.map(r => ({
      Lecturer: state.lecturers.find(l => l.id === r.lecturerId)?.name || '',
      Course: state.lecturers.find(l => l.id === r.lecturerId)?.courseName || '',
      Rating: r.rating,
      Comment: r.comment || '',
      Date: r.date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, ws, 'Ratings');
    XLSX.writeFile(workbook, `${user.name.replace(/\s+/g, '_')}_reports.xlsx`);
  };

  const filteredRatings = state.ratings.filter(r =>
    r.comment?.toLowerCase().includes(state.search.toLowerCase())
  );

  const { courses, enrollments, lecturers, lecturerRatings, error, success, courseId, search } = state;

  return (
    <div className="dashboard-grid" style={{ display: 'grid', gap: '1rem', padding: '1rem' }}>

      {error && <div className="auth-error" style={{ color: 'red', marginBottom: '0.5rem' }}>{error}</div>}
      {success && <div className="auth-success" style={{ color: 'green', marginBottom: '0.5rem' }}>{success}</div>}

      {/* Enroll in Course */}
      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
        <div className="card-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Course Enrollment</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={courseId}
              onChange={e => setStateField('courseId', e.target.value)}
              style={{
                width: '70%',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #ccc',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
            <button
              onClick={handleEnroll}
              style={{
                width: '28%',
                marginLeft: '2%',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Enroll
            </button>
          </div>

          <h6 style={{ marginTop: '0.5rem' }}>My Enrolled Courses:</h6>
          {enrollments.length === 0 && <p style={{ color: '#888' }}>No courses enrolled</p>}
          {enrollments.map(e => {
            const c = courses.find(course => course.id === e.courseId);
            return <div key={e.id} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #007bff', marginBottom: '0.25rem' }}>{c?.name} ({c?.code})</div>;
          })}
        </div>
      </div>

      {/* Rate Lecturers */}
      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
        <div className="card-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Rate Lecturers</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {lecturers.length === 0 && <p style={{ color: '#888' }}>No lecturers to rate</p>}
          {lecturers.map(l => (
            <div key={l.id} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ccc', marginBottom: '0.5rem' }}>
              <strong>{l.name} ({l.courseName})</strong>
              {/* Stars */}
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    onClick={() =>
                      setStateField('lecturerRatings', {
                        ...lecturerRatings,
                        [l.id]: { ...lecturerRatings[l.id], rating: star },
                      })
                    }
                    style={{
                      fontSize: '1.5rem',
                      color: star <= (lecturerRatings[l.id]?.rating || 0) ? '#ffc107' : '#ccc',
                      cursor: 'pointer',
                      transition: 'color 0.2s'
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              {/* Comment input & Submit button under stars */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Leave a comment..."
                  value={lecturerRatings[l.id]?.comment || ''}
                  onChange={e =>
                    setStateField('lecturerRatings', {
                      ...lecturerRatings,
                      [l.id]: { ...lecturerRatings[l.id], comment: e.target.value },
                    })
                  }
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ccc'
                  }}
                />
                <button
                  onClick={async () => {
                    if (!lecturerRatings[l.id]?.rating) {
                      showMessage('error', 'Please select a star rating');
                      return;
                    }
                    const newRating = {
                      id: Date.now(),
                      lecturerId: l.id,
                      userId: user.id,
                      rating: Number(lecturerRatings[l.id]?.rating),
                      comment: lecturerRatings[l.id]?.comment || '',
                      date: new Date().toISOString(),
                    };
                    try {
                      await api.post('/lecturerRatings', newRating);
                      showMessage('success', 'Rating submitted');
                      setStateField('lecturerRatings', { ...lecturerRatings, [l.id]: {} });
                      fetchRatings();
                    } catch (err) {
                      showMessage('error', 'Error submitting rating: ' + (err.response?.data?.message || err.message));
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    backgroundColor: '#ffc107',
                    cursor: 'pointer',
                    color: '#000'
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Ratings & Reports */}
      <div className="card" style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}>
        <div className="card-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>My Ratings & Reports</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              placeholder="Search comments"
              value={search}
              onChange={e => setStateField('search', e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #ccc'
              }}
            />
            <button
              onClick={downloadReports}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#28a745',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Download Excel
            </button>
          </div>
          {filteredRatings.length === 0 && <p style={{ color: '#888' }}>No ratings found</p>}
          {filteredRatings.map(r => {
            const lecturer = lecturers.find(l => l.id === r.lecturerId);
            const formattedDate = r.date ? new Date(r.date).toLocaleString() : '';
            return (
              <div key={r.id} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #6c757d', marginBottom: '0.25rem' }}>
                <strong>{lecturer?.name} ({lecturer?.courseName})</strong>: {r.rating} ★ — {r.comment || 'No comment'}
                {formattedDate && (
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>{formattedDate}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
