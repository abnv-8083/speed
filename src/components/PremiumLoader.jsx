import React from 'react';
import './PremiumLoader.css';

const PremiumLoader = ({ text = "Loading..." }) => {
  return (
    <div className="premium-loader-container">
      <div className="premium-loader-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-center">
          <div className="spinner-bolt">⚡</div>
        </div>
      </div>
      <div className="premium-loader-text">{text}</div>
    </div>
  );
};

export default PremiumLoader;
