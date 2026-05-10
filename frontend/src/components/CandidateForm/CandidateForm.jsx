import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../../services/api';
import ExperienceFields from './ExperienceFields';
import './CandidateForm.css';

const candidateSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  contact_number: z.string().regex(/^\d{10}$/, 'Valid 10-digit mobile number required'),
  alternate_contact: z.string().regex(/^\d{10}$/, 'Valid 10-digit mobile number').optional().or(z.literal('')),
  email_id: z.string().email('Valid email address required'),
  address: z.string().min(5, 'Address is required'),
  work_experience: z.enum(['yes', 'no']),
  company_name: z.string().optional(),
  total_experience: z.string().optional(),
  current_salary: z.string().optional(),
});

const CandidateForm = () => {
  const navigate = useNavigate();
  const [showExperience, setShowExperience] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      work_experience: 'no',
    },
  });

  const workExperience = watch('work_experience');

  useEffect(() => {
    setShowExperience(workExperience === 'yes');
  }, [workExperience]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.saveCandidateInfo(data),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Information saved successfully!');
        navigate('/test-page');
      } else {
        toast.error(data.message || 'Failed to save information');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data) => {
    saveMutation.mutate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="form-container"
    >
      <div className="form-card">
        <div className="form-header">
          <h1>
            <i className="fas fa-user-circle"></i> Candidate Information
          </h1>
          <div className="progress-steps">
            <div className="step completed">
              <i className="fas fa-check"></i>
              <span>PIN Verified</span>
            </div>
            <div className="step-line"></div>
            <div className="step active">
              <i className="fas fa-user"></i>
              <span>Information</span>
            </div>
            <div className="step-line"></div>
            <div className="step">
              <i className="fas fa-flask"></i>
              <span>Test</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="candidate-form">
          <div className="form-section">
            <h2>
              <i className="fas fa-user"></i> Personal Information
            </h2>

            <div className="form-group">
              <label htmlFor="full_name">
                Full Name <span className="required">*</span>
              </label>
              <input
                {...register('full_name')}
                type="text"
                id="full_name"
                placeholder="Enter your full name"
                className={errors.full_name ? 'error' : ''}
              />
              {errors.full_name && (
                <span className="error-message">{errors.full_name.message}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact_number">
                  Contact Number <span className="required">*</span>
                </label>
                <input
                  {...register('contact_number')}
                  type="tel"
                  id="contact_number"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={errors.contact_number ? 'error' : ''}
                />
                {errors.contact_number && (
                  <span className="error-message">{errors.contact_number.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="alternate_contact">Alternate Contact (Optional)</label>
                <input
                  {...register('alternate_contact')}
                  type="tel"
                  id="alternate_contact"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={errors.alternate_contact ? 'error' : ''}
                />
                {errors.alternate_contact && (
                  <span className="error-message">{errors.alternate_contact.message}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email_id">
                Email ID <span className="required">*</span>
              </label>
              <input
                {...register('email_id')}
                type="email"
                id="email_id"
                placeholder="Enter your email address"
                className={errors.email_id ? 'error' : ''}
              />
              {errors.email_id && (
                <span className="error-message">{errors.email_id.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="address">
                Address <span className="required">*</span>
              </label>
              <textarea
                {...register('address')}
                id="address"
                rows={3}
                placeholder="Enter your complete address"
                className={errors.address ? 'error' : ''}
              />
              {errors.address && (
                <span className="error-message">{errors.address.message}</span>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2>
              <i className="fas fa-briefcase"></i> Work Experience
            </h2>

            <div className="form-group">
              <label>Do you have work experience? <span className="required">*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input {...register('work_experience')} type="radio" value="yes" />
                  Yes
                </label>
                <label className="radio-label">
                  <input {...register('work_experience')} type="radio" value="no" />
                  No
                </label>
              </div>
            </div>

            {showExperience && (
              <ExperienceFields register={register} errors={errors} />
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="submit-btn"
            >
              {saveMutation.isPending ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-arrow-right"></i>
              )}
              Proceed to Test
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CandidateForm;