"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type AppFaqItem = {
  question: string;
  answer: string;
};

export default function AppFaqList({ items }: { items: AppFaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;

        return (
          <section
            key={item.question}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)]"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? -1 : index)}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-base font-black tracking-[-0.02em] text-zinc-950">
                {item.question}
              </span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-zinc-400 transition ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open ? (
              <p className="border-t border-zinc-100 px-4 py-4 text-sm leading-6 text-zinc-600">
                {item.answer}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

