import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for Footy Break Evens. Informational only and not legal advice.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: March 17, 2026</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm leading-6 text-muted">
          This Privacy Policy describes how Footy Break Evens collects, uses,
          stores, and discloses information when you use this website.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Scope and Controller</h2>
        <p className="text-sm leading-6 text-muted">
          For this website, Footy Break Evens acts as the data controller for
          information described in this policy. This policy applies to data
          collected through this website and related analytics tooling.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Information We Collect</h2>
        <p className="text-sm leading-6 text-muted">
          We may collect: usage data (pages viewed, feature interactions, basic
          event telemetry), technical data (browser, device type, IP-derived
          geolocation at a coarse level, timestamps), and data you voluntarily
          provide in direct communications. We do not intentionally collect
          sensitive personal information.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">How We Use Information</h2>
        <p className="text-sm leading-6 text-muted">
          We use collected information to operate and secure the site, diagnose
          issues, improve user experience and feature quality, and understand
          product usage trends.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Legal Bases</h2>
        <p className="text-sm leading-6 text-muted">
          Depending on your location, we process data based on one or more of
          the following legal bases: consent, legitimate interests (such as
          security and product improvement), and compliance with legal
          obligations.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Cookies and Analytics</h2>
        <p className="text-sm leading-6 text-muted">
          We may use cookies and similar technologies for session continuity,
          analytics, and measurement. You can manage or disable cookies through
          your browser settings, but some site features may be affected.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Third-Party Processors</h2>
        <p className="text-sm leading-6 text-muted">
          We use third-party service providers for hosting, analytics, and
          operations. Those providers may process information on our behalf
          under their own terms and privacy policies.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">International Transfers</h2>
        <p className="text-sm leading-6 text-muted">
          Data may be processed in countries other than your own. Where
          required, we use reasonable safeguards for cross-border transfers.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Data Retention</h2>
        <p className="text-sm leading-6 text-muted">
          We retain data only for as long as reasonably necessary for service
          operation, security, analytics, legal compliance, and dispute
          resolution.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm leading-6 text-muted">
          We apply reasonable technical and organizational measures to protect
          information, but no internet transmission or storage method is fully
          secure.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Your Privacy Rights</h2>
        <p className="text-sm leading-6 text-muted">
          Subject to applicable law, you may have rights to access, correct,
          delete, or restrict use of personal information, and to object to
          certain processing activities.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Children&apos;s Privacy</h2>
        <p className="text-sm leading-6 text-muted">
          This website is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Policy Updates</h2>
        <p className="text-sm leading-6 text-muted">
          We may update this policy from time to time. The &quot;Last updated&quot; date
          at the top reflects the latest revision.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm leading-6 text-muted">
          For privacy-related requests, contact us through the same project
          channel where you use Footy Break Evens.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Independence Disclaimer</h2>
        <p className="text-sm leading-6 text-muted">
          Footy Break Evens is an independent project and is not associated
          with, endorsed by, or affiliated with NRL, NRL Fantasy, or the
          National Rugby League.
        </p>
      </section>

      <footer className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <p className="text-xs leading-5 text-muted">
          Legal notice: This page is provided for general informational purposes
          only and does not constitute legal advice.
        </p>
      </footer>
    </div>
  );
}
