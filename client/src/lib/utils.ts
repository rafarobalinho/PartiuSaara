import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função que verifica se uma imagem deve ser usada
export function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;
  
  // Retorna a URL original passada pelo banco de dados
  return imageUrl;
}

// Função para formatar valores monetários
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função para calcular porcentagem de desconto
export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (!originalPrice || !discountedPrice || originalPrice <= 0 || discountedPrice >= originalPrice) {
    return 0;
  }
  
  const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
  return Math.round(discount);
}

// Função para obter o tempo restante de uma promoção
export function getTimeRemaining(endTime: string): { days: number; hours: number; minutes: number; seconds: number } {
  const end = new Date(endTime).getTime();
  const now = new Date().getTime();
  const distance = end - now;
  
  if (distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

// Função para obter a diferença entre duas datas em formato legível
export function getTimeDifference(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  
  // Converte a diferença para várias unidades de tempo
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  
  // Retorna a diferença formatada
  if (diffMonths > 0) {
    return diffMonths === 1 ? '1 mês atrás' : `${diffMonths} meses atrás`;
  } else if (diffDays > 0) {
    return diffDays === 1 ? '1 dia atrás' : `${diffDays} dias atrás`;
  } else if (diffHours > 0) {
    return diffHours === 1 ? '1 hora atrás' : `${diffHours} horas atrás`;
  } else if (diffMins > 0) {
    return diffMins === 1 ? '1 minuto atrás' : `${diffMins} minutos atrás`;
  } else {
    return 'agora mesmo';
  }
}

// Função para converter UTC para horário de Brasília na exibição
export function formatBrazilDateTime(date: string | Date): string {
  const utcDate = new Date(date);
  
  // Usar diretamente o timezone do Brasil para formatação
  return utcDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo' // Usar timezone do Brasil diretamente
  });
}

// Função para formatar apenas data no horário de Brasília
export function formatBrazilDate(date: string | Date): string {
  const utcDate = new Date(date);
  
  // Usar diretamente o timezone do Brasil para formatação
  return utcDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo' // Usar timezone do Brasil diretamente
  });
}

// Função para formatar apenas hora no horário de Brasília
export function formatBrazilTime(date: string | Date): string {
  const utcDate = new Date(date);
  
  // Usar diretamente o timezone do Brasil para formatação
  return utcDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo' // Usar timezone do Brasil diretamente
  });
}

// Função para calcular a porcentagem de progresso
export function getProgressPercentage(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = new Date().getTime();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const totalDuration = end - start;
  const elapsedTime = now - start;
  const percentage = (elapsedTime / totalDuration) * 100;
  
  return Math.round(percentage);
}