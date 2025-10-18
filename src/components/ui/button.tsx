
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 relative overflow-hidden min-w-fit",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30 hover:scale-[1.02] active:scale-95",
        outline: "border border-border bg-background hover:bg-accent hover:border-border/80 hover:shadow-md hover:scale-[1.02] active:scale-95",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:shadow-md hover:scale-[1.02] active:scale-95",
        ghost: "hover:bg-accent hover:text-foreground text-muted-foreground rounded-lg",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-11 px-4 sm:px-6 py-3 min-w-fit [&_svg]:size-4",
        sm: "h-9 rounded-lg px-3 sm:px-4 text-xs min-w-fit [&_svg]:size-4",
        lg: "h-12 rounded-xl px-6 sm:px-8 text-base min-w-fit [&_svg]:size-5",
        icon: "h-10 w-10 rounded-lg [&_svg]:size-5",
        "icon-sm": "h-8 w-8 rounded-lg [&_svg]:size-4",
        "icon-lg": "h-11 w-11 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
