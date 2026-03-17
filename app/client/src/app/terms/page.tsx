import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of use for Footy Break Evens. Informational only and not legal advice.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Terms of Use</h1>
        <p className="text-sm text-muted">Last updated: March 17, 2026</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm leading-6 text-muted">
          These Terms of Use govern access to and use of Footy Break Evens. By
          using this website, you agree to these terms.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Eligibility and Acceptance</h2>
        <p className="text-sm leading-6 text-muted">
          You must comply with applicable laws when using this website. If you
          do not agree to these terms, do not use the service.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Service Scope</h2>
        <p className="text-sm leading-6 text-muted">
          Footy Break Evens provides independent fantasy-analysis tools,
          statistics, and informational content for general information use.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">No Professional Advice</h2>
        <p className="text-sm leading-6 text-muted">
          Content is not financial, legal, betting, or professional advice. You
          are solely responsible for your fantasy, sports, and other decisions.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Data Sources and Accuracy</h2>
        <p className="text-sm leading-6 text-muted">
          We source and process data from third parties. We do not guarantee
          data completeness, timeliness, availability, or accuracy.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Availability and Changes</h2>
        <p className="text-sm leading-6 text-muted">
          We may modify, suspend, or discontinue any feature at any time without
          notice. We do not guarantee uninterrupted or error-free operation.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Acceptable Use</h2>
        <p className="text-sm leading-6 text-muted">
          You agree not to misuse the website, attempt unauthorized access,
          interfere with infrastructure, scrape at harmful volume, or use the
          service in a way that degrades availability for others.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Intellectual Property</h2>
        <p className="text-sm leading-6 text-muted">
          Footy Break Evens content, branding, and implementation are owned by
          this project unless otherwise stated. Third-party names, logos, marks,
          and competition data remain the property of their respective owners.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Third-Party Links and Services</h2>
        <p className="text-sm leading-6 text-muted">
          The website may reference or link to third-party services. We are not
          responsible for the content, security, or practices of third-party
          sites.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Disclaimer of Warranties</h2>
        <p className="text-sm leading-6 text-muted">
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis,
          without warranties of any kind, to the fullest extent permitted by
          applicable law.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Limitation of Liability</h2>
        <p className="text-sm leading-6 text-muted">
          To the maximum extent permitted by law, Footy Break Evens is not
          liable for indirect, incidental, special, consequential, or punitive
          damages, or for loss of data, profits, or opportunity arising from use
          of the site.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Indemnity</h2>
        <p className="text-sm leading-6 text-muted">
          You agree to indemnify and hold harmless Footy Break Evens from claims
          arising out of your misuse of the website or your breach of these
          terms.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Termination</h2>
        <p className="text-sm leading-6 text-muted">
          We may restrict or terminate access if misuse, abuse, or harmful
          behavior is detected.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Changes to These Terms</h2>
        <p className="text-sm leading-6 text-muted">
          We may update these terms from time to time. Continued use after an
          update means you accept the revised terms.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Governing Law</h2>
        <p className="text-sm leading-6 text-muted">
          Unless mandatory local law states otherwise, these terms are governed
          by the laws of New Zealand.
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

      <section className="space-y-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm leading-6 text-muted">
          For questions about these terms, contact us through the same project
          channel where you use Footy Break Evens.
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
