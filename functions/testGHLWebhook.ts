import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const ghlWebhookUrl = "https://services.leadconnectorhq.com/hooks/gj8OBCLmVBdkG2uJwiTN/webhook-trigger/fe044896-846d-465d-8078-0f9eeb44bcb7";
        
        // Send test data to GHL webhook
        const response = await fetch(ghlWebhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                position: 1,
                referralCode: "JOHN1234"
            }),
        });

        const responseText = await response.text();

        return Response.json({
            success: true,
            status: response.status,
            message: "Test webhook sent to GoHighLevel",
            ghlResponse: responseText
        });
    } catch (error) {
        console.error("Error sending test webhook:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});