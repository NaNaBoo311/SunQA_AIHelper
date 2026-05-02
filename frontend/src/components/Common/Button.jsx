import PropTypes from 'prop-types';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, ...props }) => {
  const baseStyle = "px-4 py-2 rounded font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/40 focus:ring-blue-500 transition-all duration-300 transform hover:-translate-y-0.5",
    success: "bg-green-600 text-white shadow-md shadow-green-500/20 hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/40 focus:ring-green-500 transition-all duration-300 transform hover:-translate-y-0.5",
    danger: "bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/40 focus:ring-red-500 transition-all duration-300 transform hover:-translate-y-0.5",
    secondary: "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 focus:ring-blue-500 dark:bg-slate-800 dark:text-blue-100 dark:border-slate-700 dark:hover:bg-slate-700 transition-all duration-300",
    ghost: "bg-transparent text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-all duration-300"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'success', 'danger', 'secondary', 'ghost']),
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export default Button;
