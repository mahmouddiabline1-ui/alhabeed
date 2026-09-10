import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryArtwork } from "./CategoryArtwork";
import { CATEGORIES, type CategoryId } from "./catalog";

interface CategoryLibraryProps {
  selected: CategoryId[];
  onToggle: (category: CategoryId) => void;
  compact?: boolean;
  available?: CategoryId[];
}

const ALL_CATEGORIES = Object.keys(CATEGORIES) as CategoryId[];
export const DEFAULT_CATEGORY_IDS = ALL_CATEGORIES.slice(0, 12);

const SECTIONS = [
  { id: "essential", title: "أساسيات القعدة", subtitle: "الفئات الأصلية اللي تبدأ بيها أي قعدة", categories: ALL_CATEGORIES.slice(0, 12) },
  { id: "vip-one", title: "اختيارات VIP", subtitle: "ترفيه ومعلومات وتحديات متنوعة", categories: ALL_CATEGORIES.slice(12, 24) },
  { id: "vip-two", title: "مكتبة VIP الجديدة", subtitle: "12 عالم جديد للهبد والمنافسة", categories: ALL_CATEGORIES.slice(24, 36) },
] as const;

export function CategoryLibrary({ selected, onToggle, compact = false, available = ALL_CATEGORIES }: CategoryLibraryProps) {
  const [openSections, setOpenSections] = useState(() => new Set(compact ? [SECTIONS[0].id] : SECTIONS.map((section) => section.id)));
  const availableSet = new Set(available);

  return <div className={compact ? "category-library compact" : "category-library"}>
    {SECTIONS.map((section) => {
      const categories = section.categories.filter((category) => availableSet.has(category));
      if (!categories.length) return null;
      const isOpen = openSections.has(section.id);
      const selectedCount = categories.filter((category) => selected.includes(category)).length;
      return <section className="category-section" key={section.id}>
        <button type="button" className="category-section-toggle" aria-expanded={isOpen} onClick={() => setOpenSections((current) => {
          const next = new Set(current);
          isOpen ? next.delete(section.id) : next.add(section.id);
          return next;
        })}>
          <span><b>{section.title}</b><small>{section.subtitle}</small></span>
          <span className="section-toggle-meta">{selectedCount}/{categories.length}<ChevronDown size={21}/></span>
        </button>
        {isOpen && <div className="category-grid">
          {categories.map((category) => <button type="button" key={category} className={selected.includes(category) ? "category-card active" : "category-card"} onClick={() => onToggle(category)} aria-pressed={selected.includes(category)} aria-label={`${CATEGORIES[category].name} — ${selected.includes(category) ? "متضاف" : "ضيف"}`}>
            <CategoryArtwork category={category}/>
            {CATEGORIES[category].vip && <span className="vip-badge">VIP</span>}
            <em>{selected.includes(category) ? "✓ متضاف" : "+ ضيف"}</em>
          </button>)}
        </div>}
      </section>;
    })}
  </div>;
}
