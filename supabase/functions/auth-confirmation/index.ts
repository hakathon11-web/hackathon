import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailData {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      role?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ConfirmationEmailData = await req.json();
    console.log('Processing email confirmation for user');

    const { user, email_data } = payload;
    const isPartner = user.user_metadata?.role === 'partner';
    const userName = user.user_metadata?.full_name || user.email;

    // Build confirmation URL
    const confirmationUrl = `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;

    // Create email content based on user type
    const emailContent = isPartner ? {
      subject: "Confirm your Partner Account - VenueSpot",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Your Partner Account</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; padding: 40px 0 30px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #8B5CF6, #A855F7); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M3 21h18l-9-18z"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
              </svg>
            </div>
            <h1 style="color: #8B5CF6; margin: 0; font-size: 28px; font-weight: 700;">Welcome to VenueSpot Partner Portal</h1>
            <p style="color: #6B7280; font-size: 16px; margin: 10px 0 0;">Confirm your account to start managing your venues</p>
          </div>

          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 30px; margin: 20px 0;">
            <h2 style="color: #111827; margin: 0 0 15px; font-size: 20px;">Hello ${userName}!</h2>
            <p style="color: #4B5563; margin: 0 0 20px; font-size: 16px;">
              Thank you for joining VenueSpot as a partner! To complete your registration and start managing your venues, please confirm your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #A855F7); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                Confirm Partner Account
              </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0; text-align: center;">
              This link will expire in 24 hours for security purposes.
            </p>
          </div>

          <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 10px; font-size: 16px;">What's next?</h3>
            <ul style="color: #6B7280; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Set up your partner profile</li>
              <li style="margin-bottom: 8px;">Add your first venue</li>
              <li style="margin-bottom: 8px;">Start receiving bookings</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0; padding: 20px 0; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `
    } : {
      subject: "Welcome to VenueSpot - Confirm Your Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to VenueSpot</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; padding: 40px 0 30px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #8B5CF6, #EC4899); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h1 style="background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-size: 28px; font-weight: 700;">Welcome to VenueSpot!</h1>
            <p style="color: #6B7280; font-size: 16px; margin: 10px 0 0;">Discover amazing venues around you</p>
          </div>

          <div style="background: linear-gradient(135deg, #F9FAFB, #FFF7ED); border: 1px solid #E5E7EB; border-radius: 12px; padding: 30px; margin: 20px 0;">
            <h2 style="color: #111827; margin: 0 0 15px; font-size: 20px;">Hi ${userName}! 🎉</h2>
            <p style="color: #4B5563; margin: 0 0 20px; font-size: 16px;">
              Welcome to VenueSpot! We're excited to have you join our community. To get started discovering and booking amazing venues, please confirm your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                Confirm My Account
              </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0; text-align: center;">
              This link will expire in 24 hours for security purposes.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #F0F9FF, #FEF3C7); border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 10px; font-size: 16px;">Start exploring:</h3>
            <ul style="color: #6B7280; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Browse venues by services</li>
              <li style="margin-bottom: 8px;">Save your favorite venues</li>
              <li style="margin-bottom: 8px;">Book services instantly</li>
              <li style="margin-bottom: 8px;">Track your booking history</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0; padding: 20px 0; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const emailResponse = await resend.emails.send({
      from: "Dajavshne <noreply@noreply.dajavshne.io>",
      to: [user.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Confirmation email sent",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in auth-confirmation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);