// ARQUIVO: client/src/components/ui/image-upload.tsx
// ✅ CORREÇÃO ESPECÍFICA: Separar preview de dados + upload em duas etapas

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  entityType: 'store' | 'product';
  entityId: string | number;
  storeId?: string | number;
  multiple?: boolean;
  selectedImages: string[];
  onChange: (images: string[]) => void;
}

interface ImageUploadRef {
  uploadPendingFiles: (newEntityId: string | number) => Promise<{success: boolean, error?: string}>;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
  entityType,
  entityId,
  storeId,
  multiple = true,
  selectedImages,
  onChange
}, ref) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ ESTADOS SEPARADOS PARA DUAS ETAPAS
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // ✅ FUNÇÃO EXPOSTA VIA REF PARA UPLOAD EM DUAS ETAPAS
  useImperativeHandle(ref, () => ({
    uploadPendingFiles: async (newEntityId: string | number) => {
      if (pendingFiles.length === 0) {
        return { success: true };
      }

      try {
        console.log(`📸 [DUAS-ETAPAS] Fazendo upload de ${pendingFiles.length} arquivo(s) para ${entityType} ${newEntityId}...`);
        setIsUploading(true);

        const formData = new FormData();
        pendingFiles.forEach(file => {
          formData.append('images', file);
        });

        // Montar URL para o upload real
        const params = new URLSearchParams({
          type: entityType,
          entityId: String(newEntityId),
        });

        if (storeId) {
          params.append('storeId', String(storeId));
        }

        const uploadUrl = `/api/upload/images?${params.toString()}`;
        const response = await apiRequest('POST', uploadUrl, formData);
        const result = await response.json();

        if (result.success && result.images) {
          const imageUrls = result.images.map((img: any) => img.imageUrl || img.filename);

          // ✅ SUBSTITUIR PLACEHOLDERS POR URLs REAIS
          onChange(imageUrls);

          // ✅ LIMPAR ESTADO TEMPORÁRIO
          setPendingFiles([]);
          previewUrls.forEach(url => URL.revokeObjectURL(url));
          setPreviewUrls([]);

          console.log(`✅ [DUAS-ETAPAS] Upload concluído: ${result.images.length} imagem(ns)`);
          return { success: true };
        } else {
          throw new Error(result.message || 'Erro no upload');
        }
      } catch (error) {
        console.error('❌ [DUAS-ETAPAS] Erro no upload de arquivos pendentes:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      } finally {
        setIsUploading(false);
      }
    }
  }));

  // ✅ LIMPAR PREVIEWS QUANDO COMPONENTE DESMONTA
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      // Validação de arquivos
      const validFiles = Array.from(files).filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 10MB`,
            variant: "destructive"
          });
          return false;
        }

        if (!file.type.startsWith('image/')) {
          toast({
            title: "Tipo de arquivo inválido",
            description: `${file.name} não é uma imagem válida`,
            variant: "destructive"
          });
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      // ✅ CASO ESPECIAL: entityId="new" - PREPARAR PARA UPLOAD POSTERIOR
      if (entityId === 'new') {
        console.log(`📁 [DUAS-ETAPAS] Preparando ${validFiles.length} arquivo(s) para upload posterior...`);

        // ✅ CRIAR PREVIEWS PARA VISUALIZAÇÃO
        const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));

        if (multiple) {
          // Adicionar aos arquivos e previews existentes
          setPendingFiles(prev => [...prev, ...validFiles]);
          setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

          // ✅ ADICIONAR PLACEHOLDERS NO ARRAY DE DADOS
          const newPlaceholders = Array(validFiles.length).fill("__files_selected__");
          const currentImages = (selectedImages || []).filter(img => img !== "__files_selected__");
          onChange([...currentImages, ...newPlaceholders]);
        } else {
          // Limpar previews anteriores
          previewUrls.forEach(url => URL.revokeObjectURL(url));
          setPendingFiles(validFiles);
          setPreviewUrls(newPreviewUrls);
          onChange(["__files_selected__"]);
        }

        toast({
          title: "Imagens preparadas",
          description: "As imagens serão enviadas quando você salvar o formulário.",
        });

        setIsUploading(false);
        return;
      }

      // ✅ CASO NORMAL: UPLOAD DIRETO (entityId existe)
      console.log(`📤 Fazendo upload direto para ${entityType} ${entityId}...`);

      // Validação de segurança
      if (entityType === 'product' && !storeId) {
        throw new Error("O 'storeId' é obrigatório para fazer upload de imagens de produtos.");
      }

      // Montar URL da API
      const params = new URLSearchParams({
        type: entityType,
        entityId: String(entityId),
      });

      if (storeId) {
        params.append('storeId', String(storeId));
      }

      const uploadUrl = `/api/upload/images?${params.toString()}`;
      console.log(`📤 Enviando para: ${uploadUrl}`);

      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await apiRequest('POST', uploadUrl, formData);
      const result = await response.json();

      if (result.success && result.images) {
        const newImageUrls = result.images.map((img: any) => img.imageUrl || img.filename);
        const updatedImages = multiple ? [...(selectedImages || []), ...newImageUrls] : newImageUrls;

        onChange(updatedImages);

        toast({
          title: "Upload realizado com sucesso",
          description: `${result.images.length} imagem(ns) adicionada(s)`,
        });
      } else {
        throw new Error(result.message || 'Erro no upload das imagens');
      }
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (entityId === 'new') {
      // ✅ REMOVER ARQUIVO PENDENTE E PREVIEW
      const newPendingFiles = [...pendingFiles];
      const newPreviewUrls = [...previewUrls];

      // Verificar se estamos removendo um preview ou uma imagem real
      const realImagesCount = (selectedImages || []).filter(img => img !== "__files_selected__").length;

      if (index >= realImagesCount) {
        // Removendo um preview
        const previewIndex = index - realImagesCount;
        if (newPreviewUrls[previewIndex]) {
          URL.revokeObjectURL(newPreviewUrls[previewIndex]);
        }
        newPendingFiles.splice(previewIndex, 1);
        newPreviewUrls.splice(previewIndex, 1);

        setPendingFiles(newPendingFiles);
        setPreviewUrls(newPreviewUrls);

        // Atualizar placeholders
        const realImages = (selectedImages || []).filter(img => img !== "__files_selected__");
        const newPlaceholders = Array(newPendingFiles.length).fill("__files_selected__");
        onChange([...realImages, ...newPlaceholders]);
      } else {
        // Removendo uma imagem real
        const newImages = (selectedImages || []).filter(img => img !== "__files_selected__");
        newImages.splice(index, 1);
        const placeholders = Array(pendingFiles.length).fill("__files_selected__");
        onChange([...newImages, ...placeholders]);
      }
    } else {
      // ✅ REMOVER IMAGEM JÁ UPLOADADA
      const newImages = [...(selectedImages || [])];
      newImages.splice(index, 1);
      onChange(newImages);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ✅ COMBINAR IMAGENS REAIS + PREVIEWS PARA EXIBIÇÃO
  const getDisplayImages = () => {
    // ✅ PROTEÇÃO CONTRA UNDEFINED
    const realImages = (selectedImages || []).filter(img => img !== "__files_selected__");
    return [...realImages, ...previewUrls];
  };

  const displayImages = getDisplayImages();

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Área de Drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={handleButtonClick}
      >
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            Clique aqui ou arraste {multiple ? 'imagens' : 'uma imagem'} para fazer upload
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG ou WebP até 10MB
          </p>
        </div>
      </div>

      {/* Botão de Upload */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Fazendo upload...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {multiple ? 'Adicionar Imagens' : 'Selecionar Imagem'}
          </>
        )}
      </Button>

      {/* Preview das Imagens */}
      {displayImages.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem selecionada.</p>
      )}

      {displayImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayImages.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageUrl} // ✅ AGORA USA URLs VÁLIDAS (reais ou blob)
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-image.svg';
                  }}
                />
              </div>

              {/* Botão de Remover */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badge para arquivos pendentes */}
              {entityId === 'new' && index >= (selectedImages || []).filter(img => img !== "__files_selected__").length && (
                <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Pendente
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Information */}
      {entityId === 'new' && pendingFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            📁 {pendingFiles.length} arquivo(s) selecionado(s) para upload após salvar o formulário.
          </p>
        </div>
      )}

      {/* Limite de arquivos */}
      {!multiple && displayImages.length >= 1 && (
        <p className="text-sm text-gray-500">
          Máximo de 1 imagem permitida. Remova a atual para adicionar outra.
        </p>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export { ImageUpload };