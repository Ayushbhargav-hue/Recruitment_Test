import React from 'react';
import './PinVerification.css';
const PinPad = ({ onPinInput, onBackspace, disabled }) => {
  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace']
  ];

  const handleClick = (value) => {
    if (disabled) return;
    
    if (value === 'backspace') {
      onBackspace();
    } else if (value !== '') {
      onPinInput(value);
    }
  };

  return (
    <div className="pin-pad">
      {buttons.map((row, rowIndex) => (
        <div key={rowIndex} className="pin-pad-row">
          {row.map((btn, btnIndex) => (
            <button
              key={btnIndex}
              onClick={() => handleClick(btn)}
              disabled={disabled || btn === ''}
              className={`pin-pad-btn ${btn === 'backspace' ? 'backspace-btn' : ''}`}
            >
              {btn === 'backspace' ? <i className="fas fa-backspace"></i> : btn}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PinPad;