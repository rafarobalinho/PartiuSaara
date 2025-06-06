
import React from 'react';
import { cn } from '@/lib/utils';

interface StyledElementProps {
  children?: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  src?: string;
  alt?: string;
  [key: string]: any;
}

/**
 * Componente estilizado com configurações CSS específicas
 * Adapta estilos CSS customizados para uso em React/TypeScript
 */
export const StyledElement: React.FC<StyledElementProps> = ({
  children,
  className = '',
  as: Component = 'div',
  src,
  alt,
  ...props
}) => {
  const baseStyles = {
    margin: '0px',
    padding: '0px',
    alignSelf: 'unset',
    display: 'block',
    width: '50%',
    maxWidth: 'unset',
    minWidth: 'unset',
    height: 'auto',
    maxHeight: 'unset',
    minHeight: 'unset',
    background: 'none',
    borderRadius: '16px',
    zIndex: 'unset',
  };

  const componentProps = {
    style: baseStyles,
    className: cn('styled-element', className),
    ...props,
  };

  // Se for uma imagem, incluir src e alt
  if (Component === 'img' && src) {
    return <Component {...componentProps} src={src} alt={alt} />;
  }

  return <Component {...componentProps}>{children}</Component>;
};

// Componente específico para imagens
export const StyledImage: React.FC<Omit<StyledElementProps, 'as'> & { src: string; alt?: string }> = ({
  src,
  alt = '',
  className,
  ...props
}) => {
  return (
    <StyledElement
      as="img"
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default StyledElement;
