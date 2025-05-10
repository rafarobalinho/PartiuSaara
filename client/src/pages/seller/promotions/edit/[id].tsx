import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';

export default function RedirectToNewEditPath() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { id } = params;
  
  useEffect(() => {
    if (id) {
      console.log(`Redirecionando de /seller/promotions/edit/${id} para /seller/promotions/${id}/edit`);
      navigate(`/seller/promotions/${id}/edit`);
    }
  }, [id, navigate]);
  
  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <div className="text-lg">Redirecionando...</div>
      </div>
    </div>
  );
}