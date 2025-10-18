import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Search,
  MapPin,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { getBookingIdDisplay } from '@/utils/bookingIdUtils';
import { useAdminBookings, useBookingStats, useUpdateBookingStatus } from '@/hooks/useAdminBookings';

const Bookings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: bookings, isLoading } = useAdminBookings(statusFilter || undefined);
  const { data: stats } = useBookingStats();
  const updateBookingStatus = useUpdateBookingStatus();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      expired: { variant: 'destructive' as const, label: 'Expired' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    updateBookingStatus.mutate({ bookingId, status: newStatus });
  };

  const getTotalTables = (booking: any) => {
    if (!booking.booking_services || booking.booking_services.length === 0) {
      return 0;
    }
    
    return booking.booking_services.reduce((total: number, service: any) => {
      if (service.table_configurations && service.table_configurations.length > 0) {
        return total + service.table_configurations.length;
      }
      return total + 1; // Fallback to 1 table if no configurations
    }, 0);
  };

  const filteredBookings = bookings?.filter(booking => 
    booking.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.user_email_profile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.venue_location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="bg-gray-700 h-4 rounded mb-2"></div>
                  <div className="bg-gray-700 h-8 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Management</h1>
          <p className="text-gray-400">Monitor and manage all bookings on your platform</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Bookings</p>
                <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-2xl font-bold text-white">{stats?.thisMonth || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-white">{stats?.totalRevenue || 0} GEL</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by venue, customer, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Customer</TableHead>
                <TableHead className="text-gray-300">Venue</TableHead>
                <TableHead className="text-gray-300">Date & Time</TableHead>
                <TableHead className="text-gray-300">Guests</TableHead>
                <TableHead className="text-gray-300">Amount</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="border-gray-700">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">
                          {booking.user_full_name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {booking.user_email_profile}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">{booking.venue_name}</p>
                        <p className="text-gray-400 text-sm">{booking.venue_location}</p>
                        <p className="text-gray-500 text-xs mt-1">{getBookingIdDisplay(booking.id)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-white">
                      <p>{format(new Date(booking.booking_date), 'MMM dd, yyyy')}</p>
                      <p className="text-gray-400 text-sm">
                        {booking.booking_services && booking.booking_services.length > 0 
                          ? new Date(booking.booking_services[0].arrival_datetime).toLocaleTimeString('en-GB', { timeZone: 'Asia/Tbilisi', hour12: false })
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {(() => {
                          if (!booking.booking_services || booking.booking_services.length === 0) {
                            return 0;
                          }
                          
                          // Calculate total guests only for non-table-wise services
                          const totalGuests = booking.booking_services.reduce((total, service) => {
                            // Check if this is a table-wise service
                            const isTableWiseService = service.venue_services?.pricing_model && 
                              ['table_wise', 'per_table'].includes(service.venue_services.pricing_model);
                            
                            // Only count guests for non-table-wise services
                            return total + (isTableWiseService ? 0 : service.guest_count);
                          }, 0);
                          
                          return totalGuests;
                        })()}
                        {getTotalTables(booking) > 0 && (
                          <span className="text-gray-400 ml-1">• {getTotalTables(booking)} table{getTotalTables(booking) !== 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white font-medium">
                                            {booking.total_price} GEL
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(booking.status)}
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={booking.status} 
                      onValueChange={(value) => handleStatusUpdate(booking.id, value)}
                    >
                      <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredBookings.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No bookings found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bookings;