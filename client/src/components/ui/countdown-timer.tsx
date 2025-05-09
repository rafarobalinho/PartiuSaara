import { useState, useEffect } from 'react';
import { getTimeRemaining } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: Date | string;
  onComplete?: () => void;
  isFlashPromotion?: boolean;
}

export default function CountdownTimer({ 
  endTime, 
  onComplete, 
  isFlashPromotion = false 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endTime.toString()));
  
  // Verifica se a promoção é de curta duração (≤ 72 horas)
  const isShortDuration = timeLeft.days < 3;
  
  // Aplicar estilo especial para promoções relâmpago
  const styleClass = isFlashPromotion ? "text-amber-600 font-semibold" : "text-gray-500";

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft = getTimeRemaining(endTime.toString());
      setTimeLeft(newTimeLeft);

      if (
        newTimeLeft.days === 0 && 
        newTimeLeft.hours === 0 && 
        newTimeLeft.minutes === 0 && 
        newTimeLeft.seconds === 0
      ) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  // Promoção terminada
  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <div className={`flex items-center text-xs ${styleClass}`}>
        <i className="fas fa-clock mr-1"></i>
        <span>Acabou</span>
      </div>
    );
  }
  
  // Formato de exibição para promoções de curta duração (≤ 72 horas)
  if (isShortDuration) {
    return (
      <div className={`flex items-center text-xs ${styleClass}`}>
        <i className="fas fa-clock mr-1"></i>
        <span>
          Acaba em {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {timeLeft.hours}h {formatTime(timeLeft.minutes)}m {formatTime(timeLeft.seconds)}s
        </span>
      </div>
    );
  }
  
  // Formato de exibição para promoções de longa duração (> 72 horas)
  return (
    <div className={`flex items-center text-xs ${styleClass}`}>
      <i className="fas fa-clock mr-1"></i>
      <span>
        Acaba em {timeLeft.days}d {timeLeft.hours}h {formatTime(timeLeft.minutes)}m
      </span>
    </div>
  );
}
