import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiting.ts'

interface PartnerLeadPayload {
  name: string
  businessName: string
  phone: string
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  const rateLimitHandler = withRateLimit('email', corsHeaders)

  return rateLimitHandler(req, async (req) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { name, businessName, phone } = (await req.json()) as PartnerLeadPayload

      if (!name || !businessName || !phone) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const sanitizedName = String(name).trim().slice(0, 200)
      const sanitizedBusiness = String(businessName).trim().slice(0, 200)
      const sanitizedPhone = String(phone).trim().slice(0, 50)

      // Basic phone validation: allow +, digits, spaces, dashes, parentheses
      const phoneRegex = /^[+\d][0-9\s\-()]{6,}$/
      if (!phoneRegex.test(sanitizedPhone)) {
        return new Response(JSON.stringify({ error: 'Invalid phone format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Try to store in partner_leads (optional if table exists)
      let leadId: string | null = null
      try {
        const { data, error } = await supabase
          .from('partner_leads')
          .insert({
            name: sanitizedName,
            business_name: sanitizedBusiness,
            phone: sanitizedPhone,
          })
          .select('id')
          .single()
        if (error) {
          console.error('partner_leads insert error:', error)
        } else {
          leadId = data?.id ?? null
        }
      } catch (e) {
        console.error('partner_leads insert exception:', e)
      }

      const resendApiKey = Deno.env.get('RESEND_API_KEY')

      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ success: true, message: 'Lead received', id: leadId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #111827; margin: 0;">New Partner Lead</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Dajavshne Platform</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <p style="margin: 6px 0; color: #374151;"><strong>Name:</strong> ${sanitizedName}</p>
              <p style="margin: 6px 0; color: #374151;"><strong>Business Name:</strong> ${sanitizedBusiness}</p>
              <p style="margin: 6px 0; color: #374151;"><strong>Phone:</strong> ${sanitizedPhone}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px;">${leadId ? `Lead ID: ${leadId} • ` : ''}${new Date().toISOString()}</p>
          </div>
        </div>
      `

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Dajavshne <noreply@dajavshne.io>',
          to: ['admin@dajavshne.io'],
          subject: 'New Partner Lead',
          html: emailHtml,
        }),
      })

      if (!emailResponse.ok) {
        const body = await emailResponse.text()
        console.error('send-partner-lead email failed:', body)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Lead submitted', id: leadId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (error) {
      console.error('send-partner-lead error:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  })
})


