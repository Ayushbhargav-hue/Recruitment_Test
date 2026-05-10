import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CandidatesList = () => {
  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => api.getCandidates(),
  });

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <i className="fas fa-exclamation-circle"></i>
        <p>Failed to load candidates</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="candidates-section"
    >
      <div className="section-header">
        <h2>
          <i className="fas fa-users"></i> Candidate Management
        </h2>
      </div>

      <div className="table-responsive">
        <table className="candidates-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates?.map((candidate, index) => (
              <tr key={candidate.id}>
                <td>{index + 1}</td>
                <td>{candidate.full_name || 'N/A'}</td>
                <td>{candidate.contact_number || 'N/A'}</td>
                <td>{candidate.email_id || 'N/A'}</td>
                <td>
                  <span className={`status-badge status-${candidate.status?.toLowerCase().replace(/\s/g, '-')}`}>
                    {candidate.status || 'Pending'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn view-btn">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default CandidatesList;