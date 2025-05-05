import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StoresMap from '@/components/ui/StoresMap';
import { MapPin, Store, Navigation } from 'lucide-react';
import CategoryNav from '@/components/layout/category-nav';

export default function MapPage() {
  return (
    <>
      <CategoryNav />
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">Mapa de Lojas</h1>
        </div>
        
        <p className="text-gray-600 mb-8 max-w-3xl">
          Encontre as lojas mais próximas de você no Saara. Clique nos marcadores para ver detalhes sobre cada loja.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mapa Interativo */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm h-[600px]">
              <CardContent className="p-0 h-full">
                <StoresMap />
              </CardContent>
            </Card>
          </div>
          
          {/* Informações e Destaques */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5 text-orange-500" />
                  Sobre o Saara
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  O Saara é uma tradicional região comercial no Centro do Rio de Janeiro, conhecida por sua diversidade de lojas e produtos com preços acessíveis.
                </p>
                <p className="text-sm text-gray-600">
                  Localizada próxima à Praça Tiradentes, a região abriga centenas de estabelecimentos comerciais em diversas categorias.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-orange-500" />
                  Como Chegar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">Metrô</h4>
                    <p className="text-sm text-gray-600">Estações Uruguaiana ou Presidente Vargas</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">VLT</h4>
                    <p className="text-sm text-gray-600">Paradas Uruguaiana ou Sete de Setembro</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">Ônibus</h4>
                    <p className="text-sm text-gray-600">Diversas linhas que passam pelo Centro</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">Horário de Funcionamento</h4>
                    <p className="text-sm text-gray-600">Segunda a Sexta: 9h às 18h</p>
                    <p className="text-sm text-gray-600">Sábados: 9h às 13h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}