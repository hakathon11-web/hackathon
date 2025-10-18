import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useAdminVenues, useToggleVenueVisibility } from '@/hooks/useAdminVenues';
import { 
  Building, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  GripVertical,
  RotateCcw,
  Sparkles,
  Save,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { useVenueOrdering, useUpdateVenueOrder, useResetVenueOrder, useAutoSortVenues } from '@/hooks/useVenueOrdering';

const VenueManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();

  const { data: allVenues } = useAdminVenues();
  const toggleVisibility = useToggleVenueVisibility();

  const handleToggleVisibility = (venueId: string, isVisible: boolean) => {
    toggleVisibility.mutate({ venueId, isVisible });
  };

  const filteredVenuesTable = allVenues?.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'visible' && venue.is_visible) ||
                         (statusFilter === 'hidden' && !venue.is_visible);
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venue Management</h1>
          <p className="text-gray-400">Manage venues, control visibility, and set display order</p>
        </div>
        
        <Button className="bg-green-600 hover:bg-green-700">
          <Building className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">
            All Venues
          </TabsTrigger>
          <TabsTrigger value="reorder" className="data-[state=active]:bg-gray-700">
            Reorder Venues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Filters */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search venues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all">All Venues</SelectItem>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Venues Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">All Venues ({filteredVenuesTable.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Venue</TableHead>

                    <TableHead className="text-gray-300">Location</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Rating</TableHead>
                    <TableHead className="text-gray-300">Created</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenuesTable.map((venue) => (
                    <TableRow key={venue.id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                            {venue.images && venue.images.length > 0 ? (
                              <img 
                                src={venue.images[0]} 
                                alt={venue.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{venue.name}</p>
                            <p className="text-sm text-gray-400">ID: {venue.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-300">{venue.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={venue.is_visible ? "default" : "secondary"}
                            className={venue.is_visible 
                              ? "bg-green-500/20 text-green-400 border-green-500" 
                              : "bg-gray-500/20 text-gray-400 border-gray-500"
                            }
                          >
                            {venue.is_visible ? "Visible" : "Hidden"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span className="text-white">{venue.rating || 0}</span>
                          <span className="text-gray-400">({venue.review_count || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {format(new Date(venue.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisibility(venue.id, !venue.is_visible)}
                            className="text-gray-400 hover:text-white"
                          >
                            {venue.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/partner/venues/${venue.id}/edit`)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/venues/${venue.id}/recipients`)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            Recipients
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Venue</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete "{venue.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-700 border-gray-600">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder">
          <ReorderVenuesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueManagement;

// Reorder section component (isolated so we only change the Reorder tab)
const ReorderVenuesSection: React.FC = () => {
  const { data: venues, isLoading } = useVenueOrdering('global', null);
  const updateOrder = useUpdateVenueOrder();
  const resetOrder = useResetVenueOrder();
  const autoSort = useAutoSortVenues();

  const [local, setLocal] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (venues) setLocal(venues);
  }, [venues]);

  const move = (from: number, to: number) => {
    setLocal((list) => {
      const next = list.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSave = () => {
    const items = local.map((v, idx) => ({ venue_id: v.id, display_order: idx + 1 }));
    updateOrder.mutate({ scopeType: 'global', scopeId: null, items });
  };

  const handleReset = () => {
    resetOrder.mutate({ scopeType: 'global', scopeId: null });
  };

  const handleAutoSort = () => {
    autoSort.mutate({ scopeType: 'global', scopeId: null, strategy: 'rating' });
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Reorder Visible Venues</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-400 text-sm">
            Drag venues to change display order. Only visible venues are shown.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={resetOrder.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button variant="outline" onClick={handleAutoSort} disabled={autoSort.isPending}>
              <Sparkles className="h-4 w-4 mr-2" /> Auto Sort
            </Button>
            <Button onClick={handleSave} disabled={updateOrder.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save Order
            </Button>
          </div>
        </div>

        <div className="divide-y divide-gray-700 rounded-lg border border-gray-700">
          {(isLoading ? [] : local).map((v, idx) => (
            <div key={v.id} className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab touch-none" />
                <div className="w-12 h-12 bg-gray-600 rounded-md overflow-hidden flex items-center justify-center">
                  {v.images?.[0] ? (
                    <img src={v.images[0]} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="text-white font-medium">{v.name}</div>
                  <div className="text-xs text-gray-400">{v.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => move(idx, Math.max(0, idx - 1))} disabled={idx === 0}>↑</Button>
                <Button variant="outline" size="sm" onClick={() => move(idx, Math.min(local.length - 1, idx + 1))} disabled={idx === local.length - 1}>↓</Button>
                <Badge variant="outline" className="border-gray-600 text-gray-300">#{idx + 1}</Badge>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="p-6 text-center text-gray-400">Loading visible venues…</div>
          )}
          {!isLoading && local.length === 0 && (
            <div className="p-6 text-center text-gray-400">No visible venues to order.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};