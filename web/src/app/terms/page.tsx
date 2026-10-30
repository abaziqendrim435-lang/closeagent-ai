import type { Metadata } from "next";
import { ContactLine, H2, LegalPage } from "@/components/legal";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms govern your use of CloseAgent (the &quot;Service&quot;), operated by {SITE.company} (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using the Service you agree to these Terms. If you use the Service on
        behalf of a company, you confirm you may bind that company to them.
      </p>

      <H2>1. The Service</H2>
      <p>
        CloseAgent helps you find YouTube creators and company contacts with publicly available business contact details
        and drafts personalized outreach emails with AI. CloseAgent does not send emails on your behalf. You decide whether,
        to whom and how you send any message.
      </p>

      <H2>2. Accounts</H2>
      <p>
        You must be at least 18 years old and provide accurate account information. You are responsible for keeping your
        password secure and for all activity under your account.
      </p>

      <H2>3. Acceptable use</H2>
      <p>You agree not to use the Service to:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>send spam, bulk unsolicited messages, or messages that are misleading, harassing or unlawful;</li>
        <li>violate anti-spam, privacy or marketing laws, including CAN-SPAM, GDPR, CASL or similar rules;</li>
        <li>contact people who have asked not to be contacted, or ignore opt-out requests;</li>
        <li>resell, scrape or bulk-export data from the Service to build a contact database for third parties;</li>
        <li>attempt to bypass usage limits, reverse engineer, or disrupt the Service.</li>
      </ul>
      <p>
        You are solely responsible for your outreach and for complying with the laws that apply to you and your
        recipients. We may suspend or terminate accounts that violate these Terms.
      </p>

      <H2>4. AI-generated content</H2>
      <p>
        Drafts are generated automatically and may contain mistakes. Review and edit every draft before sending. You are
        responsible for the content you send.
      </p>

      <H2>5. Plans, billing and cancellation</H2>
      <p>
        The Free plan is offered at no cost with the limits shown on our pricing page. The Pro plan costs{" "}
        {PLANS.pro.price}, billed in advance each month through our payment processor, Stripe, and renews automatically
        until cancelled. You can cancel at any time from your account settings; Pro stays active until the end of the paid
        period. Except where required by law, payments are non-refundable. Usage limits reset each calendar month and
        unused usage does not carry over. We may change prices with at least 30 days&apos; notice before your next billing
        period.
      </p>

      <H2>6. Data and third-party services</H2>
      <p>
        Contact details shown in the Service come from public sources and third-party providers and may be incomplete or
        out of date. The Service relies on third-party services (for example YouTube, email-lookup and AI providers) and we
        are not responsible for their availability or accuracy. Our handling of personal data is described in our{" "}
        <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>.
      </p>

      <H2>7. Intellectual property</H2>
      <p>
        We own the Service and its software. You own the leads you import and the drafts you generate, and you grant us
        the limited rights needed to operate the Service for you.
      </p>

      <H2>8. Disclaimers and limitation of liability</H2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, to the
        extent permitted by law. To the maximum extent permitted by law, our total liability for any claim relating to the
        Service is limited to the amount you paid us in the 12 months before the claim. We are not liable for indirect,
        incidental or consequential damages, lost profits or lost data.
      </p>

      <H2>9. Indemnity</H2>
      <p>
        You agree to indemnify us against claims arising from the messages you send or your violation of these Terms or
        applicable law.
      </p>

      <H2>10. Termination</H2>
      <p>
        You may stop using the Service at any time and ask us to delete your account. We may suspend or end access if you breach
        these Terms or if required by law.
      </p>

      <H2>11. Governing law</H2>
      <p>
        These Terms are governed by the laws of the State of Wyoming, USA, without regard to conflict-of-law rules, except
        where mandatory consumer protection laws of your country apply.
      </p>

      <H2>12. Changes</H2>
      <p>
        We may update these Terms. If changes are material we will notify you by email or in the app. Continued use after
        the update means you accept the new Terms.
      </p>

      <H2>Contact</H2>
      <ContactLine />
    </LegalPage>
  );
}
