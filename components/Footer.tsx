import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              About
            </h4>
            <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">
              Insiders Activity Compass surfaces the small slice of insider filings that historically carry signal — open-market personal-cash purchases by company officers and directors. Built on free SEC EDGAR data.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              What we filter out
            </h4>
            <ul className="mt-2 text-[13px] text-fg-muted space-y-1 leading-relaxed">
              <li>Stock grants and bonuses</li>
              <li>Option exercises</li>
              <li>Pre-scheduled sales</li>
              <li>Tax-withholding sales</li>
              <li>Anything below $25,000</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              More from Compass
            </h4>
            <ul className="mt-2 text-[13px] space-y-1">
              <li>
                <a href="https://compass.etoro.com/recession" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-emerald inline-flex items-center gap-1">
                  Recession Compass <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://compass.etoro.com/stock-cycle" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-emerald inline-flex items-center gap-1">
                  Stock Cycle Compass <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://compass.etoro.com/bondspace" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-emerald inline-flex items-center gap-1">
                  BondSpace <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-[11px] text-fg-subtle leading-relaxed space-y-2">
          <p>
            Insiders Activity Compass is provided for educational purposes only and does not constitute investment advice. Insider activity is one signal among many. Past insider purchases do not predict future returns. Trading involves risk, including the loss of capital.
          </p>
          <p>
            Form 4 filings are filed with a delay of up to two business days. The Insider Conviction Index is a heuristic — read the source filings on EDGAR before making decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
