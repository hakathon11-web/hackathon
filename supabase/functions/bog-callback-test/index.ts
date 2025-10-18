// @ts-nocheck
// Minimal test callback to debug BOG integration

Deno.serve(async (req) => {
  console.log('🧪 TEST CALLBACK called - method:', req.method)
  console.log('🧪 Headers:', Object.fromEntries(req.headers.entries()))

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type'
      }
    })
  }

  try {
    const body = await req.text()
    console.log('🧪 Raw body:', body)
    
    let payload
    try {
      payload = JSON.parse(body)
      console.log('🧪 Parsed payload:', JSON.stringify(payload, null, 2))
    } catch (e) {
      console.log('🧪 Non-JSON body received')
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      received: true,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('🧪 Test callback error:', error)
    return new Response(JSON.stringify({ 
      error: 'Test callback failed',
      details: String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
});
