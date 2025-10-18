import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff, Gamepad2, Clock, ListChecks, Image as ImageIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PricingMethodSelector } from "@/components/PricingMethodSelector";
import ServiceImageManager from "@/components/ServiceImageManager";

// Simple, DB-backed admin for Services and their Games.
// Services come from public.services; Games from public.games (category = service name)
// Admins can: create/update/hide services and add/remove/hide games per service.

// Types based on DB schema (kept minimal for this page)
interface DbService {
  id: string;
  name: string;
  name_en?: string; // English service name
  name_ka?: string; // Georgian service name
  type: string | null;
  description: string | null;
  duration: string; // default '1 hour'
  pricing_model: string; // default 'hourly'
  is_visible: boolean;
  sort_order: number;
  table_label?: string; // custom label for table-wise pricing
  guest_label?: string; // custom label for guest-wise pricing
  table_label_ka?: string; // custom Georgian label for table-wise pricing
  guest_label_ka?: string; // custom Georgian label for guest-wise pricing
  main_category?: string; // main category this service belongs to
}

interface DbGame {
  id: string;
  name: string;
  category: string; // equals service name
  is_visible: boolean;
}

const useAdminServices = () => {
  return useQuery<DbService[]>({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("services")
        .select("id, name, name_en, name_ka, type, description, duration, pricing_model, is_visible, sort_order, table_label, guest_label, table_label_ka, guest_label_ka, main_category")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      
      
      return (data || []) as DbService[];
    },
  });
};

const useGamesForService = (serviceName?: string) => {
  return useQuery<DbGame[]>({
    queryKey: ["admin-games", serviceName ?? ""],
    enabled: !!serviceName,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("games")
        .select("id, name, category, is_visible")
        .eq("category", serviceName as string)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as DbGame[];
    },
  });
};

