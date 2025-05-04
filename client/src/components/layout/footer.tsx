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
              <li><Link href="/"><a className="hover:text-primary">Como funciona</a></Link></li>
              <li><Link href="/products"><a className="hover:text-primary">Reservar produtos</a></Link></li>
              <li><Link href="/"><a className="hover:text-primary">Cupons de desconto</a></Link></li>
              <li><Link href="/products"><a className="hover:text-primary">Promoções Relâmpago</a></Link></li>
              <li><Link href="/stores"><a className="hover:text-primary">Lojas parceiras</a></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Para lojistas</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><Link href="/seller/dashboard"><a className="hover:text-primary">Como participar</a></Link></li>
              <li><Link href="/seller/dashboard"><a className="hover:text-primary">Benefícios</a></Link></li>
              <li><Link href="/seller/subscription"><a className="hover:text-primary">Planos e assinaturas</a></Link></li>
              <li><Link href="/seller/promotions/add"><a className="hover:text-primary">Criar promoções</a></Link></li>
              <li><Link href="/seller/analytics"><a className="hover:text-primary">Dashboard de vendas</a></Link></li>
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
