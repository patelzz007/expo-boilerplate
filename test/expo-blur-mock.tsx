// The expo-blur boundary under Jest (jest.setup.ts mocks "expo-blur" with this module). The blur is a
// native view with no JavaScript implementation, so both views become plain React Native views: they
// keep their refs (Reanimated animates `intensity` through one), children, test ids and accessibility
// props. Nothing is blurred — Jest renders no pixels anyway.

import type { BlurViewProps } from "expo-blur";
import type { ReactElement, Ref } from "react";
import { View, type ViewInstance, type ViewProps } from "react-native";

export function BlurView({ ref, ...props }: BlurViewProps & { readonly ref?: Ref<ViewInstance> }): ReactElement {
  return <View ref={ref} {...props} />;
}

export function BlurTargetView({ ref, ...props }: ViewProps & { readonly ref?: Ref<ViewInstance> }): ReactElement {
  return <View ref={ref} {...props} />;
}
