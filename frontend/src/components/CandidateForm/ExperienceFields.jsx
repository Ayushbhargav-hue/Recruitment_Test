import React from 'react';

const ExperienceFields = ({ register, errors }) => {
  return (
    <div className="experience-fields">
      <div className="form-group">
        <label htmlFor="company_name">Company Name</label>
        <input
          {...register('company_name')}
          type="text"
          id="company_name"
          placeholder="Enter company name"
          className={errors.company_name ? 'error' : ''}
        />
        {errors.company_name && (
          <span className="error-message">{errors.company_name.message}</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="total_experience">Total Experience (Years)</label>
          <input
            {...register('total_experience')}
            type="number"
            id="total_experience"
            placeholder="e.g., 2.5"
            step="0.5"
            min="0"
            className={errors.total_experience ? 'error' : ''}
          />
          {errors.total_experience && (
            <span className="error-message">{errors.total_experience.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="current_salary">Current Salary (₹)</label>
          <input
            {...register('current_salary')}
            type="number"
            id="current_salary"
            placeholder="e.g., 50000"
            step="1000"
            min="0"
            className={errors.current_salary ? 'error' : ''}
          />
          {errors.current_salary && (
            <span className="error-message">{errors.current_salary.message}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperienceFields;