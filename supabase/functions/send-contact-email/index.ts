import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { withRateLimit, RATE_LIMIT_CONFIGS } from '../_shared/rate-limiting.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(origin, 'POST, OPTIONS')
  }

  // Apply rate limiting for email endpoints
  const rateLimitHandler = withRateLimit('email', corsHeaders);
  
  return rateLimitHandler(req, async (req) => {

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { name, email, subject, message } = await req.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Store the message in the database
    const { data: contactMessage, error: insertError } = await supabaseClient
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Send email notification using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      // Still return success since message was saved to database
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contact message received successfully',
          id: contactMessage.id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0;">New Contact Form Submission</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">From Dajavshne Gaming Platform</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Contact Details</h2>
            <p style="margin: 8px 0; color: #4b5563;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0; color: #4b5563;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0; color: #4b5563;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 8px 0; color: #4b5563;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Message</h3>
            <p style="color: #4b5563; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              Message ID: ${contactMessage.id}
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0 0 0;">
              Please respond to this inquiry promptly.
            </p>
          </div>
        </div>
      </div>
    `

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dajavshne Contact Form <noreply@dajavshne.io>',
        to: ['support@dajavshne.io'],
        reply_to: email,
        subject: `[Contact Form] ${subject}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text()
      console.error('Email sending failed:', emailError)
      
      // Update message status to indicate email failed
      await supabaseClient
        .from('contact_messages')
        .update({ status: 'email_failed' })
        .eq('id', contactMessage.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact message sent successfully',
        id: contactMessage.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
  });
})