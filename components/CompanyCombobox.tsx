"use client";

interface CompanyComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Existing company names to show as suggestions */
  suggestions?: string[];
  optional?: boolean;
}

/**
 * A text input with a datalist of existing company names.
 * Lets the user pick from existing companies or type a new one.
 */
export default function CompanyCombobox({
  id,
  label,
  value,
  onChange,
  suggestions = [],
  optional = true,
}: CompanyComboboxProps) {
  const listId = `${id}-list`;
  const uniqueSuggestions = [...new Set(suggestions.filter(Boolean))];

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">
        {label}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      <input
        id={id}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Acme Ltd"
        className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
      />
      {uniqueSuggestions.length > 0 && (
        <datalist id={listId}>
          {uniqueSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </div>
  );
}
