import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', style, onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-clay-surface-solid rounded-xl border-[2.5px] border-clay-border shadow-clay p-5 transition-all duration-200 ${hover ? 'hover:shadow-clay-hover hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
