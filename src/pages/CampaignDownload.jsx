import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";

export default function CampaignDownload() {
  const campaignContent = `
BEAN COFFEE - EMAIL DRIP CAMPAIGN STRATEGY
===========================================

Launch Date: TBD
Target Audience: Waitlist Signups
Objective: Warm up audience, build anticipation, drive engagement


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #1: WELCOME EMAIL (IMMEDIATE - DAY 0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: Welcome to BEAN, [Name]! Your Waitlist Confirmation
From: BEAN Coffee
Timing: Immediate upon signup

---

HTML TEMPLATE:

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F5F1ED; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #F5F1ED;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B7355 0%, #6B5744 100%); padding: 50px 30px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome to BEAN! 🎉</h1>
        </div>
        
        <!-- Body -->
        <div style="background-color: white; padding: 45px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);">
            
            <p style="font-size: 18px; color: #5C4A3A; line-height: 1.8; margin: 0 0 28px 0;">
                Hi <strong>[Name]</strong>,
            </p>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 36px 0;">
                Thank you for joining the waitlist for <strong>Islamabad's First Coffee Lover's Club!</strong> We're excited to have you as part of our founding community.
            </p>
            
            <!-- Perks Section -->
            <div style="background: linear-gradient(135deg, #FFF8F0 0%, #FFF3E6 100%); border-left: 5px solid #8B7355; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(139,115,85,0.1);">
                <h2 style="color: #8B7355; margin: 0 0 24px 0; font-size: 22px; font-weight: 700;">YOUR EARLY BIRD PERKS</h2>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ 50 Welcome Bonus Points</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Start earning rewards immediately</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ 10% Off First 3 Orders</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Exclusive early bird discount</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ Founding Member Badge</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">Special status forever</div>
                </div>
                
                <div>
                    <div style="color: #5C4A3A; font-weight: 600; margin-bottom: 6px;">✓ Priority Event Access</div>
                    <div style="font-size: 14px; color: #8B7355; padding-left: 20px;">First to know, first to go</div>
                </div>
            </div>
            
            <!-- Important Next Step -->
            <div style="background-color: #FFF3CD; border: 2px solid #FFC107; padding: 32px 28px; margin: 0 0 36px 0; border-radius: 10px; box-shadow: 0 2px 8px rgba(255,193,7,0.15);">
                <h3 style="color: #856404; margin: 0 0 18px 0; font-size: 20px; font-weight: 700;">⚠️ IMPORTANT NEXT STEP</h3>
                <p style="color: #856404; margin: 0 0 18px 0; line-height: 1.8; font-size: 15px;">
                    To complete your registration and secure your perks, please <strong>follow us on Instagram</strong> which is <strong>NEWLY</strong> live!
                </p>
                <div style="text-align: center; margin: 24px 0 18px 0;">
                    <a href="https://www.instagram.com/beanpakistan" style="display: inline-block; background: linear-gradient(135deg, #E1306C, #C13584, #833AB4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px;">
                        👉 Follow @beanpakistan
                    </a>
                </div>
                <p style="color: #856404; margin: 0; line-height: 1.8; font-size: 15px;">
                    In the meantime, stay tuned for exclusive updates about our launch!
                </p>
            </div>
            
            <!-- What's Next -->
            <div style="background-color: #F8F9FA; padding: 24px; margin: 0 0 36px 0; border-radius: 8px; border-left: 4px solid #8B7355;">
                <h3 style="color: #5C4A3A; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">What's Next?</h3>
                <p style="color: #5C4A3A; margin: 0; line-height: 1.8; font-size: 15px;">
                    We'll notify you via email when it's time to join the app and claim your rewards.
                </p>
            </div>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0 0 28px 0;">
                Questions? Just reply to this email. We can't wait to serve you at BEAN!
            </p>
            
            <p style="font-size: 16px; color: #5C4A3A; line-height: 1.8; margin: 0;">
                Best regards,<br>
                <strong style="font-size: 17px;">The BEAN Team</strong>
            </p>
            
            <hr style="border: none; border-top: 2px solid #E8DED8; margin: 40px 0 32px 0;">
            
            <p style="font-size: 13px; color: #8B7355; text-align: center; line-height: 1.7; margin: 0;">
                You're receiving this because you signed up for the BEAN Coffee waitlist.<br>
                If you didn't sign up, please ignore this email.
            </p>
        </div>
    </div>
</body>
</html>


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #2: COFFEE STORY & BEHIND THE SCENES (DAY 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: The Story Behind BEAN ☕
From: BEAN Coffee
Timing: 3 days after signup

---

Hi [Name],

We wanted to share what inspired us to create Islamabad's first Coffee Lover's Club.

[INSERT YOUR FOUNDER STORY HERE - Share your passion for coffee, what inspired you to start BEAN, your vision for the community]

WHAT MAKES BEAN DIFFERENT:
• Premium quality beans from [your sources]
• A real community of coffee enthusiasts
• Exclusive events and tastings
• Rewards that actually matter

We're not just another coffee shop - we're building a home for people who believe coffee is more than just a drink.

P.S. Have you followed us on Instagram yet? @beanpakistan - we're sharing behind-the-scenes content from our preparation!

Best,
The BEAN Team


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #3: SOCIAL PROOF & COMMUNITY TEASER (DAY 7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: 500+ Coffee Lovers Have Joined - Here's Why
From: BEAN Coffee
Timing: 7 days after signup

---

Hi [Name],

You're in good company! Over 500 coffee enthusiasts have already secured their founding member spot.

WHAT THEY'RE MOST EXCITED ABOUT:
✓ Secret tasting events where we try rare and exclusive beans
✓ Monthly brewing challenges with real prizes
✓ Free coffee rewards that actually add up
✓ Meeting fellow coffee lovers in Islamabad

"Finally a coffee lover's community is here. I always wondered why isn't there one in isb and rwp. Would love to share coffee moments with fellow coffee lovers and rewards from Bean are a bonus. Excited to be a founding member. Wohooo!!!" - Sarah K., Bahria Phase 7

[Include 2-3 more testimonials or quotes from early signups]

YOUR POSITION: You're #[position] on the waitlist

The first 500 get exclusive lifetime perks. You're already in! 🎉

See you soon,
The BEAN Team


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #4: EDUCATIONAL CONTENT (DAY 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: The Perfect Cup Starts Here: Coffee Tips from BEAN
From: BEAN Coffee
Timing: 10 days after signup

---

Hi [Name],

While you wait for launch, let's talk coffee! Here are 3 tips to elevate your home brewing game:

1. WATER TEMPERATURE MATTERS
   The sweet spot is 195-205°F (90-96°C). Too hot and you'll extract bitter compounds, too cool and you'll under-extract.

2. GRIND FRESH
   Coffee loses 60% of its flavor within 15 minutes of grinding. If possible, grind right before brewing.

3. RATIO IS KEY
   For pour-over, try a 1:15 ratio (1g coffee to 15g water). Adjust to taste, but this is a great starting point.

COMING SOON AT BEAN:
• Live brewing workshops with expert baristas
• Coffee tasting masterclasses
• Exclusive seasonal blend launches
• Monthly coffee challenges with prizes

Want more tips? We're sharing daily coffee content on @beanpakistan

Keep brewing,
The BEAN Team


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #5: COUNTDOWN & URGENCY (DAY 14)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: We're Getting Closer! + A Sneak Peek 👀
From: BEAN Coffee
Timing: 14 days after signup

---

Hi [Name],

Big news! We're in the final stages of launch preparation and wanted to give you an exclusive update.

LAUNCH TIMELINE:
🎯 App testing: This week
📱 Soft launch: [Insert estimated date]
🎉 Grand opening: [Insert estimated date]

SNEAK PEEK:
[Include images of your space, products, coffee equipment, or app screenshots]

We've been working hard to create an experience worth the wait. From our carefully curated bean selection to the design of every corner of BEAN - it's all coming together.

YOUR ACTION ITEMS:
✓ Follow @beanpakistan on Instagram ← Must do to stay updated!
✓ Enable email notifications (so you don't miss launch day)
✓ Share your referral link to move up the list

Your Referral Link: [Insert custom link with referral code]

For every friend who joins, you both move up 3 spots!

Almost there!
The BEAN Team


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #6: ENGAGEMENT & REFERRAL PUSH (DAY 21)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: Move Up the List + Win Early Access
From: BEAN Coffee
Timing: 21 days after signup

---

Hi [Name],

Current Position: #[position]

Want to jump ahead in line? Share your referral link with friends who love coffee!

REFERRAL REWARDS:
• Move up 3 spots for every friend who joins
• Both you AND your friend move up
• Top 10 referrers get FREE premium coffee bags at launch (worth PKR 3,000+)

Your Unique Link: [referral link]

HOW TO SHARE:
1. Copy your link above
2. Share on WhatsApp, Instagram stories, or with friends
3. Watch your position climb!

PRO TIP: Share on your Instagram story and tag @beanpakistan - we'll repost the best ones and give you bonus visibility!

LEADERBOARD UPDATE:
Current top referrers:
1. Ahmed M. - 47 referrals 🏆
2. Sara K. - 38 referrals 🥈
3. Hamza A. - 32 referrals 🥉

Can you make the top 10?

Questions about BEAN? Just reply to this email.

Cheers,
The BEAN Team


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #7: PRE-LAUNCH (2-3 DAYS BEFORE OPENING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: 🚨 BEAN Opens in 3 Days - Here's What to Expect
From: BEAN Coffee
Timing: 3 days before launch

---

Hi [Name],

The wait is almost over! BEAN officially opens in just 3 days.

LAUNCH DAY DETAILS:
📅 Date: [Specific date - e.g., March 20th, 2026]
⏰ Time: [Opening time - e.g., 8:00 AM]
📍 Location: [Full address with Google Maps link]

YOUR FOUNDING MEMBER PERKS ARE READY:
✓ 50 bonus points (pre-loaded in your account)
✓ 10% off your first 3 orders
✓ Founding member badge (visible in app)
✓ Priority access to all events

HOW TO CLAIM YOUR PERKS:
1. Download the BEAN app on [date]
   • iOS: [App Store link]
   • Android: [Google Play link]
2. Sign up with THIS email address: [their email]
3. Your perks will auto-activate!

OPENING WEEK SPECIAL:
First 100 customers to visit get a FREE limited edition BEAN tote bag + extra 25 points!

WHAT TO EXPECT:
• Full coffee menu with signature blends
• Cozy seating perfect for work or hangouts
• Fast WiFi
• Instagram-worthy aesthetic ☕📸

Set your reminder! Mark your calendar. Tell your friends.

We can't wait to see you there.

The BEAN Team

P.S. The first week tends to be busy - come early if you want to avoid lines!


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL #8: LAUNCH DAY (DAY OF OPENING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subject: 🎉 WE'RE LIVE! Claim Your Perks Now
From: BEAN Coffee
Timing: Launch day morning (6-7 AM)

---

Hi [Name],

TODAY IS THE DAY! BEAN is officially open and serving.

DOWNLOAD THE APP NOW:
📱 iOS: [App Store Button/Link]
📱 Android: [Google Play Button/Link]

YOUR LOGIN DETAILS:
Email: [their email]
→ Use this EXACT email address to activate your founding member perks automatically

OPENING DAY EXCLUSIVE:
☕ Buy 1 coffee, get 1 FREE (today only!)
🎁 First 100 visitors get limited edition tote bags
⭐ Double points on all purchases today

VISIT US TODAY:
📍 [Full Address]
🕐 [Hours - e.g., 8 AM - 10 PM]
🅿️ [Parking information]

WHAT'S ON THE MENU:
• Signature BEAN Blend
• Single Origin Pour-Overs
• Specialty Lattes
• Cold Brew
• Fresh Pastries
[Link to full menu]

YOUR FOUNDING MEMBER PERKS ARE ACTIVE:
✓ 50 points already in your account
✓ 10% discount auto-applied on your first 3 orders
✓ Exclusive badge showing you're an OG member

We can't wait to serve you your first cup at BEAN!

See you today! 🎉

Welcome home,
The BEAN Team

P.S. Don't forget to tag @beanpakistan in your stories - we're reposting throughout the day!


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAMPAIGN SUMMARY & BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMAIL TIMING SCHEDULE:
• Day 0: Welcome (immediate upon signup)
• Day 3: Brand Story
• Day 7: Social Proof
• Day 10: Educational Content
• Day 14: Countdown & Sneak Peek
• Day 21: Referral Push
• Day X-3: Pre-launch Details (3 days before opening)
• Day X: Launch Day Announcement

GOALS FOR EACH EMAIL:
1. Welcome - Confirm signup, set expectations, drive Instagram follow
2. Story - Build emotional connection, share vision
3. Social Proof - Create FOMO, show momentum
4. Education - Provide value, position as experts
5. Countdown - Build anticipation, drive urgency
6. Referrals - Viral growth, engagement
7. Pre-Launch - Prepare for launch, logistics
8. Launch - Drive immediate action, first visits

KEY METRICS TO TRACK:
• Open Rate (target: 40%+)
• Click-Through Rate (target: 10%+)
• Instagram Follow Conversion (target: 60%+)
• Referral Link Shares (target: 20%+)
• App Downloads on Launch (target: 70%+)

PERSONALIZATION VARIABLES TO USE IN GHL:
• {{contact.first_name}} or [Name]
• {{contact.email}}
• {{custom_field.waitlist_position}} or [position]
• {{custom_field.referral_code}} or [referral_code]
• {{custom_field.referral_link}} or [referral link]

COMPLIANCE & BEST PRACTICES:
• Always include unsubscribe link (GHL handles this automatically)
• Use consistent "From" name (BEAN Coffee)
• Mobile-responsive HTML (the welcome template is mobile-ready)
• Clear CTA in every email
• Valuable content in each message (not just promotional)

WARMING UP YOUR EMAIL DOMAIN:
• Start with Day 0 welcome emails only
• Monitor bounce rate and spam complaints
• If metrics are healthy after 100+ sends, add Day 3
• Gradually introduce remaining emails over 2-3 weeks
• Never send to inactive/old email lists

A/B TESTING IDEAS:
• Subject lines with vs without emojis
• Different CTAs (Download Now vs Get Started)
• Short vs long email formats
• Different send times (morning vs evening)

NEXT STEPS:
1. Import this content into GoHighLevel
2. Set up automation workflows for each email
3. Create custom fields for position and referral code
4. Test all email templates on mobile and desktop
5. Set up conversion tracking
6. Launch with welcome email first
7. Monitor metrics and adjust timing as needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Document Created: March 13, 2026
For: BEAN Coffee Waitlist Campaign
Platform: GoHighLevel (GHL)
Contact: support@bean.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const downloadCampaign = () => {
    const blob = new Blob([campaignContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BEAN-Email-Campaign-Strategy.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1ED] to-[#EBE5DF] p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-[#E8DED8] shadow-xl">
          <CardHeader className="text-center bg-gradient-to-br from-[#8B7355] to-[#6B5744] text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <FileText className="h-16 w-16" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">
              BEAN Email Campaign Strategy
            </CardTitle>
            <CardDescription className="text-white/90 text-lg">
              Complete drip campaign with 8 emails + HTML templates
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-6 rounded-lg">
                <h3 className="font-bold text-lg text-amber-900 mb-3">
                  📋 What's Included:
                </h3>
                <ul className="space-y-2 text-amber-800">
                  <li>✓ Complete HTML welcome email template</li>
                  <li>✓ 8-email drip sequence with timing</li>
                  <li>✓ Subject lines and content for each email</li>
                  <li>✓ Campaign strategy and best practices</li>
                  <li>✓ Personalization variables for GHL</li>
                  <li>✓ Metrics to track and A/B test ideas</li>
                  <li>✓ Email warming guidelines</li>
                </ul>
              </div>

              <div className="bg-white border border-[#E8DED8] p-6 rounded-lg">
                <h4 className="font-semibold text-[#5C4A3A] mb-3">
                  Email Schedule:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Day 0: Welcome</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Day 3: Story</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Day 7: Social Proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>Day 10: Education</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    <span>Day 14: Countdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span>Day 21: Referrals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>Day X-3: Pre-Launch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Day X: Launch</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <Button
                  onClick={downloadCampaign}
                  size="lg"
                  className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] hover:shadow-lg text-lg px-8 py-6"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Campaign Document
                </Button>
                <p className="text-sm text-[#8B7355] mt-4">
                  Plain text file - Ready to import into GoHighLevel
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                <strong>💡 Pro Tip:</strong> Open the downloaded file in any text editor and copy-paste each email directly into GoHighLevel's email builder. The HTML template is ready to use!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}