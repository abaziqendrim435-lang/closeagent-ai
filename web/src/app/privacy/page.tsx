import type { Metadata } from "next";
import { ContactLine, H2, LegalPage } from "@/components/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains how {SITE.company} (&quot;we&quot;) collects and uses personal data when you use CloseAgent,
        and how we handle the public business contact details shown in the Service.
      </p>

      <H2>1. Data about our users</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong className="text-text">Account data:</strong> name, email address and an encrypted password.</li>
        <li><strong className="text-text">Workspace data:</strong> the offer description you enter, leads you search for or import, and drafts you generate.</li>
        <li><strong className="text-text">Billing data:</strong> handled by Stripe. We receive your subscription status and a customer ID, never your full card number.</li>
        <li><strong className="text-text">Usage data:</strong> counts of searches, drafts and lookups per month to apply plan limits, and basic technical logs.</li>
      </ul>
      <p>
        We use this data to provide and secure the Service, apply plan limits, process payments and contact you about your
        account. We do not sell your data and we do not use it for advertising.
      </p>

      <H2>2. Public contact data in the Service</H2>
      <p>
        CloseAgent shows business contact details that people or companies have published themselves — for example email
        addresses in a YouTube channel&apos;s public description or video descriptions, and company emails found through
        a professional email-lookup provider. We process this data on the basis of legitimate interest in enabling
        relevant, one-to-one business outreach. Results are stored only in the workspace of the user who searched for
        them.
      </p>
      <p>
        If your contact details appear in CloseAgent and you would like them removed or would like to object to their
        processing, contact us using the details below and we will delete them from our systems.
      </p>

      <H2>3. Service providers</H2>
      <p>We share data only with providers that help us run the Service:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Netlify — hosting</li>
        <li>Neon — database and authentication</li>
        <li>Stripe — payments</li>
        <li>OpenAI — generating email drafts from the lead and offer details you provide</li>
        <li>Google (YouTube Data API) — public channel and video information</li>
        <li>Hunter.io — public company email lookups</li>
      </ul>
      <p>
        Some providers are located in the United States. Where required, transfers are protected by appropriate
        safeguards such as Standard Contractual Clauses.
      </p>

      <H2>4. Cookies</H2>
      <p>
        We use only essential cookies needed to keep you signed in and secure the Service. We do not use advertising
        cookies.
      </p>

      <H2>5. Retention</H2>
      <p>
        We keep your account and workspace data while your account is active. When you ask us to delete your account, we delete
        your workspace data within 30 days, except records we must keep for legal or tax reasons.
      </p>

      <H2>6. Your rights</H2>
      <p>
        Depending on where you live (for example under the GDPR or US state privacy laws), you may have the right to
        access, correct, delete or export your personal data, to object to or restrict processing, and to complain to a
        data protection authority. To exercise these rights, contact us.
      </p>

      <H2>7. Security</H2>
      <p>
        Data is encrypted in transit, passwords are hashed, and access to production systems is restricted. No system is
        perfectly secure, but we work to protect your data.
      </p>

      <H2>8. Children</H2>
      <p>The Service is not intended for anyone under 18 and we do not knowingly collect their data.</p>

      <H2>9. Changes</H2>
      <p>We may update this policy and will notify you of material changes by email or in the app.</p>

      <H2>Contact</H2>
      <ContactLine />
    </LegalPage>
  );
}
