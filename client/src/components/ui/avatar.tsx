import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  fallbackClassName,
}: AvatarProps) {
  const [error, setError] = React.useState(false);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div 
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {src && !error ? (
        <img 
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <div className={cn(
          'w-full h-full bg-primary/10 flex items-center justify-center text-primary',
          fallbackClassName
        )}>
          {fallback || <i className="fas fa-user text-xl"></i>}
        </div>
      )}
    </div>
  );
}