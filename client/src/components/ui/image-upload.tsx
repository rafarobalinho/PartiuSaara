import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
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

// Componente com ref para acessar métodos internos
const ImageUploadComponent = forwardRef(({
  name,
  multiple = false,
  maxImages = 5,
  onChange,
  value = [],
  className = '',
}: ImageUploadProps, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Converter URL blob para File
  async function blobUrlToFile(blobUrl: string): Promise<File> {
    try {
      console.log('Convertendo blob URL para arquivo:', blobUrl);
      
      // Baixar o conteúdo do blob
      const response = await fetch(blobUrl);
      if (!response.ok) throw new Error('Falha ao buscar conteúdo do blob');
      
      const blobData = await response.blob();
      
      // Criar um nome de arquivo único
      const filename = `image_${Date.now()}.jpg`;
      
      // Criar um objeto File
      const file = new File([blobData], filename, { type: 'image/jpeg' });
      
      console.log('Blob convertido com sucesso para arquivo:', filename);
      return file;
    } catch (error) {
      console.error('Erro ao converter blob para arquivo:', error);
      throw error;
    }
  }
  
  // Processar e fazer upload de um blob
  async function processAndUploadBlob(blobUrl: string, entityType: string, entityId: string): Promise<string> {
    try {
      console.log(`Processando blob para upload: ${blobUrl}`);
      
      // Converter blob para arquivo
      const file = await blobUrlToFile(blobUrl);
      
      // Criar FormData
      const formData = new FormData();
      formData.append('images', file);
      
      // Enviar para a API
      console.log(`Enviando arquivo para API: type=${entityType}, entityId=${entityId}`);
      
      const response = await apiRequest(
        'POST', 
        `/api/upload/images?type=${entityType}&entityId=${entityId}`, 
        formData
      );
      
      const result = await response.json();
      
      if (result.success && result.images && result.images.length > 0) {
        const newImageUrl = result.images[0].imageUrl;
        console.log(`Blob processado com sucesso. Nova URL:`, newImageUrl);
        return newImageUrl;
      } else {
        throw new Error(result.message || 'Erro no upload da imagem');
      }
    } catch (error) {
      console.error('Erro ao processar e fazer upload de blob:', error);
      throw error;
    }
  }
  
  // Função para verificar se a matriz de imagens contém blobs que precisam ser processados
  const processBlobsIfNeeded = async (): Promise<string[]> => {
    if (!selectedImages || selectedImages.length === 0) return selectedImages;
    
    // Extrair informações do nome do campo
    const entityInfo = name.split('-');
    const entityType = entityInfo[0]; // "store" ou "product"
    const entityId = entityInfo[entityInfo.length - 1];
    
    // Verificar se entityId é válido
    if (!entityId || isNaN(Number(entityId))) {
      console.error(`ID inválido: ${entityId}`);
      return selectedImages;
    }
    
    let hasChanged = false;
    const processed = [...selectedImages]; // Clone para não modificar o original
    
    // Processar cada imagem
    for (let i = 0; i < processed.length; i++) {
      if (processed[i].startsWith('blob:')) {
        try {
          const newUrl = await processAndUploadBlob(processed[i], entityType, entityId);
          processed[i] = newUrl;
          hasChanged = true;
        } catch (error) {
          console.error(`Falha ao processar blob no índice ${i}:`, error);
        }
      }
    }
    
    // Atualizar estado apenas se algo mudou
    if (hasChanged) {
      setSelectedImages(processed);
      onChange(processed);
    }
    
    return processed;
  };
  
  // Validar e normalizar URLs de imagem
  const getValidImage = (url: string | undefined): string => {
    if (!url) return '';
    
    try {
      // Se for uma URL Blob (temporária do navegador)
      if (url.startsWith('blob:')) {
        console.log('URL do tipo blob detectada, substituindo por placeholder temporário');
        // Nunca mais retornamos a URL blob diretamente
        return 'https://placehold.co/300x300/BBBBBB/666666?text=Processando...';
      }
      
      // Se começar com http, é uma URL completa
      if (url.startsWith('http')) {
        return url;
      }
      
      // Se já for uma URL completa relativa ao servidor
      if (url.startsWith('/uploads/')) {
        return url;
      }
      
      // Se começar com barra mas não for o formato esperado
      if (url.startsWith('/') && !url.startsWith('/uploads/')) {
        // Tentar extrair qualquer ID de arquivo no final do path
        const segments = url.split('/');
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && (lastSegment.includes('.jpg') || lastSegment.includes('.png'))) {
          return `/uploads/${lastSegment}`;
        }
        // Se não foi possível corrigir, retornar como está
        return url;
      }
      
      // Se for apenas um nome de arquivo, adicionar o prefixo /uploads/
      const fileName = url.replace(/^uploads\//, ''); // Remove uploads/ duplicado se existir
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('Erro ao processar URL da imagem:', error, url);
      return 'https://placehold.co/300x300/F2600C/FFFFFF?text=ERRO';
    }
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
      // Exemplos aceitos:
      // "store-5" => tipo: "store", entityId: "5"
      // "product-5" => tipo: "product", entityId: "5"
      // "store-logo-5" => tipo: "store", entityId: "5"
      // "product-images-5" => tipo: "product", entityId: "5"
      
      console.log('Analisando nome do campo:', name);
      
      const entityInfo = name.split('-');
      
      if (entityInfo.length < 2) {
        throw new Error(`Nome de campo inválido: "${name}". Deve seguir o formato "tipo-id" ou "tipo-subtipo-id"`);
      }
      
      const type = entityInfo[0]; // "store" ou "product"
      
      if (type !== 'store' && type !== 'product') {
        throw new Error(`Tipo inválido: "${type}". Deve ser "store" ou "product"`);
      }
      
      // Extrair o ID da entidade (último componente do nome)
      const lastComponent = entityInfo[entityInfo.length - 1];
      const entityId = lastComponent;
      
      if (!entityId || isNaN(Number(entityId))) {
        throw new Error(`ID inválido: "${entityId}". Deve ser um número válido`);
      }
      
      console.log('Tipo extraído:', type, 'ID da entidade:', entityId);

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
          ? [...selectedImages, ...newImages.map((img: any) => img.url)]
          : newImages.map((img: any) => img.url); // Para logo, substitui completamente
        
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
      
      // Extrair o tipo e ID da entidade do nome
      console.log('Analisando nome do campo para remoção:', name);
      
      const entityInfo = name.split('-');
      
      if (entityInfo.length < 2) {
        throw new Error(`Nome de campo inválido: "${name}". Deve seguir o formato "tipo-id" ou "tipo-subtipo-id"`);
      }
      
      const type = entityInfo[0]; // "store" ou "product"
      
      if (type !== 'store' && type !== 'product') {
        throw new Error(`Tipo inválido: "${type}". Deve ser "store" ou "product"`);
      }
      
      // Extrai o ID da imagem a partir da URL
      // Padrão das URLs de imagem: /uploads/123456789.jpg ou /uploads/thumbnails/123456789.jpg
      const imageUrlMatch = imageToRemove.match(/\/uploads\/(?:thumbnails\/)?([^\/]+?)(?:\.[^.]+)?$/);
      
      if (!imageUrlMatch) {
        console.log('Formato de URL não reconhecido, tentando alternativas:', imageToRemove);
        // Tenta extrações alternativas (fallbacks)
        const filenameMatch = imageToRemove.match(/\/([^\/]+)\.jpg$/);
        const idMatch = imageToRemove.match(/id=(\d+)/);
        const imageId = filenameMatch?.[1] || idMatch?.[1];
        
        if (!imageId) {
          console.log('Não foi possível extrair o ID da imagem, apenas removendo da interface:', imageToRemove);
        } else {
          // Temos um ID, tenta excluir
          console.log(`Removendo imagem (método alternativo): tipo=${type}, id=${imageId}`);
          await apiRequest('DELETE', `/api/upload/images/${imageId}?type=${type}`, {});
        }
      } else {
        // Formato reconhecido, extrai o ID diretamente
        const filename = imageUrlMatch[1];
        const imageId = filename.split('.')[0]; // Remove extensão se houver
        
        console.log(`Removendo imagem: tipo=${type}, id=${imageId}, URL=${imageToRemove}`);
        const response = await apiRequest('DELETE', `/api/upload/images/${imageId}?type=${type}`, {});
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao excluir imagem');
        }
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

  // Expor funções para o componente pai
  useImperativeHandle(ref, () => ({
    // Expõe função para o componente pai processar blobs antes de salvar
    processBlobs: async () => {
      return await processBlobsIfNeeded();
    },
    
    // Verifica se há blobs que precisam ser processados
    hasBlobs: () => {
      return selectedImages.some(url => url?.startsWith('blob:'));
    }
  }));

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
});

// Exportar o componente
export const ImageUpload = ImageUploadComponent;