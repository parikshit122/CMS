/**
 * Reusable controlled Input component with optional icon support.
 * Mirrors the existing Input.jsx API expected by other components.
 */
import React from 'react';

/**
 * @param {string}   id           - Unique id for the input + label
 * @param {string}   label        - Visible label text
 * @param {string}   type         - Input type (text, email, password, …)
 * @param {string}   name         - form field name
 * @param {string}   value        - Controlled value
 * @param {function} onChange     - Change handler
 * @param {string}   placeholder  - Placeholder text
 * @param {string}   icon         - Boxicons class (e.g. "bx bxs-user")
 * @param {boolean}  required     - Whether the field is required
 * @param {string}   className    - Extra CSS classes on the wrapper
 * @param {object}   rest         - Passed straight through to <input>
 */
const Input = ({
  id,
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = '',
  icon,
  required = false,
  className = '',
  ...rest
}) => {
  return (
    <div className={`input-box ${className}`}>
      {label && (
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        {...rest}
      />
      {icon && <i className={icon} aria-hidden="true" />}
    </div>
  );
};

export default Input;
