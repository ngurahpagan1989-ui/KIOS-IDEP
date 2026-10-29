// ==============================================================================
// KIOS IDEP - SUPABASE EDGE FUNCTION: send-push (Web Push VAPID Dispatcher)
// ==============================================================================
// Mengirimkan notifikasi Web Push terenkripsi (RFC 8291) ke perangkat HP Android,
// iPhone/iPad (PWA iOS 16.4+), dan Laptop meskipun aplikasi Kios IDEP sedang
// ditutup rapat atau layar HP terkunci (Lock Screen).
// ==============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:kios@idepfoundation.org';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'VAPID_PUBLIC_KEY atau VAPID_PRIVATE_KEY belum diset pada Edge Function Secrets.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const category = String(body.category || 'general').toLowerCase();
    const targetEndpoint = body.targetEndpoint ? String(body.targetEndpoint) : '';
    const excludeEndpoint = body.excludeEndpoint ? String(body.excludeEndpoint) : '';

    const pushPayload = JSON.stringify({
      id: body.id || `push-${Date.now()}`,
      category: category,
      title: body.title || '🔔 Kios IDEP',
      body: body.body || 'Ada pembaruan operasional baru di Kios IDEP.',
      route: body.route || '#dashboard',
      tag: body.tag || body.id || `idep-${category}-${Date.now()}`,
      urgent: Boolean(body.urgent),
      actor_name: body.actor_name || body.actor || 'Sistem',
      created_at: body.created_at || new Date().toISOString()
    });

    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, categories, preferences')
      .eq('active', true);

    if (targetEndpoint) {
      query = query.eq('endpoint', targetEndpoint);
    }

    const { data: subs, error: dbErr } = await query;
    if (dbErr) throw dbErr;

    let sent = 0;
    let skipped = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      (subs || []).map(async (sub) => {
        if (!targetEndpoint && excludeEndpoint && sub.endpoint === excludeEndpoint) {
          skipped++;
          return;
        }

        // Cek preferensi kategori di perangkat tujuan (kecuali tes langsung atau kategori 'general')
        if (!targetEndpoint && category !== 'general') {
          if (Array.isArray(sub.categories) && !sub.categories.includes(category)) {
            skipped++;
            return;
          }
          if (sub.preferences && typeof sub.preferences === 'object') {
            const prefs = sub.preferences as Record<string, boolean>;
            if (prefs[category] === false) {
              skipped++;
              return;
            }
          }
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload,
            {
              TTL: 86400,
              urgency: body.urgent ? 'high' : 'normal'
            }
          );
          sent++;
        } catch (pushErr: unknown) {
          const status = (pushErr as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            expiredIds.push(sub.id);
          } else {
            console.warn('[send-push] Gagal kirim ke satu endpoint:', status, pushErr);
          }
        }
      })
    );

    if (expiredIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ active: false, updated_at: new Date().toISOString() })
        .in('id', expiredIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        skipped,
        cleaned_expired: expiredIds.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
