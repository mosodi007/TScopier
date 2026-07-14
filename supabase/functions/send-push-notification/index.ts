/**
 * Sends Expo push notifications when trade execution logs are inserted.
 * Configure EXPO_ACCESS_TOKEN in Supabase secrets for production delivery.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushRequest {
  user_id: string
  title: string
  body: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as PushRequest
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', payload.user_id)

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const messages = tokens.map(row => ({
      to: row.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
    }))

    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN')
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
      },
      body: JSON.stringify(messages),
    })

    const result = await res.json()
    return new Response(JSON.stringify({ sent: messages.length, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
