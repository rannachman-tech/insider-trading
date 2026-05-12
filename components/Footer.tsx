export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              About
            </h4>
            <p className="mt-2 text-[13px] text-fg-muted leading-relaxed">
              When a CEO, CFO or director buys their own company's stock with personal cash on the open market, they're signalling something the market hasn't priced in yet. Insider Signal watches those filings live from the SEC, throws out the routine noise — grants, options, pre-scheduled sales — and ranks who's really buying and how strongly.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-subtle">
              What we filter out
            </h4>
            <ul className="mt-2 text-[13px] text-fg-muted space-y-1.5 leading-relaxed">
              <li>
                <span className="text-fg">Stock grants and bonuses</span>
                <span className="text-fg-subtle"> — compensation, not conviction</span>
              </li>
              <li>
                <span className="text-fg">Option exercises</span>
                <span className="text-fg-subtle"> — cash-out moves, not new buying</span>
              </li>
              <li>
                <span className="text-fg">Pre-scheduled sales (10b5-1)</span>
                <span className="text-fg-subtle"> — set months ahead, no timing signal</span>
              </li>
              <li>
                <span className="text-fg">Tax-withholding sales</span>
                <span className="text-fg-subtle"> — triggered automatically by RSU vests</span>
              </li>
              <li>
                <span className="text-fg">Anything below $25,000</span>
                <span className="text-fg-subtle"> — too small to matter</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-[11px] text-fg-subtle leading-relaxed space-y-2">
          <p>
            Insider Signal is provided for educational purposes only and does not constitute investment advice. Insider activity is one signal among many. Past insider purchases do not predict future returns. Trading involves risk, including the loss of capital.
          </p>
          <p>
            Form 4 filings are filed with a delay of up to two business days. The Insider Conviction Index is a heuristic — read the source filings on EDGAR before making decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
