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
    // Se começar com http, é uma URL completa
    if (url.startsWith('http')) return url;
    // Se começar com / é relativo ao domínio
    if (url.startsWith('/')) return url;
    // Senão, adicionar o prefixo /uploads/
    return `/uploads/${url.replace(/^uploads\//, '')}`;
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
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await apiRequest('POST', '/api/upload/images', formData, {
        headers: {
          // Não incluir Content-Type, o navegador configura automaticamente para FormData
        },
      });

      const result = await response.json();

      if (result.success && result.images) {
        const newImageUrls = result.images.map((img: { imageUrl: string }) => img.imageUrl);
        const updatedImages = [...selectedImages, ...newImageUrls];
        setSelectedImages(updatedImages);
        onChange(updatedImages);
        
        toast({
          title: "Upload realizado com sucesso",
          description: `${newImageUrls.length} imagem(ns) adicionada(s)`,
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
      
      // Se a imagem já está salva no servidor, enviar requisição para excluí-la
      if (imageToRemove.startsWith('/uploads/')) {
        await apiRequest('DELETE', '/api/upload/images', { 
          imageUrl: imageToRemove 
        });
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
        <Label htmlFor={name}>Imagens</Label>
        
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
            {isUploading ? 'Enviando...' : 'Selecionar imagens'}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: JPG, PNG, WebP. Máximo {maxImages} imagens.
        </p>
      </div>

      {/* Preview das imagens */}
      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative group rounded-md overflow-hidden border border-border">
              <div className="aspect-square w-full relative">
                <img 
                  src={getValidImage(image)} 
                  alt={`Imagem ${index + 1}`} 
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/F2F2F2/0D0D0D?text=Imagem+indisponível';
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
          
          {/* Slots restantes */}
          {Array.from({ length: Math.min(4, maxImages - selectedImages.length) }).map((_, index) => (
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
    </div>
  );
}