import React from 'react';
import './PremiumLoader.css';

const PremiumLoader = ({ text = "Loading..." }) => {
  return (
    <div className="premium-loader-container">
      <div className="ios-spinner">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="ios-spinner-blade"></div>
        ))}
      </div>
      {text && <div className="premium-loader-text">{text}</div>}
    </div>
  );
};

export default PremiumLoader;
