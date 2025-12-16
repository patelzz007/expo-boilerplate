import * as React from "react";
import { Pressable, type PressableProps, Platform } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { z, treeifyError } from "zod";
import { cn } from "./utils/cn";
import { TextClassContext } from "./utils/text-context";

/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 * Automatically adapts to iOS (TouchableOpacity behavior) and Android (Ripple effect).
 *
 * @example
 * ```tsx
 * // Default button
 * <Button onPress={handlePress}>
 *   <Text>Click me</Text>
 * </Button>
 *
 * // With variant
 * <Button variant="destructive" size="lg">
 *   <Text>Delete</Text>
 * </Button>
 *
 * // With icon
 * <Button variant="outline" size="icon">
 *   <SettingsIcon className="h-5 w-5" />
 * </Button>
 * ```
 */

const buttonPropsSchema = z.object({
  variant: z.enum(["default", "destructive", "outline", "secondary", "ghost", "link"]).default("default"),
  size: z.enum(["default", "sm", "lg", "icon"]).default("default"),
  disabled: z.boolean().optional(),
  children: z.custom<React.ReactNode>().optional(),
  onPress: z.custom<(event: any) => void>().optional(),
  textClass: z.string().optional(),
  className: z.string().optional(),
});

type ButtonProps = z.infer<typeof buttonPropsSchema> & Omit<PressableProps, keyof z.infer<typeof buttonPropsSchema>>;

const buttonVariants = cva(
  "group flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-input bg-background",
        secondary: "bg-secondary",
        ghost: "",
        link: "",
      },
      size: {
        default: "native:h-12 native:px-5 native:py-3 h-10 px-4 py-2",
        sm: "native:h-10 native:px-4 native:py-2 h-9 rounded-md px-3",
        lg: "native:h-14 native:px-8 native:py-4 h-11 rounded-md px-8",
        icon: "native:h-12 native:w-12 h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva("text-sm font-geistSemiBold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary",
    },
    size: {
      default: "",
      sm: "",
      lg: "native:text-base",
      icon: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (rawProps, ref) => {
    const parsed = buttonPropsSchema.safeParse(rawProps);
    if (!parsed.success) {
      console.warn("Button validation failed", treeifyError(parsed.error));
      return null;
    }
    const { className, textClass, variant = "default", size = "default", disabled, ...props } = parsed.data;
    // Platform-specific feedback
    const androidRipple = Platform.select({
      android: {
        android_ripple: {
          color: variant! === "destructive" ? "rgba(239, 68, 68, 0.3)" : "rgba(99, 102, 241, 0.3)",
          borderless: false,
        },
      },
      default: {},
    });

    return (
      <TextClassContext.Provider value={cn(buttonTextVariants({ variant: variant!, size: size! }), textClass)}>
        <Pressable
          className={cn(
            disabled && "opacity-50 web:pointer-events-none",
            buttonVariants({ variant: variant!, size: size!, className })
          )}
          ref={ref}
          role="button"
          {...androidRipple}
          style={({ pressed }) => [Platform.OS === "ios" && pressed && { opacity: 0.7 }]}
          {...props}
        />
      </TextClassContext.Provider>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, buttonTextVariants };
export type { ButtonProps };
