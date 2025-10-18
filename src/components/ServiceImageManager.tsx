import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Star, StarOff, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateImageFile, generateSafeFilename } from '@/utils/fileValidation';
import { useServiceImages, useUploadServiceImage, useUpdateServiceImage, useDeleteServiceImage } from '@/hooks/useServiceImages';

interface ServiceImageManagerProps {
  serviceId: string;
  serviceName: string;
}

const ServiceImageManager: React.FC<ServiceImageManagerProps> = ({ serviceId, serviceName }) => {
  const [uploading, setUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    alt_text: '',
    sort_order: 0,
    is_primary: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: images = [], isLoading } = useServiceImages();
  const serviceImages = images.find(s => s.id === serviceId)?.images || [];
  
  const uploadImageMutation = useUploadServiceImage();
  const updateImageMutation = useUpdateServiceImage();
  const deleteImageMutation = useDeleteServiceImage();

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
      const fileName = generateSafeFilename(file.name, `service-${serviceId}-`);
      const filePath = `service-images/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      // Upload image record to database
      await uploadImageMutation.mutateAsync({
        serviceId,
        imageUrl: publicUrl,
        altText: `${serviceName} service image`,
        sortOrder: serviceImages.length,
        isPrimary: serviceImages.length === 0 // First image is primary
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

  const handleEditImage = (image: any) => {
    setEditingImage(image.id);
    setEditForm({
      alt_text: image.alt_text || '',
      sort_order: image.sort_order,
      is_primary: image.is_primary
    });
  };

  const handleUpdateImage = async () => {
    if (!editingImage) return;

    try {
      await updateImageMutation.mutateAsync({
        imageId: editingImage,
        updates: editForm
      });
      setEditingImage(null);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await deleteImageMutation.mutateAsync(imageId);
      } catch (error) {
        // Error handling is done in the mutation
      }
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await updateImageMutation.mutateAsync({
        imageId,
        updates: { is_primary: true }
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Service Images</h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading images...</div>
      ) : serviceImages.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload an image to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceImages.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={image.image_url}
                  alt={image.alt_text || serviceName}
                  className="w-full h-48 object-cover"
                />
                {image.is_primary && (
                  <Badge className="absolute top-2 left-2" variant="default">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleEditImage(image)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDeleteImage(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sort Order: {image.sort_order}</span>
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrimary(image.id)}
                      >
                        <StarOff className="h-4 w-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                  </div>
                  {image.alt_text && (
                    <p className="text-sm text-muted-foreground">{image.alt_text}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Image Dialog */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="alt_text">Alt Text</Label>
              <Textarea
                id="alt_text"
                value={editForm.alt_text}
                onChange={(e) => setEditForm({ ...editForm, alt_text: e.target.value })}
                placeholder="Describe the image for accessibility"
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={editForm.sort_order}
                onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_primary"
                checked={editForm.is_primary}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_primary: checked })}
              />
              <Label htmlFor="is_primary">Primary Image</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImage(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateImage} disabled={updateImageMutation.isPending}>
              {updateImageMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceImageManager;
