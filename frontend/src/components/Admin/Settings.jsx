import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Settings = () => {
  const [pinSettings, setPinSettings] = useState({
    currentPin: '123124',
    newPin: '',
    confirmPin: ''
  });

  const handlePinUpdate = (e) => {
    e.preventDefault();
    if (pinSettings.newPin !== pinSettings.confirmPin) {
      toast.error('New PIN and confirm PIN do not match');
      return;
    }
    if (pinSettings.newPin.length !== 6) {
      toast.error('PIN must be 6 digits');
      return;
    }
    toast.success('PIN updated successfully');
    setPinSettings({ ...pinSettings, newPin: '', confirmPin: '' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="settings-section"
    >
      <div className="section-header">
        <h2>
          <i className="fas fa-cog"></i> Settings
        </h2>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>
            <i className="fas fa-key"></i> PIN Configuration
          </h3>
          <form onSubmit={handlePinUpdate}>
            <div className="setting-group">
              <label>Current Application PIN</label>
              <input
                type="text"
                value={pinSettings.currentPin}
                readOnly
                disabled
              />
            </div>
            <div className="setting-group">
              <label>New PIN</label>
              <input
                type="password"
                value={pinSettings.newPin}
                onChange={(e) => setPinSettings({ ...pinSettings, newPin: e.target.value })}
                maxLength="6"
                placeholder="Enter new 6-digit PIN"
                required
              />
            </div>
            <div className="setting-group">
              <label>Confirm New PIN</label>
              <input
                type="password"
                value={pinSettings.confirmPin}
                onChange={(e) => setPinSettings({ ...pinSettings, confirmPin: e.target.value })}
                maxLength="6"
                placeholder="Confirm new PIN"
                required
              />
            </div>
            <button type="submit" className="save-btn">
              <i className="fas fa-save"></i> Update PIN
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;