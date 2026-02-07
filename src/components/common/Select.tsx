import { type SelectHTMLAttributes, forwardRef } from 'react';
import styles from './Input.module.css'; // Reusing Input styles for consistency

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <select
          ref={ref}
          className={`${styles.input} ${error ? styles.hasError : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);
