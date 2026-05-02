import PropTypes from 'prop-types';

const Alert = ({ type = 'info', message, className = '' }) => {
  const types = {
    success: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-800 dark:text-green-300",
    error: "bg-red-100 border-red-400 text-red-700 dark:bg-red-900 dark:border-red-800 dark:text-red-300",
    info: "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-300",
  };

  if (!message) return null;

  return (
    <div className={`border px-4 py-3 rounded relative ${types[type]} ${className}`} role="alert">
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

Alert.propTypes = {
  type: PropTypes.oneOf(['success', 'error', 'info']),
  message: PropTypes.string,
  className: PropTypes.string,
};

export default Alert;
