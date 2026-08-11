"use client";

import type { EpisodeFaqItem } from "@/lib/podcastData";

interface EpisodeFaqProps {
  faq: EpisodeFaqItem[];
}

const EpisodeFaq = ({ faq }: EpisodeFaqProps) => {
  if (!faq || faq.length === 0) return null;

  return (
    <div className="max-w-prose">
      <h2 className="text-section-header font-medium text-foreground mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-6">
        {faq.map((item) => (
          <div key={item.question}>
            <h3 className="text-sm lg:text-base font-medium text-foreground mb-2">
              {item.question}
            </h3>
            <p className="text-sm lg:text-base text-foreground/80 leading-relaxed">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EpisodeFaq;
