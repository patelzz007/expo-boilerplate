import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { z } from "zod";

const skeletonPropsSchema = z.object({
  width: z.union([z.number().positive(), z.string()]),
  height: z.number().positive(),
  borderRadius: z.number().nonnegative().default(8),
  style: z.custom<StyleProp<ViewStyle>>().optional(),
});

type SkeletonProps = z.infer<typeof skeletonPropsSchema>;

export function Skeleton(rawProps: SkeletonProps) {
  const parsed = skeletonPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("Skeleton validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { width, height, borderRadius, style } = parsed.data;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          opacity,
          backgroundColor: "#e2e8f0",
        },
        style,
      ]}
    />
  );
}
