async function verifyTurnstile(token, secretKey) {
    const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const body = new URLSearchParams({
        secret: secretKey,
        response: token,
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await response.json();
    return data.success;
}

export async function onRequestPost({ request, env }) {
    try {
        const formData = await request.formData();

        const firstName = formData.get('first_name')?.trim();
        const lastName = formData.get('last_name')?.trim();
        const title = formData.get('title')?.trim();
        const institution = formData.get('institution')?.trim();
        const email = formData.get('email')?.trim();
        const message = formData.get('message')?.trim();
        const turnstileToken = formData.get('cf-turnstile-response');

        if (!turnstileToken) {
            return new Response(JSON.stringify({ message: 'Missing CAPTCHA token.' }), { status: 400 });
        }
        const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
        if (!isHuman) {
            return new Response(JSON.stringify({ message: 'Human verification failed. Please try again.' }), { status: 403 });
        }

        if (!firstName || !lastName || !email || !message) {
            return new Response(JSON.stringify({ message: 'Please fill out all required fields.' }), { status: 400 });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return new Response(JSON.stringify({ message: 'Please provide a valid email address.' }), { status: 400 });
        }

        const emailHtml = `
      <h3>New Contact Form Submission</h3>
      <p><strong>First Name:</strong> ${firstName}</p>
      <p><strong>Last Name:</strong> ${lastName}</p>
      ${title ? `<p><strong>Title:</strong> ${title}</p>` : ''}
      ${institution ? `<p><strong>Institution:</strong> ${institution}</p>` : ''}
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <hr>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `;

        const emailPayload = {
            from: 'Contact Form <onboarding@resend.dev>',
            to: ['info@predicatehighered.com'],
            subject: `New Lead from ${firstName} ${lastName}`,
            html: emailHtml,
            reply_to: `${firstName} ${lastName} <${email}>`
        };

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
            console.error('Resend API Error:', await response.text());
            return new Response(JSON.stringify({ message: 'There was an error sending your message.' }), { status: 500 });
        }

        return new Response(JSON.stringify({ message: 'Thank you! Your message has been sent.' }), { status: 200 });

    } catch (error) {
        console.error('Submission Error:', error);
        return new Response(JSON.stringify({ message: 'An internal server error occurred.' }), { status: 500 });
    }
}