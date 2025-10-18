-- Create venue_service_doctors table to support multiple doctors per service
CREATE TABLE public.venue_service_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_service_id UUID NOT NULL REFERENCES public.venue_services(id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_last_name VARCHAR(255) NOT NULL,
    service_total_price NUMERIC(10,2),
    service_duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_venue_service_doctors_venue_service_id ON public.venue_service_doctors(venue_service_id);
CREATE INDEX idx_venue_service_doctors_active ON public.venue_service_doctors(is_active);

-- Add RLS
ALTER TABLE public.venue_service_doctors ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE public.venue_service_doctors IS 'Multiple doctors can be assigned to the same venue service';
COMMENT ON COLUMN public.venue_service_doctors.venue_service_id IS 'References the venue service (service type)';
COMMENT ON COLUMN public.venue_service_doctors.doctor_name IS 'Doctor first name';
COMMENT ON COLUMN public.venue_service_doctors.doctor_last_name IS 'Doctor last name';
COMMENT ON COLUMN public.venue_service_doctors.service_total_price IS 'Price for this specific doctor providing the service';
COMMENT ON COLUMN public.venue_service_doctors.service_duration_minutes IS 'Duration in minutes for this doctor';

-- Create RLS policies
CREATE POLICY "Users can view venue service doctors" ON public.venue_service_doctors
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert venue service doctors" ON public.venue_service_doctors
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update venue service doctors" ON public.venue_service_doctors
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete venue service doctors" ON public.venue_service_doctors
    FOR DELETE USING (auth.role() = 'authenticated');
