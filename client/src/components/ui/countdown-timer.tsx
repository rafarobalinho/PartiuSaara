import { useState, useEffect } from 'react';
import { getTimeDifference } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: Date;
  onComplete?: () => void;
}

export default function CountdownTimer({ endTime, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeDifference(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft = getTimeDifference(endTime);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="flex items-center text-xs text-gray-500">
      <i className="fas fa-clock mr-1"></i>
      {timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0 ? (
        <span>
          Acaba em {timeLeft.hours}h{formatTime(timeLeft.minutes)}m{formatTime(timeLeft.seconds)}s
        </span>
      ) : (
        <span>Acabou</span>
      )}
    </div>
  );
}
