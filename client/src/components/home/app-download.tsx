export default function AppDownload() {
  return (
    <div className="bg-gradient-to-r from-primary to-secondary rounded-lg mb-8 overflow-hidden">
      <div className="flex flex-col md:flex-row items-center">
        <div className="p-6 md:p-8 text-white md:w-3/5">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Baixe o app Partiu Saara!</h3>
          <p className="mb-4 text-white/90 text-sm md:text-base">
            Receba notificações de promoções, cupons exclusivos e muito mais. Compre com mais facilidade direto do seu celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="#" className="flex items-center justify-center bg-black text-white px-4 py-2 rounded-lg">
              <i className="fab fa-apple text-2xl mr-2"></i>
              <div className="text-left">
                <div className="text-xs">Baixar na</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </a>
            <a href="#" className="flex items-center justify-center bg-black text-white px-4 py-2 rounded-lg">
              <i className="fab fa-google-play text-2xl mr-2"></i>
              <div className="text-left">
                <div className="text-xs">Baixar no</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </a>
          </div>
        </div>
        <div className="md:w-2/5 relative">
          <img 
            src="/uploads/smartphone-app.jpg" 
            alt="Smartphone com app Partiu Saara"
            className="w-full md:h-64 object-cover"
            onError={(e) => {
              e.currentTarget.src = '/assets/image-unavailable.jpg';
            }}
          />
        </div>
      </div>
    </div>
  );
}
