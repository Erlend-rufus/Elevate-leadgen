import { Link } from 'react-router';
import ArrowMotif from './ArrowMotif';
import { site } from '@/content/site';

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label={`${site.brand} home`}>
      <span className="font-display text-xl font-bold tracking-tight text-[#f4f5ff]">
        {site.shortBrand}
      </span>
      <ArrowMotif className="h-5 w-5" />
    </Link>
  );
}
