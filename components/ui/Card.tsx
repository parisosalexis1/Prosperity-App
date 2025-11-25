import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>}
      {children}
    </div>
  );
};