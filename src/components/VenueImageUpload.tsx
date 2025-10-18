import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { validateImageFile, generateSafeFilename } from '@/utils/fileValidation';

interface VenueImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  venueId: string;
}

const VenueImageUpload = ({ images, onImagesChange, venueId }: VenueImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      // Comprehensive security validation
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Show warnings if any (but allow upload to continue)
      if (validation.warnings && validation.warnings.length > 0) {
        console.info('File validation warnings:', validation.warnings);
      }

      // Generate secure filename
      const fileName = `${venueId}/${generateSafeFilename(file.name, 'venue-')}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('venue-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(data.path);

      // Update images array
      const newImages = [...images, publicUrl];
      onImagesChange(newImages);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    try {
      setDeletingIndex(index);
      
      const imageUrl = images[index];
      
      // Extract file path from URL
      if (imageUrl.includes('venue-images/')) {
        const filePath = imageUrl.split('venue-images/')[1];
        
        // Delete from storage
        const { error } = await supabase.storage
          .from('venue-images')
          .remove([filePath]);

        if (error) {
          console.warn('Failed to delete from storage:', error);
        }
      }

      // Remove from images array
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);

      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image",
        variant: "destructive"
      });
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag & Drop reordering handlers
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (toIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = fromIndexStr ? parseInt(fromIndexStr, 10) : draggingIndex;
    if (fromIndex === null || isNaN(fromIndex) || fromIndex === toIndex) {
      setDraggingIndex(null);
      return;
    }

    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onImagesChange(reordered);
    setDraggingIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  // Click-based reordering
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length || fromIndex === toIndex) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onImagesChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= 10}
          variant="outline"
          className="border-dashed border-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? t('partner.editVenue.uploading') : t('partner.editVenue.uploadImage')}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 ? (
        <>
          <div className="text-sm text-muted-foreground text-center">
            {t('partner.editVenue.reorderHint', { defaultValue: 'Drag images or use arrows to reorder. The first image is the cover.' })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <Card
              key={index}
              className={`relative group ${draggingIndex === index ? 'ring-2 ring-blue-500' : ''}`}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <CardContent className="p-2">
                <div className="aspect-square relative overflow-hidden rounded-md cursor-move">
                  <img
                    src={imageUrl}
                    alt={`Venue image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback for broken images
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                    }}
                  />

                  {/* Reorder Arrows */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 bg-black/45 text-white px-2 py-1 rounded">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-transparent border-white/40 hover:bg-white/20"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(index, index - 1); }}
                        disabled={index === 0}
                        aria-label={t('partner.editVenue.moveLeft', { defaultValue: 'Move left' })}
                        title={t('partner.editVenue.moveLeft', { defaultValue: 'Move left' }) as string}
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-transparent border-white/40 hover:bg-white/20"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(index, index + 1); }}
                        disabled={index === images.length - 1}
                        aria-label={t('partner.editVenue.moveRight', { defaultValue: 'Move right' })}
                        title={t('partner.editVenue.moveRight', { defaultValue: 'Move right' }) as string}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Delete Button */}
                  <Button
                    onClick={() => removeImage(index)}
                    disabled={deletingIndex === index}
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deletingIndex === index ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('partner.editVenue.noImagesUploadedYet')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('partner.editVenue.maxImagesDescription')}
            </p>
          </CardContent>
        </Card>
      )}
      
      {images.length >= 10 && (
        <p className="text-sm text-orange-600 text-center">
          {t('partner.editVenue.maxImagesReached')}
        </p>
      )}
    </div>
  );
};

export default VenueImageUpload;