import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  icon?: ReactNode;
};

export function Input({ label, helper, icon, id, className = "", ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={["input-field", className].filter(Boolean).join(" ")}>
      {label ? <label htmlFor={inputId}>{label}</label> : null}
      <div className="input-shell">
        {icon}
        <input id={inputId} {...props} />
      </div>
      {helper ? <span className="input-helper">{helper}</span> : null}
    </div>
  );
}
