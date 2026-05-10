import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../services/api';
import CandidatesList from './CandidatesList';
import Settings from './Settings';
import './Admin.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.getAdminStats(),
  });

  const handleLogout = async () => {
    await api.adminLogout();
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const chartData = {
    progress: {
      labels: ['PIN Verified', 'Form Completed', 'Test Started', 'Test Completed'],
      datasets: [
        {
          label: 'Users',
          data: [
            stats?.total_pin_verified || 0,
            stats?.total_forms_completed || 0,
            stats?.total_tests_started || 0,
            stats?.total_tests_completed || 0,
          ],
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(240, 147, 251, 0.8)',
            'rgba(79, 172, 254, 0.8)',
            'rgba(67, 233, 123, 0.8)',
          ],
        },
      ],
    },
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <i className="fas fa-shield-alt"></i>
          <h3>Admin Panel</h3>
        </div>

        <div className="admin-profile">
          <i className="fas fa-user-circle"></i>
          <div>
            <h4>Administrator</h4>
            <p>Admin</p>
          </div>
        </div>

        <nav>
          <button
            className={activeSection === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveSection('dashboard')}
          >
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </button>
          <button
            className={activeSection === 'candidates' ? 'active' : ''}
            onClick={() => setActiveSection('candidates')}
          >
            <i className="fas fa-users"></i> Candidates
          </button>
          <button
            className={activeSection === 'settings' ? 'active' : ''}
            onClick={() => setActiveSection('settings')}
          >
            <i className="fas fa-cog"></i> Settings
          </button>
          <button onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        {activeSection === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="dashboard-section"
          >
            <div className="section-header">
              <h2>
                <i className="fas fa-tachometer-alt"></i> Dashboard Overview
              </h2>
              <div className="date-time">
                {new Date().toLocaleString()}
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats?.total_pin_verified || 0}</h3>
                  <p>PIN Verified</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                  <i className="fas fa-file-signature"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats?.total_forms_completed || 0}</h3>
                  <p>Forms Completed</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                  <i className="fas fa-flask"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats?.total_tests_started || 0}</h3>
                  <p>Tests Started</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-info">
                  <h3>{stats?.average_score || 'N/A'}</h3>
                  <p>Avg. Score</p>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3>Progress Overview</h3>
                <Bar data={chartData.progress} />
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'candidates' && <CandidatesList />}
        {activeSection === 'settings' && <Settings />}
      </main>
    </div>
  );
};

export default AdminDashboard;