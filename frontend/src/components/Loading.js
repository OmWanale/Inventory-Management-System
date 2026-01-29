import React from 'react';

const Loading = ({ size = 'md', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-primary-600 ${sizeClasses[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loading;
