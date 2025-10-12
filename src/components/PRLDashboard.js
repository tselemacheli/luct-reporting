import React, { useEffect, useState } from 'react';
import api from '../axiosConfig';
import * as XLSX from 'xlsx';
import '../App.css';

export default function PRLDashboard({ user }) {
  const [state, setState] = useState({
    reports: [],
    courses: [],
    classes: [],
    lecturerRatings: [],
    feedback: {},
    error: '',
    success: '',
    activeTab: 'reports',
    expandedItems: {
      reports: {},
      courses: {},
      classes: {},
      ratings: {},
    },
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState({
    reports: false,
    courses: false,
    classes: false,
    ratings: false,
    feedback: false,
    export: false,
    users: false,
  });

  const [pagination, setPagination] = useState({
    reports: 0,
    courses: 0,
    classes: 0,
    ratings: 0,
  });

  const itemsPerPage = 4;

  // --- Utility Functions ---
  const setStateField = (field, value) => setState(prev => ({ ...prev, [field]: value }));
  const setLoadingField = (field, value) => setLoading(prev => ({ ...prev, [field]: value }));

  const showMessage = (type, message, duration = 5000) => {
    setStateField(type, message);
    setTimeout(() => setStateField(type, ''), duration);
  };

  const toggleTab = (tabName) => setStateField('activeTab', tabName);

  const toggleExpand = (section, itemId) => {
    setStateField('expandedItems', {
      ...state.expandedItems,
      [section]: {
        ...state.expandedItems[section],
        [itemId]: !state.expandedItems[section][itemId],
      },
    });
  };

  const nextPage = (type) => setPagination(prev => ({ ...prev, [type]: prev[type] + 1 }));
  const prevPage = (type) => setPagination(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));

  const getPaginatedItems = (items, type) => {
    const start = pagination[type] * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString();
  };

  // --- Fetch Functions ---
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchReports(),
      fetchCourses(),
      fetchClasses(),
      fetchLecturerRatings(),
      fetchUsers()
    ]);
  };

  const fetchReports = async () => {
    setLoadingField('reports', true);
    try {
      const res = await api.get('/reports');
      setStateField('reports', res.data || []);
    } catch (err) {
      showMessage('error', 'Error fetching reports: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('reports', false);
    }
  };

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

  const fetchClasses = async () => {
    setLoadingField('classes', true);
    try {
      const res = await api.get('/classes');
      setStateField('classes', res.data || []);
    } catch (err) {
      showMessage('error', 'Error fetching classes: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('classes', false);
    }
  };

  const fetchLecturerRatings = async () => {
    setLoadingField('ratings', true);
    try {
      const res = await api.get('/lecturerRatings');
      setStateField('lecturerRatings', Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showMessage('error', 'Error fetching lecturer ratings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('ratings', false);
    }
  };

  const fetchUsers = async () => {
    setLoadingField('users', true);
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showMessage('error', 'Error fetching users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('users', false);
    }
  };

  // --- Helpers ---
  const getLecturerName = (lecturerId) => {
    if (!lecturerId) return 'N/A';
    const lecturer = users.find(u => (String(u.id) === String(lecturerId) || String(u._id) === String(lecturerId)) && u.role === 'lecturer');
    return lecturer ? lecturer.name || lecturer.fullName || 'Unnamed Lecturer' : 'N/A';
  };

  const getCourseName = (courseIdOrName) => {
    if (!courseIdOrName) return 'N/A';
    const course = state.courses.find(
      c =>
        String(c.id) === String(courseIdOrName) ||
        String(c._id) === String(courseIdOrName) ||
        c.name === courseIdOrName
    );
    return course ? course.name || 'Unnamed Course' : 'N/A';
  };

  const getClassName = (classId) => {
    if (!classId) return 'N/A';
    const cls = state.classes.find(c => String(c.id) === String(classId) || String(c._id) === String(classId));
    return cls ? cls.name || 'Unnamed Class' : 'N/A';
  };

  const getUserName = (userId) => {
    if (!userId) return 'N/A';
    const user = users.find(u => String(u.id) === String(userId) || String(u._id) === String(userId));
    return user ? user.name || user.fullName || 'Unnamed User' : 'N/A';
  };

  // --- Feedback Functions ---
  const handleFeedbackChange = (reportId, value) => {
    setStateField('feedback', { ...state.feedback, [reportId]: value });
  };

  const submitFeedback = async (reportId) => {
    const feedbackText = state.feedback[reportId]?.trim();
    if (!feedbackText) {
      showMessage('error', 'Please provide feedback before submitting');
      return;
    }

    setLoadingField('feedback', true);
    try {
      await api.patch(`/reports/${reportId}`, { feedback: feedbackText });
      showMessage('success', 'Feedback submitted successfully');
      setStateField('feedback', { ...state.feedback, [reportId]: '' });
      fetchReports();
    } catch (err) {
      showMessage('error', 'Error submitting feedback: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingField('feedback', false);
    }
  };

  // --- Export Function ---
  const exportExcel = (data, filename, sheetName = 'Sheet1') => {
    if (!data || data.length === 0) {
      showMessage('error', 'No data to export');
      return;
    }
    setLoadingField('export', true);
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);
      showMessage('success', `${filename} downloaded successfully`);
    } catch (err) {
      showMessage('error', 'Error exporting Excel: ' + err.message);
    } finally {
      setLoadingField('export', false);
    }
  };

  const { reports, courses, classes, lecturerRatings, feedback, activeTab, expandedItems, error, success } = state;

  return (
    <div className="prl-dashboard">
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => toggleTab('reports')}>
          Reports ({reports.length})
        </button>
        <button className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => toggleTab('courses')}>
          Courses ({courses.length})
        </button>
        <button className={`tab-button ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => toggleTab('classes')}>
          Classes ({classes.length})
        </button>
        <button className={`tab-button ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => toggleTab('ratings')}>
          Ratings ({lecturerRatings.length})
        </button>
      </div>

      {/* --- Reports Tab --- */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          <button
            className="btn btn-success"
            onClick={() =>
              exportExcel(
                reports.map(r => ({
                  Course: getCourseName(r.courseName),
                  Topic: r.topic || 'N/A',
                  Date: formatDate(r.date),
                  SubmittedBy: getLecturerName(r.lecturerId),
                  Feedback: r.feedback || 'No feedback',
                })),
                `reports_${new Date().toISOString().split('T')[0]}.xlsx`,
                'Reports'
              )
            }
            disabled={loading.export}
          >
            {loading.export ? 'Exporting...' : 'Export Reports to Excel'}
          </button>

          {loading.reports ? (
            <p>Loading reports...</p>
          ) : reports.length > 0 ? (
            <div className="cards-grid">
              {getPaginatedItems(reports, 'reports').map(r => (
                <div key={r.id} className="info-card">
                  <div className="card-header">
                    <strong>Course:</strong> {getCourseName(r.courseName)}
                  </div>
                  <div className="card-content">
                    <p><strong>Topic:</strong> {r.topic || 'N/A'}</p>
                    <p><strong>Date:</strong> {formatDate(r.date)}</p>
                    <p><strong>Submitted By:</strong> {getLecturerName(r.lecturerId)}</p>
                    {r.feedback && <p><strong>Previous Feedback:</strong> {r.feedback}</p>}
                  </div>
                  <div className="card-footer">
                    <button className="btn small" onClick={() => toggleExpand('reports', r.id)}>
                      {expandedItems.reports[r.id] ? 'Hide Feedback' : 'Add Feedback'}
                    </button>
                  </div>
                  {expandedItems.reports[r.id] && (
                    <div className="feedback-section">
                      <textarea
                        placeholder="Provide feedback..."
                        value={feedback[r.id] || ''}
                        onChange={e => handleFeedbackChange(r.id, e.target.value)}
                        rows={3}
                        disabled={loading.feedback}
                      />
                      <button
                        className="btn small"
                        onClick={() => submitFeedback(r.id)}
                        disabled={loading.feedback || !feedback[r.id]?.trim()}
                      >
                        Submit Feedback
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No reports available.</p>
          )}
        </div>
      )}

      {/* --- Courses Tab --- */}
      {activeTab === 'courses' && (
        <div className="tab-content">
          <button
            className="btn btn-success"
            onClick={() =>
              exportExcel(
                courses.map(c => ({
                  Name: c.name || 'N/A',
                  Code: c.code || 'N/A',
                  Faculty: c.faculty_name || 'N/A',
                })),
                `courses_${new Date().toISOString().split('T')[0]}.xlsx`,
                'Courses'
              )
            }
            disabled={loading.export}
          >
            {loading.export ? 'Exporting...' : 'Export Courses to Excel'}
          </button>

          {loading.courses ? (
            <p>Loading courses...</p>
          ) : courses.length > 0 ? (
            <div className="cards-grid">
              {getPaginatedItems(courses, 'courses').map(c => (
                <div key={c.id} className="info-card">
                  <div className="card-header">{c.name}</div>
                  <div className="card-content">
                    <div>Code: {c.code}</div>
                    <div>Faculty: {c.faculty_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No courses available.</p>
          )}
        </div>
      )}

      {/* --- Classes Tab --- */}
      {activeTab === 'classes' && (
        <div className="tab-content">
          <button
            className="btn btn-success"
            onClick={() =>
              exportExcel(
                classes.map(cl => ({
                  Name: cl.name || 'N/A',
                  Lecturer: cl.lecturer_name || cl.lecturerName || 'Unassigned',
                  Course: getCourseName(cl.course_id || cl.courseId),
                })),
                `classes_${new Date().toISOString().split('T')[0]}.xlsx`,
                'Classes'
              )
            }
            disabled={loading.export}
          >
            {loading.export ? 'Exporting...' : 'Export Classes to Excel'}
          </button>

          {loading.classes ? (
            <p>Loading classes...</p>
          ) : classes.length > 0 ? (
            <div className="cards-grid">
              {getPaginatedItems(classes, 'classes').map(cl => (
                <div key={cl.id} className="info-card">
                  <div className="card-header">{cl.name || 'Unnamed Class'}</div>
                  <div className="card-content">
                    <p><strong>Lecturer:</strong> {cl.lecturer_name || cl.lecturerName || 'Unassigned'}</p>
                    <p><strong>Course:</strong> {getCourseName(cl.course_id || cl.courseId)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No classes available.</p>
          )}
        </div>
      )}

      {/* --- Ratings Tab --- */}
      {activeTab === 'ratings' && (
        <div className="tab-content">
          <button
            className="btn btn-success"
            onClick={() =>
              exportExcel(
                lecturerRatings.map(r => ({
                  Lecturer: getLecturerName(r.lecturerId || r.lecturer_id),
                  'Rated By': getUserName(r.userId), // updated to use userId
                  Rating: r.rating || 0,
                  Comment: r.comment || '',
                })),
                `ratings_${new Date().toISOString().split('T')[0]}.xlsx`,
                'Ratings'
              )
            }
            disabled={loading.export}
          >
            {loading.export ? 'Exporting...' : 'Export Ratings to Excel'}
          </button>

          {loading.ratings ? (
            <p>Loading ratings...</p>
          ) : lecturerRatings.length > 0 ? (
            <div className="cards-grid">
              {getPaginatedItems(lecturerRatings, 'ratings').map(r => (
                <div key={r.id} className="info-card">
                  <div className="card-header">{getLecturerName(r.lecturerId || r.lecturer_id)}</div>
                  <div className="card-content">
                    <p><strong>Rated By:</strong> {getUserName(r.userId)}</p> {/* updated */}
                    <p><strong>Rating:</strong> {'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</p>
                    {r.comment && <p><strong>Comment:</strong> {r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No ratings available.</p>
          )}
        </div>
      )}
    </div>
  );
}
