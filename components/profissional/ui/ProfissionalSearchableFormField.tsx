"use client";

import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";
import { useState } from "react";

type Props = {
  name: string;
  label: string;
  options: SearchableOption[];
  defaultValue?: string | null;
  placeholder?: string;
  emptyText?: string;
};

export default function ProfissionalSearchableFormField({
  name,
  label,
  options,
  defaultValue = "",
  placeholder,
  emptyText,
}: Props) {
  const [value, setValue] = useState(defaultValue || "");

  return (
    <div className="block text-sm font-medium text-zinc-700">
      <SearchableSelect
        label={label}
        placeholder={placeholder}
        emptyText={emptyText}
        options={options}
        value={value}
        onChange={setValue}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
