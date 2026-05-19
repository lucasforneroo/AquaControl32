import React from 'react';
import './TemperatureControl.css';

const TemperatureControl = ({ temperature, onIncrease, onDecrease }) => {
  return (
    <div className="temperature-control">
      <div className="control-buttons">
        {/* Botón de incremento con triángulo hacia arriba */}
        <button 
          className="control-btn control-btn--up" 
          onClick={onIncrease}
          aria-label="Aumentar temperatura"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8L6 16H18L12 8Z" fill="currentColor"/>
          </svg>
        </button>

        {/* Botón de decremento con triángulo hacia abajo */}
        <button 
          className="control-btn control-btn--down" 
          onClick={onDecrease}
          aria-label="Disminuir temperatura"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 16L18 8H6L12 16Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* Display de temperatura */}
      <div className="temperature-display">
        <span className="temperature-value">{temperature} °C</span>
      </div>
    </div>
  );
};

export default TemperatureControl;