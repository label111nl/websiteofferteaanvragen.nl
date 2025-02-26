import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

// Ensure environment variables exist
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables')
}

const stripe = new Stripe('', { apiVersion: '2023-10-16' })

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), { status: 400 })
  }

  const body = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Update transaction status
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .update({ status: 'completed' })
          .eq('stripe_session_id', session.id)

        if (transactionError) {
          console.error('❌ Error updating transaction:', transactionError)
          throw transactionError
        }

        // Retrieve transaction details
        const { data: transaction, error: fetchError } = await supabase
          .from('credit_transactions')
          .select('user_id, amount')
          .eq('stripe_session_id', session.id)
          .single()

        if (fetchError || !transaction) {
          console.error('❌ Error fetching transaction:', fetchError)
          throw new Error('Transaction not found')
        }

        // Add credits to user
        const { error: creditError } = await supabase.rpc('add_credits', { 
          user_id: transaction.user_id, 
          amount: transaction.amount 
        })

        if (creditError) {
          console.error('❌ Error adding credits:', creditError)
          throw creditError
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('⚠️ Payment expired for session:', session.id)

        // Update transaction status
        const { error } = await supabase
          .from('credit_transactions')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id)

        if (error) {
          console.error('❌ Error updating expired transaction:', error)
          throw error
        }
        break
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('❌ Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})