import { type CategoryId } from "./catalog";

export function CategoryArtwork({ category }: { category: CategoryId }) {
  return <img className="category-artwork" src={`${import.meta.env.BASE_URL}cards/${category}.svg?v=4`} alt="" />;
}
