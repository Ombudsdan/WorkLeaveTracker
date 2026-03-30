"use client";

export interface TabStripTab<T extends string = string> {
  id: T;
  label: string;
}

export interface TabStripProps<T extends string = string> {
  tabs: TabStripTab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  /** Extra Tailwind classes applied to the outer container. */
  className?: string;
}

/**
 * Horizontal tab header that highlights the active tab with an indigo underline.
 * Each tab button exposes `role="tab"` and `aria-selected` for accessibility.
 */
export default function TabStrip<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
}: TabStripProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex bg-white rounded-2xl shadow overflow-hidden border border-gray-200 ${className}`}
    >
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === id
              ? "border-indigo-600 text-indigo-700 bg-indigo-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
