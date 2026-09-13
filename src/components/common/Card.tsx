import { forwardRef } from 'react';
import {
  Card as UICard,
  CardHeader as UICardHeader,
  CardTitle as UICardTitle,
  CardDescription as UICardDescription,
  CardBody as UICardBody,
  CardFooter as UICardFooter,
} from '../ui/Card';
import type { CardProps as UICardProps } from '../ui/Card';

// Compat: common/Card variant mapping → ui/Card variant
const variantMap: Record<string, UICardProps['variant']> = {
  default: 'default',
  primary: 'accent',
  warning: 'default',
  danger: 'default',
};

export interface CardProps extends Omit<UICardProps, 'variant'> {
  variant?: 'default' | 'primary' | 'warning' | 'danger' | UICardProps['variant'];
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', ...props }, ref) => {
    const mapped = (variantMap[variant as string] ?? variant) as UICardProps['variant'];
    return <UICard ref={ref} variant={mapped} {...props} />;
  },
);
Card.displayName = 'Card';

export const CardHeader = UICardHeader;
export const CardTitle = UICardTitle;
export const CardDescription = UICardDescription;
export const CardContent = UICardBody; // compat: common usava CardContent
export const CardBody = UICardBody;
export const CardFooter = UICardFooter;