const ManageServiceImagesDialog = ({ service, trigger }: { service: DbService; trigger: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Images for {service.name}</DialogTitle>
          <DialogDescription>Upload and manage images for this service. These images will be used across all venues offering this service.</DialogDescription>
        </DialogHeader>
        <ServiceImageManager serviceId={service.id} serviceName={service.name} />
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ManageGamesDialog = ({ service, trigger }: { service: DbService; trigger: React.ReactNode }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const { data: games = [], isLoading } = useGamesForService(service?.name);

  const addGame = async () => {
    if (!newGameName.trim()) return;
    const { error } = await (supabase as any)
      .from("games")
      .insert({ name: newGameName.trim(), category: service.name, is_visible: true });
    if (error) {
      toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      return;
    }
    setNewGameName("");
    await qc.invalidateQueries({ queryKey: ["admin-games", service.name] });
    toast({ title: t('adminServices.gameAdded'), description: t('adminServices.gameAddedDescription', { serviceName: service.name }) });
  };

  const toggleGameVisibility = async (game: DbGame) => {
    const { error } = await (supabase as any)
      .from("games")
      .update({ is_visible: !game.is_visible })
      .eq("id", game.id);
    if (error) {
      toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-games", service.name] });
  };

  const deleteGame = async (game: DbGame) => {
    const { error } = await (supabase as any)
      .from("games")
      .delete()
      .eq("id", game.id);
    if (error) {
      toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-games", service.name] });
    toast({ title: t('adminServices.deleted'), description: t('adminServices.deletedDescription', { gameName: game.name }) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage games for {service.name}</DialogTitle>
          <DialogDescription>Add or remove games shown for this service type. Hidden games won't be shown to users or partners.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Game name (e.g. FIFA 24)"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
            />
            <Button onClick={addGame} disabled={!newGameName.trim()}>Add</Button>
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md p-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading games…</div>
            ) : games.length === 0 ? (
              <div className="text-sm text-muted-foreground">No games yet</div>
            ) : (
              <div className="space-y-2">
                {games.map((g) => (
                  <div key={g.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" />
                      <span>{g.name}</span>
                      {g.is_visible ? (
                        <Badge className="ml-1" variant="outline">Visible</Badge>
                      ) : (
                        <Badge className="ml-1" variant="secondary">Hidden</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleGameVisibility(g)}>
                        {g.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteGame(g)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ServiceForm = ({
  service,
  onClose,
}: {
  service?: DbService;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [name, setName] = useState(service?.name ?? "");
  const [nameEn, setNameEn] = useState<string>(service?.name_en ?? "");
  const [nameKa, setNameKa] = useState<string>(service?.name_ka ?? "");
  const [type, setType] = useState<string>(service?.type ?? "");
  const [description, setDescription] = useState<string>(service?.description ?? "");
  const [duration, setDuration] = useState<string>(service?.duration ?? "1 hour");
  const [pricing, setPricing] = useState<string>(service?.pricing_model ?? "hourly");
  const [visible, setVisible] = useState<boolean>(service?.is_visible ?? true);
  const [sortOrder, setSortOrder] = useState<number>(service?.sort_order ?? 0);
  const [tableLabel, setTableLabel] = useState<string>(service?.table_label ?? "Table");
  const [guestLabel, setGuestLabel] = useState<string>(service?.guest_label ?? "Guest");
  const [tableLabelKa, setTableLabelKa] = useState<string>(service?.table_label_ka ?? "მაგიდა");
  const [guestLabelKa, setGuestLabelKa] = useState<string>(service?.guest_label_ka ?? "სტუმარი");
  const [mainCategory, setMainCategory] = useState<string>(service?.main_category ?? "gaming");

  const isEdit = !!service;

  const save = async () => {
    if (!name.trim()) {
      toast({ title: t('adminServices.serviceNameRequired'), variant: "destructive" });
      return;
    }
    
    if (!nameEn.trim()) {
      toast({ title: "English service name is required", variant: "destructive" });
      return;
    }
    
    if (!nameKa.trim()) {
      toast({ title: "Georgian service name is required", variant: "destructive" });
      return;
    }

    if (isEdit) {
      const { error } = await (supabase as any)
        .from("services")
        .update({ 
          name: name.trim(), 
          name_en: nameEn.trim(),
          name_ka: nameKa.trim(),
          type, 
          description, 
          duration, 
          pricing_model: pricing, 
          is_visible: visible, 
          sort_order: sortOrder,
          table_label: tableLabel.trim() || "Table",
          guest_label: guestLabel.trim() || "Guest",
          table_label_ka: tableLabelKa.trim() || "მაგიდა",
          guest_label_ka: guestLabelKa.trim() || "სტუმარი",
          main_category: mainCategory
        })
        .eq("id", service!.id);
      if (error) return toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      toast({ title: t('adminServices.serviceUpdated') });
    } else {
      const { error } = await (supabase as any)
        .from("services")
        .insert({ 
          name: name.trim(), 
          name_en: nameEn.trim(),
          name_ka: nameKa.trim(),
          type, 
          description, 
          duration, 
          pricing_model: pricing, 
          is_visible: visible, 
          sort_order: sortOrder,
          table_label: tableLabel.trim() || "Table",
          guest_label: guestLabel.trim() || "Guest",
          table_label_ka: tableLabelKa.trim() || "მაგიდა",
          guest_label_ka: guestLabelKa.trim() || "სტუმარი",
          main_category: mainCategory
        });
      if (error) return toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      toast({ title: t('adminServices.serviceCreated') });
    }

    await qc.invalidateQueries({ queryKey: ["admin-services"] });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Service Name (Internal ID)</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PC Gaming" />
        <p className="text-xs text-muted-foreground mt-1">
          Internal identifier for the service (used in database)
        </p>
      </div>

      {/* Multilingual Service Names */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Service Display Names</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nameEn">English Name *</Label>
            <Input 
              id="nameEn" 
              value={nameEn} 
              onChange={(e) => setNameEn(e.target.value)} 
              placeholder="e.g. PC Gaming"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Service name displayed to English users
            </p>
          </div>
          <div>
            <Label htmlFor="nameKa">Georgian Name * (ქართული სახელი)</Label>
            <Input 
              id="nameKa" 
              value={nameKa} 
              onChange={(e) => setNameKa(e.target.value)} 
              placeholder="მაგ. კომპიუტერული თამაშები"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Service name displayed to Georgian users
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="type">Service Type (optional)</Label>
        <Input id="type" value={type ?? ""} onChange={(e) => setType(e.target.value)} placeholder="e.g. Gaming" />
      </div>

      <div>
        <Label htmlFor="mainCategory">Main Category *</Label>
        <Select value={mainCategory} onValueChange={setMainCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gaming">Gaming</SelectItem>
            <SelectItem value="dental">Dental</SelectItem>
            <SelectItem value="wellness-spa">Wellness & Spa</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Select which category this service belongs to
        </p>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Default Duration</Label>
          <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1 hour" />
        </div>
        <div>
          <PricingMethodSelector 
            value={pricing} 
            onValueChange={(v) => setPricing(v)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tableLabel">Table Label (e.g., "Room", "Table", "Space")</Label>
          <Input 
            id="tableLabel" 
            value={tableLabel} 
            onChange={(e) => setTableLabel(e.target.value)} 
            placeholder="Table" 
          />
          <p className="text-xs text-muted-foreground mt-1">
            Custom label for table-wise pricing
          </p>
        </div>
        <div>
          <Label htmlFor="guestLabel">Guest Label (e.g., "Guest", "Person", "Chair")</Label>
          <Input 
            id="guestLabel" 
            value={guestLabel} 
            onChange={(e) => setGuestLabel(e.target.value)} 
            placeholder="Guest" 
          />
          <p className="text-xs text-muted-foreground mt-1">
            Custom label for guest-wise pricing
          </p>
        </div>
      </div>

      {/* Georgian Labels */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Georgian Labels (ქართული)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tableLabelKa">Table Label (Georgian) (e.g., "ოთახი", "მაგიდა", "სივრცე")</Label>
            <Input 
              id="tableLabelKa" 
              value={tableLabelKa} 
              onChange={(e) => setTableLabelKa(e.target.value)} 
              placeholder="მაგიდა" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Custom Georgian label for table-wise pricing
            </p>
          </div>
          <div>
            <Label htmlFor="guestLabelKa">Guest Label (Georgian) (e.g., "სტუმარი", "პირი", "სკამი")</Label>
            <Input 
              id="guestLabelKa" 
              value={guestLabelKa} 
              onChange={(e) => setGuestLabelKa(e.target.value)} 
              placeholder="სტუმარი" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Custom Georgian label for guest-wise pricing
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sort">Sort Order</Label>
          <Input id="sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch id="visible" checked={visible} onCheckedChange={setVisible} />
          <Label htmlFor="visible">Visible</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>{isEdit ? "Update" : "Create"} Service</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

const Services: React.FC = () => {
  const { data: services = [], isLoading } = useAdminServices();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const toggleServiceVisibility = async (service: DbService) => {
    const { error } = await (supabase as any)
      .from("services")
      .update({ is_visible: !service.is_visible })
      .eq("id", service.id);
    if (error) {
      toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-services"] });
  };

  const deleteService = async (service: DbService) => {
    const { error } = await (supabase as any)
      .from("services")
      .delete()
      .eq("id", service.id);
    if (error) {
      toast({ title: t('adminServices.error'), description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-services"] });
    toast({ title: t('adminServices.serviceDeleted') });
  };

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DbService | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services & Games</h1>
          <p className="text-muted-foreground">Manage available services and their games</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
            </DialogHeader>
            <ServiceForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="py-6 text-sm text-muted-foreground">Loading…</div>
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="py-6 text-sm text-muted-foreground">No services yet</div>
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <div className="text-xs text-muted-foreground max-w-[360px] truncate">{service.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {service.main_category?.replace('-', ' ') || 'gaming'}
                      </Badge>
                    </TableCell>
                    <TableCell>{service.type || "—"}</TableCell>
                    <TableCell>{service.duration}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.pricing_model}</Badge>
                    </TableCell>
                    <TableCell>
                      {service.is_visible ? (
                        <Badge variant="outline">Visible</Badge>
                      ) : (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ManageServiceImagesDialog
                          service={service}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <ImageIcon className="h-4 w-4 mr-1" /> Images
                            </Button>
                          }
                        />
                        <ManageGamesDialog
                          service={service}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Gamepad2 className="h-4 w-4 mr-1" /> Games
                            </Button>
                          }
                        />
                        <Dialog open={!!editing && editing.id === service.id} onOpenChange={(v) => !v && setEditing(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditing(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Service</DialogTitle>
                            </DialogHeader>
                            <ServiceForm service={editing ?? undefined} onClose={() => setEditing(null)} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => toggleServiceVisibility(service)}>
                          {service.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteService(service)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Services;
