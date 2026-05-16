"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background/60 hover:bg-accent/60",
        /** Solid navy primary CTA */
        cta: "h-auto min-h-0 rounded-full border-0 bg-[#0f2347] px-8 py-3 text-base font-semibold text-white shadow-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:border-0 hover:bg-[#1a3a6b] hover:text-white hover:shadow-[0_0_20px_rgba(15,35,71,0.4)] active:scale-[1.03] disabled:hover:scale-100 disabled:hover:bg-[#0f2347] disabled:hover:shadow-none"
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base",
        sm: "h-9 px-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
