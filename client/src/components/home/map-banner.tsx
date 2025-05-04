import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function MapBanner() {
  return (
    <div className="relative rounded-lg overflow-hidden mb-8 shadow-md">
      <div className="h-48 md:h-64 bg-gray-200 relative">
        <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80')"}}>
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg pulse-animation">
          <i className="fas fa-map-marker-alt text-primary text-2xl"></i>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 p-4 md:p-6 rounded-lg max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Descubra lojas próximas a você</h3>
            <p className="text-sm text-gray-600 mb-4">Encontre as melhores promoções ao seu redor no SAARA</p>
            <Button
              asChild
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90"
            >
              <Link href="/stores">
                <a>
                  <i className="fas fa-location-arrow mr-2"></i> Ver no mapa
                </a>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
