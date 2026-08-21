import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(email: string, otp: string, purpose: string) {
  const subject = purpose === 'register' 
    ? 'UnityPulse - রেজিস্ট্রেশন OTP কোড' 
    : 'UnityPulse - পাসওয়ার্ড রিসেট OTP কোড';
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'UnityPulse <onboarding@resend.dev>', // Development
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f7f0; margin: 0; padding: 40px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(46, 204, 113, 0.12); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); padding: 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 8px;">🌿</div>
              <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">UNITYPULSE</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 5px 0 0 0;">Community United for Change</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; text-align: center;">
              <h2 style="color: #1a2e23; font-size: 18px; margin: 0 0 20px 0;">
                ${purpose === 'register' ? 'আপনার OTP কোড (রেজিস্ট্রেশন)' : 'আপনার OTP কোড (পাসওয়ার্ড রিসেট)'}
              </h2>
              
              <!-- OTP Box -->
              <div style="background: #f8faf9; border: 2px dashed #2ecc71; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h1 style="font-family: 'Courier New', monospace; font-size: 36px; color: #2ecc71; letter-spacing: 8px; margin: 0;">
                  ${otp}
                </h1>
              </div>
              
              <p style="color: #5a7d6a; font-size: 14px; line-height: 1.6; margin: 15px 0;">
                এই কোডটি <strong>৫ মিনিটের</strong> মধ্যে ব্যবহার করুন।<br>
                কারো সাথে শেয়ার করবেন না।
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e8f5ee; margin: 20px 0;" />
              
              <!-- Footer -->
              <p style="color: #8ba89a; font-size: 12px; line-height: 1.5;">
                আপনি যদি এই OTP অনুরোধ না করে থাকেন,<br>
                এই ইমেইলটি উপেক্ষা করুন।
              </p>
            </div>
            
            <!-- Footer Bar -->
            <div style="background: #f8faf9; padding: 15px; text-align: center; border-top: 1px solid #e8f5ee;">
              <p style="color: #8ba89a; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} UnityPulse. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log(`✅ OTP email sent to ${email}`);
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}