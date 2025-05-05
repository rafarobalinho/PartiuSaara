import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  name: string;
  multiple?: boolean;
  maxImages?: number;
  onChange: (urls: string[]) => void;
  value?: string[];
  className?: string;
}

export function ImageUpload({
  name,
  multiple = false,
  maxImages = 5,
  onChange,
  value = [],
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Validar URLs de imagem
  const getValidImage = (url: string | undefined): string => {
    if (!url) return '';
    
    // Logging para debug
    console.log('URL da imagem original:', url);
    
    // Se começar com http, é uma URL completa
    if (url.startsWith('http')) return url;
    
    // Se começar com / é relativo ao domínio (manter como está)
    if (url.startsWith('/')) {
      const validUrl = url;
      console.log('URL da imagem processada:', validUrl);
      return validUrl;
    }
    
    // Senão, adicionar o prefixo /uploads/
    const prefixedUrl = `/uploads/${url.replace(/^uploads\//, '')}`;
    console.log('URL da imagem processada com prefixo:', prefixedUrl);
    return prefixedUrl;
  };

  // Lidar com o upload das imagens
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - selectedImages.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Limite de imagens excedido",
        description: `Você só pode adicionar mais ${remainingSlots} imagem(ns)`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Extrair o tipo e ID da entidade do nome
      // Exemplo: "store-logo-5" => tipo: "store", entityId: "5"
      const entityInfo = name.split('-');
      const type = entityInfo[0]; // "store" ou "product"
      
      let entityId = '';
      // Se for formato product-5 ou store-5
      if (entityInfo.length === 2 && !isNaN(Number(entityInfo[1]))) {
        entityId = entityInfo[1];
      } 
      // Se for formato store-logo-5 ou product-images-5
      else if (entityInfo.length > 2 && !isNaN(Number(entityInfo[entityInfo.length - 1]))) {
        entityId = entityInfo[entityInfo.length - 1];
      } else {
        throw new Error('Nome de campo inválido. Deve seguir o formato "type-id" ou "type-subtype-id"');
      }

      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      // Adicionar os parâmetros type e entityId como query params
      const response = await apiRequest(
        'POST', 
        `/api/upload/images?type=${type}&entityId=${entityId}`, 
        formData, 
        {
          headers: {
            // Não incluir Content-Type, o navegador configura automaticamente para FormData
          },
        }
      );

      const result = await response.json();

      if (result.success && result.images) {
        const newImages = result.images.map((img: any) => ({
          id: img.id,
          url: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          isPrimary: img.isPrimary
        }));
        
        // Se não for múltiplo, substitui a imagem atual em vez de adicionar
        const updatedImages = multiple 
          ? [...selectedImages, ...newImages.map(img => img.url)]
          : newImages.map(img => img.url); // Para logo, substitui completamente
        
        setSelectedImages(updatedImages);
        onChange(updatedImages);
        
        toast({
          title: "Upload realizado com sucesso",
          description: `${newImages.length} imagem(ns) adicionada(s)`,
        });
      } else {
        throw new Error(result.message || 'Erro no upload das imagens');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : 'Erro ao fazer upload das imagens',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remover uma imagem
  const handleRemoveImage = async (index: number) => {
    try {
      const imageToRemove = selectedImages[index];
      
      // Extrair o tipo e ID da entidade do nome do componente
      const entityInfo = name.split('-');
      const type = entityInfo[0]; // "store" ou "product"
      
      // Extrair o ID da imagem da URL
      // Aqui precisamos extrair de uma estrutura como /uploads/123456789.jpg
      const imageId = imageToRemove.match(/\/uploads\/(\d+)/)?.[1];
      
      // Se a imagem já está salva no servidor e temos o ID, enviar requisição para excluí-la
      if (imageToRemove.startsWith('/uploads/') && imageId) {
        await apiRequest('DELETE', `/api/upload/images/${imageId}?type=${type}`, {});
      }
      
      const updatedImages = selectedImages.filter((_, i) => i !== index);
      setSelectedImages(updatedImages);
      onChange(updatedImages);
      
      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: "Erro ao remover imagem",
        description: error instanceof Error ? error.message : 'Erro ao remover a imagem',
        variant: "destructive"
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor={name}>{multiple ? 'Imagens' : 'Imagem'}</Label>
        
        {/* Botão para selecionar arquivos */}
        <div className="flex items-center space-x-2">
          <Input
            ref={fileInputRef}
            id={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={multiple}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || selectedImages.length >= maxImages}
            className="w-full flex items-center"
          >
            {isUploading ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? 'Enviando...' : multiple ? 'Selecionar imagens' : 'Selecionar imagem'}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: JPG, PNG, WebP. {multiple ? `Máximo ${maxImages} imagens.` : ''}
        </p>
      </div>

      {/* Preview das imagens */}
      {selectedImages.length > 0 && (
        <div className={multiple ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "w-full max-w-sm mx-auto"}>
          {selectedImages.map((image, index) => (
            <div key={index} className="relative group rounded-md overflow-hidden border border-border">
              <div className="aspect-square w-full relative">
                <img 
                  src={getValidImage(image)} 
                  alt={`Imagem ${index + 1}`} 
                  className="object-cover w-full h-full"
                  onLoad={() => console.log(`Imagem ${index + 1} carregada com sucesso:`, getValidImage(image))}
                  onError={(e) => {
                    console.error(`Erro ao carregar imagem ${index + 1}:`, getValidImage(image));
                    (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/F2600C/FFFFFF?text=ERRO';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveImage(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Slots restantes (apenas para múltiplos) */}
          {multiple && Array.from({ length: Math.min(4, maxImages - selectedImages.length) }).map((_, index) => (
            <div 
              key={`empty-${index}`} 
              className="relative rounded-md overflow-hidden border border-dashed border-border aspect-square flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      
      {/* Placeholder para imagem única quando não há imagem */}
      {!multiple && selectedImages.length === 0 && (
        <div 
          className="w-full max-w-sm mx-auto relative rounded-md overflow-hidden border border-dashed border-border aspect-square flex flex-col items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Clique para adicionar o logo da loja</p>
        </div>
      )}
    </div>
  );
}