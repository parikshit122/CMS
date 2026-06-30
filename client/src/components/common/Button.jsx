import "../../styles/Button.css";

export default function Button({
  children,
  className = "",
  type,
  onClick,
  ...props
}) {
  return (
    <button
      type={type ? type : "button"}
      className={`btn ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}