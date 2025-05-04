import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function CouponsBanner() {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-4 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 opacity-20">
        <i className="fas fa-ticket-alt text-9xl transform rotate-45 translate-x-6 -translate-y-6"></i>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="text-white mb-4 md:mb-0">
          <h3 className="text-xl font-bold mb-1">Economize com cupons exclusivos</h3>
          <p className="text-sm opacity-90">Escolha os melhores descontos nas suas lojas favoritas do Saara</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            asChild
            className="bg-white text-primary font-semibold px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100 flex items-center"
          >
            <Link href="/products?type=coupons">
              <a>
                <i className="fas fa-ticket-alt mr-2"></i>
                Ver cupons disponíveis
              </a>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
