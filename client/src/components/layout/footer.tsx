import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-8 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Partiu Saara</h3>
            <p className="text-sm text-gray-600 mb-4">
              Conectando consumidores e lojistas dos mercados populares. Promoções, cupons e uma experiência de compra diferente.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="text-gray-500 hover:text-primary">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="text-gray-500 hover:text-primary">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="text-gray-500 hover:text-primary">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-gray-500 hover:text-primary">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Para consumidores</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><Link href="/"><span className="hover:text-primary cursor-pointer">Como funciona</span></Link></li>
              <li><Link href="/products"><span className="hover:text-primary cursor-pointer">Reservar produtos</span></Link></li>
              <li><Link href="/"><span className="hover:text-primary cursor-pointer">Cupons de desconto</span></Link></li>
              <li><Link href="/products"><span className="hover:text-primary cursor-pointer">Promoções Relâmpago</span></Link></li>
              <li><Link href="/stores"><span className="hover:text-primary cursor-pointer">Lojas parceiras</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Para lojistas</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><Link href="/seller/dashboard"><span className="hover:text-primary cursor-pointer">Como participar</span></Link></li>
              <li><Link href="/seller/dashboard"><span className="hover:text-primary cursor-pointer">Benefícios</span></Link></li>
              <li><Link href="/seller/subscription"><span className="hover:text-primary cursor-pointer">Planos e assinaturas</span></Link></li>
              <li><Link href="/seller/promotions/add"><span className="hover:text-primary cursor-pointer">Criar promoções</span></Link></li>
              <li><Link href="/seller/analytics"><span className="hover:text-primary cursor-pointer">Dashboard de vendas</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Ajuda</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><a href="#" className="hover:text-primary">Central de Suporte</a></li>
              <li><a href="#" className="hover:text-primary">Perguntas frequentes</a></li>
              <li><a href="#" className="hover:text-primary">Política de privacidade</a></li>
              <li><a href="#" className="hover:text-primary">Termos de uso</a></li>
              <li><a href="#" className="hover:text-primary">Contato</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Partiu Saara. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
