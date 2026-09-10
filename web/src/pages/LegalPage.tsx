import { Link } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Card } from "../components/ui/Card";
import { useLocale } from "../context/LocaleContext";
import { privacyNotice } from "../content/privacy";
import { termsDocument } from "../content/terms";
import type { BilingualDocument, LegalBlock } from "../content/legalTypes";

// One component for both documents. They differ only in content, and giving
// them separate layouts would guarantee that a fix to one is missed in the
// other — the failure this codebase keeps meeting.

function Blocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        // Index keys are safe here and only here: these arrays are static
        // module constants that never reorder at runtime.
        const key = index;

        if (block.kind === "p") {
          return (
            <p className="legal-p" key={key}>
              {block.text}
            </p>
          );
        }

        if (block.kind === "note") {
          return (
            <Card className="legal-note" key={key} variant="soft">
              <p className="legal-p">{block.text}</p>
            </Card>
          );
        }

        if (block.kind === "ul") {
          return (
            <ul className="legal-list" key={key}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <div className="legal-table-wrap" key={key}>
            <table className="legal-table">
              <thead>
                <tr>
                  <th scope="col">{block.head[0]}</th>
                  <th scope="col">{block.head[1]}</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map(([left, right]) => (
                  <tr key={left}>
                    <th scope="row">{left}</th>
                    <td>{right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

function LegalDocumentView({ document }: { document: BilingualDocument }) {
  const { locale, t } = useLocale();
  const content = document[locale];

  return (
    <main className="app-shell app-shell--wide public-shell">
      <div className="page">
        <TopNav fallbackBackTo="/" title={content.title} />

        <article className="legal">
          <header className="page-heading">
            <h1>{content.title}</h1>
            <p className="small muted">{content.updated}</p>
          </header>

          <Blocks blocks={content.intro} />

          {content.sections.map((section) => (
            <section className="legal-section" key={section.heading}>
              <h2>{section.heading}</h2>
              <Blocks blocks={section.blocks} />
            </section>
          ))}

          {/* Each document points at the other. Someone reading the privacy
              notice because a consent checkbox sent them there is one click
              from the thing that checkbox also referred to. */}
          <p className="small muted legal-crosslink">
            {document === privacyNotice ? (
              <Link to="/terms">{t("Terms of Service")}</Link>
            ) : (
              <Link to="/privacy">{t("Privacy Notice")}</Link>
            )}
          </p>
        </article>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return <LegalDocumentView document={privacyNotice} />;
}

export function TermsPage() {
  return <LegalDocumentView document={termsDocument} />;
}
