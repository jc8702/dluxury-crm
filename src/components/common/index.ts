// ─── DEPRECATED: Migrar para @/components/ui ───
// Este barrel existe apenas para compatibilidade retroativa.
// Novos componentes devem importar diretamente de '@/components/ui'.

// Compatível — re-exportado do novo Design System
export { Button } from '@/components/ui';
export { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui';
/** @deprecated Usar CardBody de '@/components/ui' */
export { CardBody as CardContent } from '@/components/ui';

// ✅ Migrado — re-exportado do novo Design System
export { Modal } from '@/components/ui';
export { Input } from '@/components/ui';
export { Badge } from '@/components/ui';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './Select';
export { ConfirmDialog } from './ConfirmDialog';

// Itens únicos — sem equivalente no DS novo
export { EmptyState } from './EmptyState';
export { Skeleton, TableSkeleton, CardSkeleton } from './Skeleton';
export { ErrorBoundary } from './ErrorBoundary';
export { default as DataTable } from './DataTable';
export { default as Breadcrumbs } from './Breadcrumbs';
export { default as ThemeToggle } from './ThemeToggle';
export { default as SearchableSelect } from './SearchableSelect';
export { default as Gauge } from './Gauge';
export { default as NotificationBell } from './NotificationBell';
export { default as StackedBarChart } from './StackedBarChart';
