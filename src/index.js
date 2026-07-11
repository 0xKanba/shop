export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // التعامل مع CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // نقطة نهاية للتصحيح - تخبرك إذا كانت الـ secrets موجودة
    if (url.pathname === '/debug') {
      return new Response(JSON.stringify({
        hasBotToken: !!env.BOT_TOKEN,
        hasChatId: !!env.CHAT_ID,
        botTokenLength: env.BOT_TOKEN ? env.BOT_TOKEN.length : 0,
        chatId: env.CHAT_ID || 'not set'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // مسار إرسال الطلبات إلى Telegram
    if (url.pathname === '/order' && request.method === 'POST') {
      try {
        // التحقق من وجود الـ secrets
        if (!env.BOT_TOKEN || !env.CHAT_ID) {
          return new Response(JSON.stringify({ 
            error: 'غير مصرح',
            details: 'Missing BOT_TOKEN or CHAT_ID secrets. Please add them in Cloudflare Dashboard.'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const orderData = await request.json();
        
        // تنسيق الرسالة
        let message = `🛒 **طلب جديد!**\n\n`;
        message += `👤 **الاسم:** ${orderData.customerName || 'N/A'}\n`;
        message += `📱 **الهاتف:** ${orderData.phoneNumber || 'N/A'}\n`;
        message += `📍 **العنوان:** ${orderData.address || 'N/A'}\n\n`;
        
        if (orderData.items && Array.isArray(orderData.items)) {
          message += `**المنتجات:**\n`;
          orderData.items.forEach(item => {
            message += `  • ${item.name || 'Item'} (${item.quantity || 1} قطعة)\n`;
          });
        }
        
        message += `\n💰 **المجموع:** ${orderData.total ? orderData.total.toLocaleString() : '0'} د.ع`;

        // إرسال إلى Telegram
        const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        const result = await response.json();
        
        if (result.ok) {
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Order sent successfully to Telegram'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          console.error('Telegram API Error:', result);
          return new Response(JSON.stringify({ 
            error: 'Failed to send to Telegram',
            telegramError: result.description
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Order Error:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
