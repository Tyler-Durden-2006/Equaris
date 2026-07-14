/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Equaris brand mark — a line-art wallet with cash peeking out and a gold
 * dividing slash (the "split"). The wallet strokes inherit `currentColor` so it
 * adapts to its surface (cream on the maroon sidebar, maroon on light headers);
 * the slash always uses the gold accent token.
 */
export const EquarisLogo: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 40 34"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* cash / note peeking out the top */}
    <path d="M11 11 L25.5 6 a2.2 2.2 0 0 1 2.8 1.3 L30 11" />
    {/* wallet body */}
    <rect x="4" y="11" width="31" height="19" rx="4.5" />
    {/* clasp */}
    <path d="M35 17.6 h2.4 a2 2 0 0 1 2 2 v2.6 a2 2 0 0 1 -2 2 H35" />
    <circle cx="35.4" cy="20.9" r="1.15" fill="currentColor" stroke="none" />
    {/* gold dividing slash */}
    <path d="M28 7.5 L14.5 30" stroke="var(--gold, #c7a15c)" strokeWidth={2.4} />
  </svg>
);
