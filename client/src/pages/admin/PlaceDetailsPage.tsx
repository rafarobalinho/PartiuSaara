import React from 'react';
import { useParams } from 'wouter';
import PlaceDetailsPanel from '@/components/admin/PlaceDetailsPanel';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function PlaceDetailsPage() {
  const params = useParams();
  const storeId = params.id ? parseInt(params.id) : 0;
  
  if (!storeId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Loja não encontrada</h1>
          <p className="mb-6">O ID da loja não foi fornecido ou é inválido.</p>
          <Link href="/admin/geocoding">
            <Button>Voltar para Geocodificação</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/admin/geocoding">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Geocodificação
          </Button>
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Detalhes do Lugar</h1>
      
      <PlaceDetailsPanel storeId={storeId} />
    </div>
  );
}