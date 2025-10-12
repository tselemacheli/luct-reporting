import React, { useEffect, useState } from 'react';
import api from '../axiosConfig';
import * as XLSX from 'xlsx';
import '../App.css';

const PLDashboard = ({ user }) => {
  const [state, setState] = useState({
    courses: [],
    classes: [],
    reports: [],
    lecturers: [],
    error: '',
    success: '',
    activeView: 'overview',
  });

  const [loading, setLoading] = useState({
    courses: false,
    classes: false,
    reports: false,
    lecturers: false,
    export: false,
    addCourse: false,
    addClass: false,
    assignLecturer: false,
  });

  const [pagination, setPagination] = useState({
    courses: 0,
    classes: 0,
    reports: 0,
  });

  const [newCourse, setNewCourse] = useState({ name: '', code: '', faculty_name: '' });
  const [newClass, setNewClass] = useState({ name: '', venue: '', time: '', courseId: '' });

  const itemsPerPage = 6;

  const setStateField = (field, value) => setState(prev => ({ ...prev, [field]: value }));
  const setLoadingField = (field, value) => setLoading(prev => ({ ...prev, [field]: value }));

  const showMessage = (type, message, duration = 4000) => {
    setStateField(type, message);
    setTimeout(() => setStateField(type, ''), duration);
  };

  const switchView = (view) => {
    setStateField('activeView', view);
    setPagination({ courses: 0, classes: 0, reports: 0 });
  };

  const nextPage = (type) => setPagination(prev => ({ ...prev, [type]: prev[type] + 1 }));
  const prevPage = (type) => setPagination(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
  const getPaginatedItems = (items, type) =>
    items.slice(pagination[type] * itemsPerPage, (pagination[type] + 1) * itemsPerPage);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchCourses(), fetchClasses(), fetchReports(), fetchLecturers()]);
  };

  const fetchCourses = async () => {
    setLoadingField('courses', true);
    try {
      const res = await api.get('/courses');
      setStateField('courses', res.data || []);
    } catch (err) {
      showMessage('error', 'Failed to fetch courses: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('courses', false);
    }
  };

  const fetchClasses = async () => {
    setLoadingField('classes', true);
    try {
      const res = await api.get('/classes');
      setStateField('classes', res.data || []);
    } catch (err) {
      showMessage('error', 'Failed to fetch classes: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('classes', false);
    }
  };

  const fetchReports = async () => {
    setLoadingField('reports', true);
    try {
      const res = await api.get('/reports');
      setStateField('reports', res.data || []);
    } catch (err) {
      showMessage('error', 'Failed to fetch reports: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('reports', false);
    }
  };

  const fetchLecturers = async () => {
    setLoadingField('lecturers', true);
    try {
      const res = await api.get('/users');
      const lecturers = res.data.filter(u => u.role === 'lecturer');
      setStateField('lecturers', lecturers || []);
    } catch (err) {
      showMessage('error', 'Failed to fetch lecturers: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('lecturers', false);
    }
  };

  const addCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      showMessage('error', 'Course name and code are required.');
      return;
    }
    setLoadingField('addCourse', true);
    try {
      await api.post('/courses', newCourse);
      showMessage('success', 'Course added successfully!');
      setNewCourse({ name: '', code: '', faculty_name: '' });
      fetchCourses();
    } catch (err) {
      showMessage('error', 'Failed to add course: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('addCourse', false);
    }
  };

  const addClass = async () => {
    if (!newClass.name || !newClass.venue || !newClass.time || !newClass.courseId) {
      showMessage('error', 'All class fields are required.');
      return;
    }
    setLoadingField('addClass', true);
    try {
      const classData = { ...newClass, courseId: Number(newClass.courseId) };
      await api.post('/classes', classData);
      showMessage('success', 'Class added successfully!');
      setNewClass({ name: '', venue: '', time: '', courseId: '' });
      fetchClasses();
    } catch (err) {
      showMessage('error', 'Failed to add class: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('addClass', false);
    }
  };

  const assignLecturer = async (courseId, lecturerId) => {
    if (!lecturerId) return;
    setLoadingField('assignLecturer', true);
    try {
      const selectedLecturer = state.lecturers.find(l => String(l.id) === String(lecturerId));
      await api.patch(`/courses/${courseId}`, {
        lecturerId: Number(lecturerId),
        lecturerName: selectedLecturer?.name || '',
      });
      setState(prev => ({
        ...prev,
        courses: prev.courses.map(c =>
          String(c.id) === String(courseId)
            ? { ...c, lecturerId: Number(lecturerId), lecturerName: selectedLecturer?.name }
            : c
        ),
      }));
      showMessage('success', `Lecturer ${selectedLecturer?.name} assigned successfully!`);
    } catch (err) {
      showMessage('error', 'Failed to assign lecturer: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('assignLecturer', false);
    }
  };

  const assignLecturerToClass = async (classId, lecturerId) => {
    if (!lecturerId) return;
    setLoadingField('assignLecturer', true);
    try {
      const selectedLecturer = state.lecturers.find(l => String(l.id) === String(lecturerId));
      await api.patch(`/classes/${classId}`, {
        lecturerId: Number(lecturerId),
        lecturerName: selectedLecturer?.name || '',
      });
      setState(prev => ({
        ...prev,
        classes: prev.classes.map(c =>
          String(c.id) === String(classId)
            ? { ...c, lecturerId: Number(lecturerId), lecturerName: selectedLecturer?.name }
            : c
        ),
      }));
      showMessage('success', `Lecturer ${selectedLecturer?.name} assigned to class successfully!`);
    } catch (err) {
      showMessage('error', 'Failed to assign lecturer: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('assignLecturer', false);
    }
  };

  const exportReports = async () => {
    setLoadingField('export', true);
    try {
      const res = await api.get('/reports');
      const reports = res.data || [];
      if (reports.length === 0) {
        showMessage('error', 'No reports available for export.');
        return;
      }

      const reportsWithLecturers = reports.map(r => {
        const lecturer = state.lecturers.find(l => String(l.id) === String(r.lecturerId));
        return {
          ...r,
          lecturerName: lecturer ? lecturer.name : 'Unknown Lecturer',
          Date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A',
        };
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(reportsWithLecturers);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
      XLSX.writeFile(workbook, `LUCT_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMessage('success', 'Reports exported successfully!');
    } catch (err) {
      showMessage('error', 'Failed to export reports: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('export', false);
    }
  };

  const { courses, classes, reports, lecturers, error, success, activeView } = state;

  return (
    <div className="pl-dashboard">
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      {/* Navigation */}
      <div className="view-navigation">
        <button className={`view-button ${activeView === 'overview' ? 'active' : ''}`} onClick={() => switchView('overview')}>Overview</button>
        <button className={`view-button ${activeView === 'courses' ? 'active' : ''}`} onClick={() => switchView('courses')}>Courses ({courses.length})</button>
        <button className={`view-button ${activeView === 'classes' ? 'active' : ''}`} onClick={() => switchView('classes')}>Classes ({classes.length})</button>
        <button className={`view-button ${activeView === 'reports' ? 'active' : ''}`} onClick={() => switchView('reports')}>Reports ({reports.length})</button>
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="overview-view">
          <h2>Welcome, Program Leader ({user?.name})</h2>
          <p>Manage courses, classes, and lecturers for Limkokwing University of Creative Technology.</p>
          <div className="overview-grid">
            <div className="summary-card"><i className="fas fa-book fa-2x text-primary"></i><h3>{courses.length}</h3><p>Courses Managed</p></div>
            <div className="summary-card"><i className="fas fa-chalkboard fa-2x text-warning"></i><h3>{classes.length}</h3><p>Classes Created</p></div>
            <div className="summary-card"><i className="fas fa-file-alt fa-2x text-success"></i><h3>{reports.length}</h3><p>Reports Received</p></div>
          </div>
        </div>
      )}

      {/* === COURSES === */}
      {activeView === 'courses' && (
        <div className="courses-view">
          <h2>Courses</h2>
          <div className="add-course-form" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Course Name"
              value={newCourse.name}
              onChange={e => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <input
              type="text"
              placeholder="Course Code"
              value={newCourse.code}
              onChange={e => setNewCourse(prev => ({ ...prev, code: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <input
              type="text"
              placeholder="Faculty"
              value={newCourse.faculty_name}
              onChange={e => setNewCourse(prev => ({ ...prev, faculty_name: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <button
              onClick={addCourse}
              disabled={loading.addCourse}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#28a745',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Add Course
            </button>
          </div>

          <div className="courses-grid">
            {getPaginatedItems(courses, 'courses').map(course => (
              <div className="course-card" key={course.id}>
                <h3>{course.name}</h3>
                <p><strong>Code:</strong> {course.code}</p>
                <p><strong>Faculty:</strong> {course.faculty_name || 'N/A'}</p>
                <p><strong>Lecturer:</strong> {course.lecturerName || 'Not assigned'}</p>

                <div className="assign-lecturer">
                  <select
                    value={course.lecturerId || ''}
                    onChange={e => assignLecturer(course.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #ccc'
                    }}
                  >
                    <option value="">Assign Lecturer</option>
                    {lecturers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === CLASSES === */}
      {activeView === 'classes' && (
        <div className="classes-view">
          <h2>Classes</h2>
          <div className="add-class-form" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Class Name"
              value={newClass.name}
              onChange={e => setNewClass(prev => ({ ...prev, name: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <input
              type="text"
              placeholder="Venue"
              value={newClass.venue}
              onChange={e => setNewClass(prev => ({ ...prev, venue: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <input
              type="time"
              value={newClass.time}
              onChange={e => setNewClass(prev => ({ ...prev, time: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            />
            <select
              value={newClass.courseId}
              onChange={e => setNewClass(prev => ({ ...prev, courseId: e.target.value }))}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={addClass}
              disabled={loading.addClass}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#28a745',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Add Class
            </button>
          </div>

          <div className="classes-grid">
            {getPaginatedItems(classes, 'classes').map(cls => {
              const relatedCourse = courses.find(c => String(c.id) === String(cls.courseId));
              return (
                <div className="class-card" key={cls.id}>
                  <h3>{cls.name}</h3>
                  <p><strong>Venue:</strong> {cls.venue}</p>
                  <p><strong>Time:</strong> {cls.time}</p>
                  <p><strong>Course:</strong> {relatedCourse?.name || 'N/A'}</p>
                  <p><strong>Lecturer:</strong> {cls.lecturerName || 'Not assigned'}</p>

                  <div className="assign-lecturer">
                    <select
                      value={cls.lecturerId || ''}
                      onChange={e => assignLecturerToClass(cls.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value="">Assign Lecturer</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === REPORTS === */}
      {activeView === 'reports' && (
        <div className="reports-view">
          <h2>Reports</h2>
          <button
            onClick={exportReports}
            disabled={loading.export}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#30c944ff',
              color: '#fff',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}
          >
            {loading.export ? 'Exporting...' : 'DOWNLOAD REPORTS'}
          </button>

          <div className="reports-grid">
            {getPaginatedItems(reports, 'reports').map(r => {
              const lecturer = lecturers.find(l => String(l.id) === String(r.lecturerId));
              return (
                <div className="report-card" key={r.id}>
                  <p><strong>Lecturer:</strong> {lecturer ? lecturer.name : 'Unknown Lecturer'}</p>
                  {/* Removed Class and Report lines */}
                  <p><strong>Date:</strong> {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PLDashboard;
